import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerAction, getFromAction, UIPosition } from "../../common/PlayerAction";
import { WuXieContext } from "../flows/WuXieOp";
import { PlayerInfo } from "../../common/PlayerInfo";
import Card, { CardType } from "../../common/cards/Card";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import TakeCardOp from "../flows/TakeCardOp";
import DamageOp, { DamageType } from "../flows/DamageOp";
import { AskForSlashOp } from "../flows/SlashOp";
import DodgeOp from "../flows/DodgeOp";


export abstract class MultiRuse extends Operation<void> {

    public skipThisRound = true

    public constructor(public readonly cards: Card[],
                        public source: string, //祸首可能改变source
                        public readonly ruseType: CardType,
                        public readonly targets: PlayerInfo[]) {
        super()
        console.log('多目标锦囊牌', ruseType.name, targets.map(t => t.player.id))
    }

    public async perform(manager: GameManager): Promise<void> {

        await this.init(manager)

        let ts = this.targets.map(t => t.player.id)
        manager.broadcast(new TextFlashEffect(this.source, ts, this.ruseType.name))
        await manager.events.publish(this)

        let context = new WuXieContext(manager, this.ruseType)
        await context.init()
        for(let t of this.targets) {
            if(t.isDead) {
                continue
            }

            this.skipThisRound = false
            await manager.events.publish(this)
            if(this.skipThisRound) {
                console.log(`${this.ruseType} 跳过对 ${t} 的结算`)
                continue //帷幕, 祸首, 等等
            }

            if(await context.doOneRound(t.player.id)) {
                console.log(`针对${t.player.id}的锦囊牌被无懈掉了了`)
                continue
            }
            console.log(`${this.ruseType} 开始对 ${t} 的结算`)
            await this.doPerform(t, manager)
        }

    }

    public async init(manager: GameManager) {
        //no-op by default
    }

    public abstract async doPerform(target: PlayerInfo, manager: GameManager): Promise<void>;

}

export class TieSuo extends Operation<void> {
    public constructor(public source: string, public targets: string[], public cards: Card[]) {
        super()
    }
    public async perform(manager: GameManager): Promise<void> {
        if(!this.targets || this.targets.length === 0) {
            //重铸了
            console.log('重铸了')
            await new TakeCardOp(manager.context.getPlayer(this.source), 1).perform(manager)
        } else {
            console.log('铁索了', this.targets)
            await new DoTieSuo(this.cards, this.source, CardType.TIE_SUO, this.targets.map(manager.context.getPlayer)).perform(manager)
        }
    }
}

export class DoTieSuo extends MultiRuse {

    public async doPerform(target: PlayerInfo, manager: GameManager): Promise<void> {
        target.isChained = !target.isChained
        manager.broadcast(target, PlayerInfo.sanitize)
    }

}

export class NanMan extends MultiRuse {

    public async doPerform(target: PlayerInfo, manager: GameManager): Promise<void> {
        let issuer = manager.context.getPlayer(this.source)
        let slashed = await new AskForSlashOp(target, issuer, `${this.source} 使用南蛮, 请出杀`).perform(manager)
        if(!slashed) {
            console.log('玩家放弃南蛮出杀, 掉血')
            await new DamageOp(issuer, target, 1, this.cards, DamageType.NORMAL).perform(manager)
        } else {
            //过了, 出了杀就成
        }
    }
    
}

export class WanJian extends MultiRuse {

    public async doPerform(target: PlayerInfo, manager: GameManager): Promise<void> {
        let dodged = await new DodgeOp(target, this.source, 1, `${this.source} 的万箭齐发, 请出闪`).perform(manager)
        if(!dodged) {
            console.log('玩家放弃万箭出杀, 掉血')
            await new DamageOp(manager.context.getPlayer(this.source), target, 1, this.cards, DamageType.NORMAL).perform(manager)
        } else {
            //过了, 出了杀就成
        }
    }

}


export class WuGu extends MultiRuse {

    public async init(manager: GameManager) {

    }

    public async doPerform(target: PlayerInfo, manager: GameManager): Promise<void> {
        //todo: show UI!
    }

}