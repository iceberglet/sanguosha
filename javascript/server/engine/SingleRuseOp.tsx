import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { getFromAction, PlayerAction, UIPosition, Button, isCancel } from "../../common/PlayerAction";
import { WuXieContext } from "../flows/WuXieOp";
import { HintType, CardSelectionResult } from "../../common/ServerHint";
import { PlayerInfo } from "../../common/PlayerInfo";
import { CardPos, isCardPosHidden } from "../../common/transit/CardPos";
import Card, { CardType } from "../../common/cards/Card";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import TakeCardOp from "../flows/TakeCardOp";
import PlaySlashOp from "../flows/SlashOp";

export abstract class SingleRuse<T> extends Operation<T> {

    public abort = false
    public readonly target: string

    public constructor(public readonly ruseAction: PlayerAction, public readonly ruseType: CardType) {
        super()
        this.target = getFromAction(this.ruseAction, UIPosition.PLAYER)[0]
    }

    public async perform(manager: GameManager): Promise<T> {

        await manager.beforeFlowHappen.publish(this)

        if(this.abort) {
            console.log('锦囊牌被取消了')
            return
        }

        manager.broadcast(new TextFlashEffect(this.ruseAction.actionSource, [this.target], this.ruseType.name))

        let con = new WuXieContext(manager, this.ruseAction, this.ruseType)
        await con.init()
        if(await con.doOneRound(this.target)) {
            console.log('锦囊牌被无懈掉了了')
            return
        }

        await this.doPerform(manager)

        await manager.afterFlowDone.publish(this)
    }

    public abstract async doPerform(manager: GameManager): Promise<T>

}

const cardPosNames = new Map<string, CardPos>([
    ['手牌', CardPos.HAND],
    ['装备区', CardPos.EQUIP],
    ['判定区', CardPos.JUDGE],
])

function gatherCards(info: PlayerInfo): {[key: string]: Array<Card>} {
    let res: {[key: string]: Array<Card>} = {}
    for(let n of cardPosNames.keys()) {
        let pos = cardPosNames.get(n)
        let cards = info.getCards(pos)
        if(cards.length === 0) {
            continue
        }
        if(isCardPosHidden(pos)) {
            res[n] = cards.map(c => Card.DUMMY)
        } else {
            res[n] = cards
        }
    }
    return res
}

function findCard(info: PlayerInfo, res: CardSelectionResult): Card {
    return info.getCards(cardPosNames.get(res.rowName))[res.idx]
}

export class ShunShou extends SingleRuse<void> {

    public constructor(public ruseAction: PlayerAction) {
        super(ruseAction, CardType.SHUN_SHOU)
    }

    public async doPerform(manager: GameManager) {
        let targetPlayer = manager.context.getPlayer(this.target)

        let resp = await manager.sendHint(this.ruseAction.actionSource, {
            hintType: HintType.UI_PANEL,
            hintMsg: '请选择对方一张牌',
            cardSelectHint: {
                rowsOfCard: gatherCards(targetPlayer),
                title: `顺手牵羊 > ${this.target}`,
                mode: 'choose'
            }
        })
        console.log('顺手牵羊成功!', resp)
        let res = resp.customData as CardSelectionResult
        let card = findCard(targetPlayer, res)
        delete card.description
        delete card.as
        manager.transferCards(this.target, this.ruseAction.actionSource, cardPosNames.get(res.rowName), CardPos.HAND, [card])
    }
}

export class GuoHe extends SingleRuse<void> {

    public constructor(public ruseAction: PlayerAction) {
        super(ruseAction, CardType.GUO_HE)
    }

    public async doPerform(manager: GameManager) {
        let targetPlayer = manager.context.getPlayer(this.target)

        let resp = await manager.sendHint(this.ruseAction.actionSource, {
            hintType: HintType.UI_PANEL,
            hintMsg: '请选择对方一张牌',
            cardSelectHint: {
                rowsOfCard: gatherCards(targetPlayer),
                title: `过河拆桥 > ${this.target}`,
                mode: 'choose'
            }
        })
        console.log('过河拆桥成功!', resp)
        let res = resp.customData as CardSelectionResult
        let card = findCard(targetPlayer, res)
        card.description = `${this.target} 被弃置`
        manager.sendToWorkflow(this.target, cardPosNames.get(res.rowName), [card])
    }
}


export class WuZhong extends SingleRuse<void> {
    
    public constructor(public ruseAction: PlayerAction) {
        super(ruseAction, CardType.WU_ZHONG)
    }

    public async doPerform(manager: GameManager) {
        console.log('无中生有成功!')
        await new TakeCardOp(manager.context.getPlayer(this.ruseAction.actionSource), 2).perform(manager)
    }
}

export class JieDao extends SingleRuse<void> {

    public constructor(public ruseAction: PlayerAction) {
        super(ruseAction, CardType.WU_ZHONG)
    }

    public async doPerform(manager: GameManager) {
        console.log('借刀杀人开始结算!')

        let actors = getFromAction(this.ruseAction, UIPosition.PLAYER);
        let from = manager.context.getPlayer(actors[0])
        let to = manager.context.getPlayer(actors[1])
        let weapon = from.getCards(CardPos.EQUIP).find(c => c.type.genre === 'weapon')

        if(!weapon || actors.length !== 2) {
            console.error('借刀杀人指令不对', this.ruseAction)
            throw `Invalid!!`
        }

        let resp = await manager.sendHint(from.player.id, {
            hintType: HintType.PLAY_SLASH,
            hintMsg: `${this.ruseAction.actionSource} 令你对 ${to.player.id} 出杀, 取消则放弃你的武器`,
            targetPlayers: [this.ruseAction.actionSource],
            extraButtons: [new Button(Button.CANCEL.id, '放弃')]
        })

        let slashCards = getFromAction(resp, UIPosition.PLAYER).map(manager.getCard)
        let targets = getFromAction(resp, UIPosition.PLAYER)
        targets.push(this.ruseAction.actionSource)
        let targetPs = targets.map(manager.context.getPlayer)

        if(isCancel(resp)) {
            console.log('玩家放弃出杀, 失去武器')
            manager.transferCards(from.player.id, to.player.id, CardPos.EQUIP, CardPos.HAND, [weapon])
        } else {
            console.log('玩家出杀, 开始结算吧')
            await new PlaySlashOp(resp, targetPs, slashCards).perform(manager)
        }
    }
}