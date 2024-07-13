import { UseEventOperation, Operation } from "../Operation";
import GameManager from "../GameManager";
import { WuXieContext } from "./WuXieOp";
import { PlayerInfo } from "../../common/PlayerInfo";
import {Card,  CardType } from "../../common/cards/Card";
import { TextFlashEffect, CardTransit, PlaySound } from "../../common/transit/EffectTransit";
import TakeCardOp from "./TakeCardOp";
import DamageOp, { DamageType, DamageSource } from "./DamageOp";
import { AskForSlashOp } from "./SlashOp";
import DodgeOp from "./DodgeOp";
import { CustomUIData, WuguUIData } from "../../client/card-panel/CustomUIRegistry";
import { flattenMap } from "../../common/util/Util";
import { HintType } from "../../common/ServerHint";
import { CardPos } from "../../common/transit/CardPos";
import { CardObtainedEvent } from "./Generic";
import HealOp from "./HealOp";
import { BlockedEquipment } from "./Equipments";


export abstract class MultiRuse extends UseEventOperation<void> {

    public skipThisRound = true

    public constructor(public readonly cards: Card[],
                        public readonly source: PlayerInfo,
                        public readonly ruseType: CardType,
                        readonly targets: PlayerInfo[]) {
        super(targets, ruseType.name)
        console.log('[MultiRuseOp] 多目标锦囊牌', ruseType.name, targets.map(t => t.player.id))
    }

    public async doPerform(manager: GameManager): Promise<void> {

        await this.init(manager)

        let ts = this.targets.map(t => t.player.id)
        manager.broadcast(new TextFlashEffect(this.source.player.id, ts, this.ruseType.name))
        await manager.events.publish(this)

        let context = new WuXieContext(manager, this.ruseType)
        await context.init()
        for(let t of this.targets) {
            if(t.isDead) {
                continue
            }

            if(await this.beforeWuXie(manager, t)) {
                if(await context.doOneRound(t)) {
                    console.log(`[MultiRuseOp] 针对${t.player.id}的锦囊牌被无懈掉了了`)
                    continue
                }
                console.log(`[MultiRuseOp] ${this.ruseType.name} 开始对 ${t.player.id} 的结算`)
                await this.doForOne(t, manager)
            }
        }
        await this.onDone(manager)
    }

    public async init(manager: GameManager) {
        //no-op by default
    }

    public async onDone(manager: GameManager) {
        //no-op by default
    }

    /**
     * invoked before asking for Wu Xie
     * return whether to continue counting effect or not
     * e.g. 桃园结义对满血玩家无效也不可无懈可击
     * @param manager 
     * @param effectBearer 
     */
    public async beforeWuXie(manager: GameManager, effectBearer: PlayerInfo): Promise<boolean> {
        //return true by default
        return true
    }

    public abstract doForOne(target: PlayerInfo, manager: GameManager): Promise<void>;

}

export class TieSuo extends Operation<void> {
    public constructor(public source: PlayerInfo, public targets: PlayerInfo[], public readonly isChongZhu: boolean, public cards: Card[]) {
        super()
    }
    public async perform(manager: GameManager): Promise<void> {
        if(!this.targets || this.targets.length === 0 || this.isChongZhu) {
            //重铸了
            console.log('[MultiRuseOp] 重铸了')
            await new TakeCardOp(this.source, 1).perform(manager)
        } else {
            console.log('[MultiRuseOp] 铁索了', this.targets.map(t => t.player.id))
            await new DoTieSuo(this.cards, this.source, CardType.TIE_SUO, this.targets).perform(manager)
        }
    }
}

export class DoTieSuo extends MultiRuse {

    public async doForOne(target: PlayerInfo, manager: GameManager): Promise<void> {
        target.isChained = !target.isChained
        manager.broadcast(new PlaySound(`audio/card/common/chain.ogg`))
        manager.broadcast(target, PlayerInfo.sanitize)
    }

}

export class NanMan extends MultiRuse {

    //祸首可能改变source
    public damageDealer: PlayerInfo
    
    public constructor(cards: Card[], source: PlayerInfo, ruseType: CardType, targets: PlayerInfo[]) {
        super(cards, source, ruseType, targets)
        this.damageDealer = source
    }

