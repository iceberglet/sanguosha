import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { UIPosition, Button } from "../../common/PlayerAction";
import { WuXieContext } from "./WuXieOp";
import { HintType, CardSelectionResult } from "../../common/ServerHint";
import { CardPos } from "../../common/transit/CardPos";
import Card, { CardType } from "../../common/cards/Card";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import TakeCardOp from "./TakeCardOp";
import { AskForSlashOp } from "./SlashOp";
import { CardBeingDroppedEvent, findCard, gatherCards } from "./Generic";
import { Suits } from "../../common/util/Util";
import DamageOp, { DamageType, DamageSource } from "./DamageOp";
import { DropOthersCardRequest } from "./DropCardOp";
import { PlayerInfo } from "../../common/PlayerInfo";

export abstract class SingleRuse<T> extends Operation<T> {

    public abort = false

    public constructor(public readonly source: PlayerInfo, 
                        public readonly target: PlayerInfo, 
                        public readonly cards: Card[],
                        public readonly ruseType: CardType) {
        super()
    }

    public async perform(manager: GameManager): Promise<T> {

        await manager.events.publish(this)

        if(this.abort) {
            console.log('锦囊牌被取消了')
            return
        }

        this.doTextEffect(manager)

        let con = new WuXieContext(manager, this.ruseType)
        await con.init()
        if(await con.doOneRound(this.target)) {
            console.log('锦囊牌被无懈掉了了')
            return
        }

        await this.doPerform(manager)
    }

    protected doTextEffect(manager: GameManager) {
        manager.broadcast(new TextFlashEffect(this.source.player.id, [this.target.player.id], this.ruseType.name))
    }

    public abstract async doPerform(manager: GameManager): Promise<T>

}


export class JueDou extends SingleRuse<void> {

    public targetLost: boolean
    public damage: number = 1

    public constructor(public readonly source: PlayerInfo, 
                        public readonly target: PlayerInfo, 
                        public readonly cards: Card[]
    ) {
        super(source, target, cards, CardType.JUE_DOU)
        this.targetLost = true
    }

    /**
     * Call this directly if you don't wanna go for WU_XIE or any abort
     * c.f. 貂蝉.离间
     * @param manager 
     */
    public async doPerform(manager: GameManager) {

        let targetPlayer = this.target
        let me = this.source

        while(true) {
            let curr = this.targetLost? targetPlayer : me
            let issuer = this.targetLost? me: targetPlayer
            let slashed = await new AskForSlashOp(curr, issuer, `${issuer.player.id}和你决斗, 请出杀`).perform(manager)
            if(!slashed) {
                console.log('玩家决斗放弃出杀, 掉血')
                await manager.events.publish(this)
                await new DamageOp(issuer, curr, this.damage, this.cards, DamageSource.DUEL, DamageType.NORMAL).perform(manager)
                break
            } else {
                console.log('又出了一个杀')
                //吕布无双咋办???
                this.targetLost = !this.targetLost
            }
        }
        
    }
}

export class ShunShou extends SingleRuse<void> {

    public constructor(public readonly source: PlayerInfo, 
                        public readonly target: PlayerInfo, 
                        public readonly cards: Card[]) {
        super(source, target, cards, CardType.SHUN_SHOU)
    }

    public async doPerform(manager: GameManager) {
        let targetPlayer = this.target

        let candidates = gatherCards(targetPlayer, [CardPos.JUDGE, CardPos.HAND, CardPos.EQUIP])
        if(!candidates) {
            console.error('[顺手] 无法进行顺手结算, 此玩家没有牌可以拿')
            return
        }
        
        let resp = await manager.sendHint(this.source.player.id, {
            hintType: HintType.UI_PANEL,
            hintMsg: '请选择对方一张牌',
            customRequest: {
                data: {
                    rowsOfCard: candidates,
                    title: `顺手牵羊 > ${this.target}`,
                    chooseSize: 1
                },
                mode: 'choose'
            }
        })
        console.log('[顺手] 顺手牵羊成功!', this.source.player.id)
        let res = resp.customData as CardSelectionResult
        let cardAndPos = findCard(targetPlayer, res)[0]
        let card = cardAndPos[0], pos = cardAndPos[1]
        manager.log(`${this.source} 获得了 ${this.target} 的 ${pos === CardPos.HAND? '一张手牌' : card}`)
        delete card.description
        delete card.as
        await manager.transferCards(this.target.player.id, this.source.player.id, pos, CardPos.HAND, [card])
    }
}

export class GuoHe extends SingleRuse<void> {

    public constructor(public readonly source: PlayerInfo, 
        public readonly target: PlayerInfo, 
        public readonly cards: Card[]) {
    super(source, target, cards, CardType.GUO_HE)
    }

