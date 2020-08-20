import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { ICard } from "../../common/cards/ICard";
import { getFromAction, PlayerAction, UIPosition } from "../../common/PlayerAction";
import { WuXieContext } from "../flows/WuXieOp";
import { HintType, CardSelectionResult } from "../../common/ServerHint";
import { PlayerInfo, Mark } from "../../common/PlayerInfo";
import { CardPos } from "../../common/transit/CardPos";
import Card from "../../common/cards/Card";
import { TransferCardEffect, TextFlashEffect } from "../../common/transit/EffectTransit";

export abstract class SingleRuse<T> extends Operation<T> {

    public abort = false
    public readonly target: string

    public constructor(public readonly ruseAction: PlayerAction, public readonly ruseCard: ICard) {
        super()
        this.target = getFromAction(this.ruseAction, UIPosition.PLAYER)[0]
    }

    public async perform(manager: GameManager): Promise<T> {

        manager.beforeFlowHappen.publish(this, this.ruseAction.actionSource)

        if(this.abort) {
            console.log('锦囊牌被取消了')
            return
        }

        manager.broadcast(new TextFlashEffect(this.ruseAction.actionSource, [this.target], this.ruseCard.type.name))

        if(await new WuXieContext(manager, this.ruseAction, this.ruseCard).doOneRound(this.target)) {
            console.log('锦囊牌被无懈掉了了')
            return
        }

        await this.doPerform(manager)

        manager.afterFlowDone.publish(this, this.ruseAction.actionSource)
    }

    public abstract async doPerform(manager: GameManager): Promise<T>

}

function gatherCards(info: PlayerInfo): {[key: string]: Array<Card | Mark>} {

    let sanitized = PlayerInfo.sanitize(info, null)

    return {
        '手牌': sanitized.getCards(CardPos.HAND),
        '装备区': sanitized.getCards(CardPos.EQUIP),
        '判定区': sanitized.getJudgeCards()
    }
}

function findCard(info: PlayerInfo, res: CardSelectionResult): Card {
    switch(res.rowName) {
        case '手牌': return info.getCards(CardPos.HAND)[res.idx]
        case '装备区': return info.getCards(CardPos.HAND)[res.idx]
        case '判定区': return info.getJudgeCards()[res.idx].card
    }
}

export class ShunShou extends SingleRuse<void> {

    public constructor(public ruseAction: PlayerAction, public ruseCard: ICard) {
        super(ruseAction, ruseCard)
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
        manager.transferCards(this.target, this.ruseAction.actionSource, null, CardPos.HAND, [card.id])
        manager.broadcast(new TransferCardEffect(this.target, this.ruseAction.actionSource, [card.id]))
        manager.broadcast(manager.context.getPlayer(this.ruseAction.actionSource), PlayerInfo.sanitize)
        manager.broadcast(targetPlayer, PlayerInfo.sanitize)
    }
}