    async beforeWuXie(manager: GameManager, info: PlayerInfo) {
        //对藤甲无效
        if(!info.getCards(CardPos.EQUIP).find(c => c.type === CardType.TENG_JIA)) {
            return true
        }

        if(BlockedEquipment.isBlocked(info.player.id)) {
            console.warn('[装备] 被无视, 无法发动')
            return true
        }
        
        console.log(`[装备] 藤甲将 ${info} 移出万箭/南蛮的影响对象`)
        manager.log(`${info} 的藤甲触发`)
        manager.broadcast(new PlaySound(`audio/equip/teng_jia_good.ogg`))
        manager.broadcast(new TextFlashEffect(info.player.id, [], '藤甲_好'))
        this.removeTarget(info.player.id)
        return false
    }
    
    public async doForOne(target: PlayerInfo, manager: GameManager): Promise<void> {
        let issuer = this.source
        let slashed = await new AskForSlashOp(target, issuer, `${this.source} 使用南蛮, 请出杀`).perform(manager)
        if(!slashed) {
            console.log(`[MultiRuseOp] ${target.player.id} 放弃南蛮出杀, 掉血`)
            await new DamageOp(this.damageDealer, target, 1, this.cards, DamageSource.NAN_MAN, DamageType.NORMAL).perform(manager)
        } else {
            //过了, 出了杀就成
        }
    }
    
}

export class WanJianDodgedEvent {
    constructor(wanjian: WanJian, dodgeOp: DodgeOp) {}
}

export class WanJian extends MultiRuse {

    async beforeWuXie(manager: GameManager, info: PlayerInfo) {
        //对藤甲无效
        if(!info.getCards(CardPos.EQUIP).find(c => c.type === CardType.TENG_JIA)) {
            return true
        }

        if(BlockedEquipment.isBlocked(info.player.id)) {
            console.warn('[装备] 被无视, 无法发动')
            return true
        }
        
        console.log(`[装备] 藤甲将 ${info} 移出万箭/南蛮的影响对象`)
        manager.log(`${info} 的藤甲触发`)
        manager.broadcast(new PlaySound(`audio/equip/teng_jia_good.ogg`))
        manager.broadcast(new TextFlashEffect(info.player.id, [], '藤甲_好'))
        this.removeTarget(info.player.id)
        return false
    }

    public async doForOne(target: PlayerInfo, manager: GameManager): Promise<void> {
        let dodgeOp = new DodgeOp(target, this.source, 1, `${this.source} 的万箭齐发, 请出闪`)
        let dodged = await dodgeOp.perform(manager)
        if(!dodged) {
            console.log(`[MultiRuseOp] ${target.player.id} 放弃万箭出闪, 掉血`)
            await new DamageOp(this.source, target, 1, this.cards, DamageSource.WAN_JIAN, DamageType.NORMAL).perform(manager)
        } else {
            //过了, 出了杀就成
            await manager.events.publish(new WanJianDodgedEvent(this, dodgeOp))
        }
    }

}

export class TaoYuan extends MultiRuse {

    async beforeWuXie(manager: GameManager, info: PlayerInfo) {
        //对满血的人无效
        return info.hp < info.maxHp
    }

    public async doForOne(target: PlayerInfo, manager: GameManager): Promise<void> {
        console.log('[MultiRuseOp] ',  target.player.id, '桃园加血~')
        await new HealOp(this.source, target, 1).perform(manager)
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

    public async doForOne(target: PlayerInfo, manager: GameManager): Promise<void> {
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
        await manager.events.publish(new CardObtainedEvent(targetId, [[card, CardPos.HAND]]))

        this.wuguCards.get(card.id).description = target.player.id + ' 选走'
    }

    async beforeWuXie(manager: GameManager, info: PlayerInfo) {
        this.broadCastCurrent(`${info.player.id} 即将选牌`, manager)
        return true
    }

    private broadCastCurrent(title: string, manager: GameManager) {
        manager.onReconnect = () => {
            manager.broadcast(new CustomUIData<WuguUIData>('wugu', {
                title,
                cards: flattenMap(this.wuguCards).map(kv => kv[1])
            }))
        }
        manager.onReconnect()
    }

}