    public async doPerform(manager: GameManager) {
        await new DropOthersCardRequest().perform(manager, this.source, this.target, `过河拆桥 > ${this.target}`, [CardPos.JUDGE, CardPos.HAND, CardPos.EQUIP])
    }
}


export class WuZhong extends SingleRuse<void> {
    
    public constructor(public readonly source: PlayerInfo, 
        public readonly target: PlayerInfo, 
        public readonly cards: Card[]) {
        super(source, target, cards, CardType.WU_ZHONG)
    }

    public async doPerform(manager: GameManager) {
        console.log('无中生有成功!')
        await new TakeCardOp(this.source, 2).perform(manager)
    }
}

export class JieDao extends SingleRuse<void> {


    public constructor(public readonly source: PlayerInfo, 
        public readonly actors: PlayerInfo[], 
        public readonly cards: Card[]) {
        super(source, actors[0], cards, CardType.JIE_DAO)
    }

    protected doTextEffect(manager: GameManager) {
        manager.broadcast(new TextFlashEffect(this.source.player.id, [this.actors[0].player.id], this.ruseType.name, this.actors[1].player.id))
    }

    public async doPerform(manager: GameManager) {
        console.log('借刀杀人开始结算!')

        let from = this.actors[0]
        let to = this.actors[1]
        let weapon = from.getCards(CardPos.EQUIP).find(c => c.type.genre === 'weapon')

        if(this.actors.length !== 2) {
            console.error('借刀杀人指令不对', this.source, this.target, this.actors)
            throw `Invalid!!`
        }
        if(!weapon) {
            console.error('[借刀] 无法执行, 对象没有刀了!')
            return
        }

        let resp = await manager.sendHint(from.player.id, {
            hintType: HintType.PLAY_SLASH,
            hintMsg: `${this.source} 令你对 ${to.player.id} 出杀, 取消则放弃你的武器`,
            targetPlayers: [to.player.id],
            extraButtons: [new Button(Button.CANCEL.id, '放弃')]
        })

        if(resp.isCancel()) {
            console.log('玩家放弃出杀, 失去武器', this.source.player.id, from.player.id, to)
            await manager.transferCards(from.player.id, this.source.player.id, CardPos.EQUIP, CardPos.HAND, [weapon])
        } else {
            console.log('玩家出杀, 开始结算吧')
            resp.targets.push(to)
            await manager.resolver.on(resp, manager)
            // await new PlaySlashOp(resp.actionSource, targetPs, slashCards).perform(manager)
        }
    }
}

export class HuoGong extends SingleRuse<void> {


    public constructor(public readonly source: PlayerInfo, 
        public readonly target: PlayerInfo, 
        public readonly cards: Card[]) {
        super(source, target, cards, CardType.HUO_GONG)
    }

    public async doPerform(manager: GameManager): Promise<void> {
        if(this.target.getCards(CardPos.HAND).length === 0) {
            console.error('[火攻] 玩家没有手牌, 无法火攻!! (最后手牌是无懈?)', this.target)
            return
        }

        //先令对方亮一张牌
        let resp = await manager.sendHint(this.target.player.id, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg: `请选择火攻展示牌`,
            quantity: 1,
            positions: [UIPosition.MY_HAND]
        })

        let card = resp.getSingleCardAndPos()[0]
        let suit = this.target.cardInterpreter(card).suit
        card.description = `${this.target} 火攻展示牌`

        console.log(`${this.target} 为火攻展示手牌 ${card.id}`)
        manager.sendToWorkflow(this.target.player.id, CardPos.HAND, [card], false, true)

        //火攻出牌
        let resp2 = await manager.sendHint(this.source.player.id, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg: `请打出一张花色为[${Suits[suit]}]的手牌`,
            quantity: 1,
            positions: [UIPosition.MY_HAND],
            extraButtons: [Button.CANCEL],
            suits: [suit]
        })

        if(!resp2.isCancel()) {
            let fireCard = resp2.getSingleCardAndPos()[0]
            console.log(`${this.source} 为火攻出了 ${fireCard.id}`)
            fireCard.description = `${this.source} 火攻使用牌`
            manager.sendToWorkflow(this.source.player.id, CardPos.HAND, [fireCard])

            await manager.events.publish(new CardBeingDroppedEvent(this.source.player.id, [[fireCard, CardPos.HAND]]))

            await new DamageOp(this.source, this.target,
                                1, this.cards, DamageSource.HUO_GONG, DamageType.FIRE).perform(manager)
        } else {
            console.log(`${this.source} 放弃了火攻`)
        }
    }
}