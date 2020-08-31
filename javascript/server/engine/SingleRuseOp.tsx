import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { getFromAction, UIPosition, Button, isCancel } from "../../common/PlayerAction";
import { WuXieContext } from "../flows/WuXieOp";
import { HintType, CardSelectionResult } from "../../common/ServerHint";
import { CardPos } from "../../common/transit/CardPos";
import Card, { CardType } from "../../common/cards/Card";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import TakeCardOp from "../flows/TakeCardOp";
import { AskForSlashOp } from "../flows/SlashOp";
import { CardObtainedEvent, CardBeingDroppedEvent, findCard, gatherCards } from "../flows/Generic";
import { Suits } from "../../common/util/Util";
import DamageOp, { DamageType, DamageSource } from "../flows/DamageOp";
import { DropOthersCardRequest } from "../flows/DropCardOp";

export abstract class SingleRuse<T> extends Operation<T> {

    public abort = false

    public constructor(public readonly source: string, 
                        public readonly target: string, 
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

        manager.broadcast(new TextFlashEffect(this.source, [this.target], this.ruseType.name))

        let con = new WuXieContext(manager, this.ruseType)
        await con.init()
        if(await con.doOneRound(this.target)) {
            console.log('锦囊牌被无懈掉了了')
            return
        }

        await this.doPerform(manager)

    }

    public abstract async doPerform(manager: GameManager): Promise<T>

}


export class JueDou extends SingleRuse<void> {

    public targetLost: boolean
    public damage: number = 1

    public constructor(public readonly source: string, 
                        public readonly target: string, 
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

        let targetPlayer = manager.context.getPlayer(this.target)
        let me = manager.context.getPlayer(this.source)

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

    public constructor(public readonly source: string, 
                        public readonly target: string, 
                        public readonly cards: Card[]) {
        super(source, target, cards, CardType.SHUN_SHOU)
    }

    public async doPerform(manager: GameManager) {
        let targetPlayer = manager.context.getPlayer(this.target)

        let resp = await manager.sendHint(this.source, {
            hintType: HintType.UI_PANEL,
            hintMsg: '请选择对方一张牌',
            customRequest: {
                data: {
                    rowsOfCard: gatherCards(targetPlayer, [CardPos.JUDGE, CardPos.HAND, CardPos.EQUIP]),
                    title: `顺手牵羊 > ${this.target}`,
                    chooseSize: 1
                },
                mode: 'choose'
            }
        })
        console.log('顺手牵羊成功!', resp)
        let res = resp.customData as CardSelectionResult
        let cardAndPos = findCard(targetPlayer, res)[0]
        let card = cardAndPos[0], pos = cardAndPos[1]
        delete card.description
        delete card.as
        manager.transferCards(this.target, this.source, pos, CardPos.HAND, [card])
        await manager.events.publish(new CardBeingDroppedEvent(this.target, [[card, pos]]))
        await manager.events.publish(new CardObtainedEvent(this.source, [card]))
    }
}

export class GuoHe extends SingleRuse<void> {

    public constructor(public readonly source: string, 
        public readonly target: string, 
        public readonly cards: Card[]) {
    super(source, target, cards, CardType.GUO_HE)
    }

    public async doPerform(manager: GameManager) {
        await new DropOthersCardRequest().perform(manager, this.source, this.target, `过河拆桥 > ${this.target}`, [CardPos.JUDGE, CardPos.HAND, CardPos.EQUIP])
    }
}


export class WuZhong extends SingleRuse<void> {
    
    public constructor(public readonly source: string, 
        public readonly target: string, 
        public readonly cards: Card[]) {
        super(source, target, cards, CardType.WU_ZHONG)
    }

    public async doPerform(manager: GameManager) {
        console.log('无中生有成功!')
        await new TakeCardOp(manager.context.getPlayer(this.source), 2).perform(manager)
    }
}

export class JieDao extends SingleRuse<void> {


    public constructor(public readonly source: string, 
        public readonly actors: string[], 
        public readonly cards: Card[]) {
        super(source, actors[0], cards, CardType.JIE_DAO)
    }

    public async doPerform(manager: GameManager) {
        console.log('借刀杀人开始结算!')

        let from = manager.context.getPlayer(this.actors[0])
        let to = this.actors[1]
        let weapon = from.getCards(CardPos.EQUIP).find(c => c.type.genre === 'weapon')

        if(!weapon || this.actors.length !== 2) {
            console.error('借刀杀人指令不对', this.source, this.target)
            throw `Invalid!!`
        }

        let resp = await manager.sendHint(from.player.id, {
            hintType: HintType.PLAY_SLASH,
            hintMsg: `${this.source} 令你对 ${to} 出杀, 取消则放弃你的武器`,
            targetPlayers: [to],
            extraButtons: [new Button(Button.CANCEL.id, '放弃')]
        })

        if(isCancel(resp)) {
            console.log('玩家放弃出杀, 失去武器', this.source, from.player.id, to)
            manager.transferCards(from.player.id, to, CardPos.EQUIP, CardPos.HAND, [weapon])
            //event
            await manager.events.publish(new CardBeingDroppedEvent(from.player.id, [[weapon, CardPos.EQUIP]]))
            //event
            await manager.events.publish(new CardObtainedEvent(from.player.id, [weapon]))
        } else {
            console.log('玩家出杀, 开始结算吧')
            let targets = getFromAction(resp, UIPosition.PLAYER)
            resp.actionData[UIPosition.PLAYER] = [...targets, to]
            await manager.resolver.on(resp, manager)
            // await new PlaySlashOp(resp.actionSource, targetPs, slashCards).perform(manager)
        }
    }
}

export class HuoGong extends SingleRuse<void> {


    public constructor(public readonly source: string, 
        public readonly target: string, 
        public readonly cards: Card[]) {
        super(source, target, cards, CardType.HUO_GONG)
    }

    public async doPerform(manager: GameManager): Promise<void> {
        //先令对方亮一张牌
        let resp = await manager.sendHint(this.target, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg: `请选择火攻展示牌`,
            quantity: 1,
            positions: [UIPosition.MY_HAND]
        })

        let c = getFromAction(resp, UIPosition.MY_HAND)[0]
        let card = manager.getCard(c)
        let suit = manager.interpret(this.target, c).suit
        card.description = `${this.target} 火攻展示牌`

        console.log(`${this.target} 为火攻展示手牌 ${c}`)
        manager.sendToWorkflow(this.target, CardPos.HAND, [card], false, true)

        //火攻出牌
        let resp2 = await manager.sendHint(this.source, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg: `请打出一张花色为[${Suits[suit]}]的手牌`,
            quantity: 1,
            positions: [UIPosition.MY_HAND],
            extraButtons: [Button.CANCEL],
            suits: [suit]
        })

        if(!isCancel(resp2)) {
            let fireCard = getFromAction(resp2, UIPosition.MY_HAND)[0]
            console.log(`${this.source} 为火攻出了 ${fireCard}`)
            let fireCardo = manager.getCard(fireCard)
            fireCardo.description = `${this.source} 火攻使用牌`
            manager.sendToWorkflow(this.source, CardPos.HAND, [fireCardo])

            await manager.events.publish(new CardBeingDroppedEvent(this.source, [[fireCardo, CardPos.HAND]]))

            await new DamageOp(manager.context.getPlayer(this.source),
                                manager.context.getPlayer(this.target),
                                1, this.cards, DamageSource.HUO_GONG, DamageType.FIRE).perform(manager)
        } else {
            console.log(`${this.source} 放弃了火攻`)
        }
    }
}