import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerAction, getFromAction, UIPosition } from "../../common/PlayerAction";
import { WuXieContext } from "../flows/WuXieOp";
import { PlayerInfo } from "../../common/PlayerInfo";
import Card, { CardType } from "../../common/cards/Card";
import { TextFlashEffect, CardTransit } from "../../common/transit/EffectTransit";
import TakeCardOp from "../flows/TakeCardOp";
import DamageOp, { DamageType, DamageSource } from "../flows/DamageOp";
import { AskForSlashOp } from "../flows/SlashOp";
import DodgeOp from "../flows/DodgeOp";
import { CustomUIData } from "../../client/card-panel/CustomUIRegistry";
import { flattenMap } from "../../common/util/Util";
import { HintType } from "../../common/ServerHint";
import { CardPos } from "../../common/transit/CardPos";
import { CardObtainedEvent } from "../flows/Generic";
import HealOp from "../flows/HealOp";


export abstract class MultiRuse extends Operation<void> {

    public skipThisRound = true

    public constructor(public readonly cards: Card[],
                        public source: string, //祸首可能改变source
                        public readonly ruseType: CardType,
                        public readonly targets: PlayerInfo[]) {
        super()
        console.log('[MultiRuseOp] 多目标锦囊牌', ruseType.name, targets.map(t => t.player.id))
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
                console.log(`[MultiRuseOp] ${this.ruseType.name} 跳过对 ${t.player.id} 的结算`)
                continue //帷幕, 祸首, 等等
            }

            if(await context.doOneRound(t.player.id)) {
                console.log(`[MultiRuseOp] 针对${t.player.id}的锦囊牌被无懈掉了了`)
                continue
            }
            console.log(`[MultiRuseOp] ${this.ruseType.name} 开始对 ${t.player.id} 的结算`)
            await this.doPerform(t, manager)
        }
        await this.onDone(manager)
    }

    public async init(manager: GameManager) {
        //no-op by default
    }

    public async onDone(manager: GameManager) {

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
            console.log('[MultiRuseOp] 重铸了')
            await new TakeCardOp(manager.context.getPlayer(this.source), 1).perform(manager)
        } else {
            console.log('[MultiRuseOp] 铁索了', this.targets)
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
            console.log(`[MultiRuseOp] ${target.player.id} 放弃南蛮出杀, 掉血`)
            await new DamageOp(issuer, target, 1, this.cards, DamageSource.NAN_MAN, DamageType.NORMAL).perform(manager)
        } else {
            //过了, 出了杀就成
        }
    }
    
}

export class WanJian extends MultiRuse {

    public async doPerform(target: PlayerInfo, manager: GameManager): Promise<void> {
        let dodged = await new DodgeOp(target, this.source, 1, `${this.source} 的万箭齐发, 请出闪`).perform(manager)
        if(!dodged) {
            console.log(`[MultiRuseOp] ${target.player.id} 放弃万箭出闪, 掉血`)
            await new DamageOp(manager.context.getPlayer(this.source), target, 1, this.cards, DamageSource.WAN_JIAN, DamageType.NORMAL).perform(manager)
        } else {
            //过了, 出了杀就成
        }
    }

}

export class TaoYuan extends MultiRuse {

    public async doPerform(target: PlayerInfo, manager: GameManager): Promise<void> {
        console.log('[MultiRuseOp] ',  target.player.id, '桃园加血~')
        await new HealOp(manager.context.getPlayer(this.source), target, 1).perform(manager)
    }

}

export class WuGu extends MultiRuse {

    wuguCards = new Map<string, Card>()

    public async init(manager: GameManager) {
        manager.context.deck.getCardsFromTop(this.targets.length).forEach(c => {
            this.wuguCards.set(c.id, c)
        })
        this.broadCastCurrent(`五谷丰登`, manager)
    }

    public async onDone(manager: GameManager) {
        manager.rescindAll()
        manager.broadcast(new CustomUIData(CustomUIData.STOP, null))
        manager.onReconnect = null
        //drop unclaimed cards
        this.wuguCards.forEach(c => {
            if(!c.description) {
                console.log('[MultiRuseOp] 弃置五谷没人要的卡牌: ', c.id)
                c.description = '五谷丰登弃置'
                manager.broadcast(CardTransit.deckToWorkflow([c]))
                manager.context.workflowCards.add(c)
            }
        })
    }

    public async doPerform(target: PlayerInfo, manager: GameManager): Promise<void> {
        let targetId = target.player.id
        this.broadCastCurrent(`等待 ${targetId} 选牌`, manager)
        let resp = await manager.sendHint(target.player.id, {
            hintType: HintType.UI_PANEL,
            hintMsg: 'ignore',
            customRequest: {
                mode: 'choose',
                data: true
            }
        })
        console.log('[MultiRuseOp]',  targetId, '选走了', resp.customData)
        //add cards from deck to player
        let card = manager.getCard(resp.customData as string)

        target.addCard(card, CardPos.HAND)
        //animation of card transfer. need to sanitize
        manager.broadcast(CardTransit.fromDeck(targetId, [card]))
        //event
        await manager.events.publish(new CardObtainedEvent(targetId, [card]))

        this.wuguCards.get(card.id).description = target.player.id + ' 选走'
        this.broadCastCurrent(`${targetId} 选牌完毕`, manager)
    }

    private broadCastCurrent(title: string, manager: GameManager) {
        manager.onReconnect = () => {
            manager.broadcast(new CustomUIData('wugu', {
                title,
                cards: flattenMap(this.wuguCards).map(kv => kv[1])
            }))
        }
        manager.onReconnect()
    }

}