import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerAction, getFromAction, UIPosition } from "../../common/PlayerAction";
import { WuXieContext } from "../flows/WuXieOp";
import { PlayerInfo } from "../../common/PlayerInfo";
import { CardType } from "../../common/cards/Card";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import TakeCardOp from "../flows/TakeCardOp";
import DamageOp, { DamageType } from "../flows/DamageOp";
import { SlashOp } from "../flows/SlashOp";
import DodgeOp from "../flows/DodgeOp";


export abstract class MultiRuse extends Operation<void> {

    public constructor(public readonly ruseAction: PlayerAction, 
                        public readonly ruseType: CardType,
                        public readonly targets: PlayerInfo[]) {
        super()
        console.log('多目标锦囊牌', ruseType.name, targets.map(t => t.player.id))
    }

    public async perform(manager: GameManager): Promise<void> {

        await this.init(manager)

        let ts = this.targets.map(t => t.player.id)
        manager.broadcast(new TextFlashEffect(this.ruseAction.actionSource, ts, this.ruseType.name))
        await manager.events.publish(this)

        let context = new WuXieContext(manager, this.ruseAction, this.ruseType)
        await context.init()
        for(let t of this.targets) {
            if(await context.doOneRound(t.player.id)) {
                console.log(`针对${t.player.id}的锦囊牌被无懈掉了了`)
                continue
            }
            await this.doPerform(t, manager)
        }

    }

    public async init(manager: GameManager) {
        //no-op by default
    }

    public abstract async doPerform(target: PlayerInfo, manager: GameManager): Promise<void>;

}

export class TieSuo extends Operation<void> {
    public constructor(public action: PlayerAction) {
        super()
    }
    public async perform(manager: GameManager): Promise<void> {
        let targets = getFromAction(this.action, UIPosition.PLAYER)
        if(targets.length === 0) {
            //重铸了
            console.log('重铸了')
            await new TakeCardOp(manager.context.getPlayer(this.action.actionSource), 1).perform(manager)
        } else {
            console.log('铁索了', targets)
            await new DoTieSuo(this.action, CardType.TIE_SUO, targets.map(manager.context.getPlayer)).perform(manager)
        }
    }
}

export class DoTieSuo extends MultiRuse {

    public constructor(ruseAction: PlayerAction, ruseType: CardType, targets: PlayerInfo[]) {
        super(ruseAction, ruseType, targets)
    } 

    public async doPerform(target: PlayerInfo, manager: GameManager): Promise<void> {
        target.isChained = !target.isChained
        manager.broadcast(target, PlayerInfo.sanitize)
    }

}

export class NanMan extends MultiRuse {

    public damageSource: string

    public constructor(ruseAction: PlayerAction, targets: PlayerInfo[]) {
        super(ruseAction, CardType.NAN_MAN, targets)
        this.damageSource = ruseAction.actionSource
    } 

    public async doPerform(target: PlayerInfo, manager: GameManager): Promise<void> {
        let issuer = manager.context.getPlayer(this.ruseAction.actionSource)
        let slashed = await new SlashOp(target, issuer, `${this.ruseAction.actionSource} 使用南蛮, 请出杀`).perform(manager)
        if(!slashed) {
            console.log('玩家放弃南蛮出杀, 掉血')
            await new DamageOp(manager.context.getPlayer(this.damageSource), target, 1, this.ruseAction, DamageType.NORMAL).perform(manager)
        } else {
            //过了, 出了杀就成
        }
    }
    
}

export class WanJian extends MultiRuse {

    public constructor(ruseAction: PlayerAction, targets: PlayerInfo[]) {
        super(ruseAction, CardType.WAN_JIAN, targets)
    } 

    public async doPerform(target: PlayerInfo, manager: GameManager): Promise<void> {
        let dodged = await new DodgeOp(target, this.ruseAction, 1, `${this.ruseAction.actionSource} 的万箭齐发, 请出闪`).perform(manager)
        if(!dodged) {
            console.log('玩家放弃万箭出杀, 掉血')
            await new DamageOp(manager.context.getPlayer(this.ruseAction.actionSource), target, 1, this.ruseAction, DamageType.NORMAL).perform(manager)
        } else {
            //过了, 出了杀就成
        }
    }

}


export class WuGu extends MultiRuse {

    public constructor(ruseAction: PlayerAction, targets: PlayerInfo[]) {
        super(ruseAction, CardType.WAN_JIAN, targets)
    } 

    public async init(manager: GameManager) {

    }

    public async doPerform(target: PlayerInfo, manager: GameManager): Promise<void> {
        //todo: show UI!
    }

}