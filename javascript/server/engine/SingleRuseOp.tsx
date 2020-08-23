import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { ICard } from "../../common/cards/ICard";
import { getFromAction, PlayerAction, UIPosition } from "../../common/PlayerAction";
import { WuXieContext } from "../flows/WuXieOp";
import { HintType, CardSelectionResult } from "../../common/ServerHint";
import { PlayerInfo } from "../../common/PlayerInfo";
import { CardPos, isCardPosHidden } from "../../common/transit/CardPos";
import Card from "../../common/cards/Card";
import { TextFlashEffect } from "../../common/transit/EffectTransit";

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

const cardPosNames = new Map<string, CardPos>([
    ['手牌', CardPos.HAND],
    ['装备区', CardPos.EQUIP],
    ['判定区', CardPos.JUDGE],
])

function gatherCards(info: PlayerInfo): {[key: string]: Array<Card>} {
    let res: {[key: string]: Array<Card>} = {}
    for(let n of cardPosNames.keys()) {
        let pos = cardPosNames.get(n)
        if(isCardPosHidden(pos)) {
            res[n] = info.getCards(pos).map(c => Card.DUMMY)
        } else {
            res[n] = info.getCards(pos)
        }
    }
    return res
}

function findCard(info: PlayerInfo, res: CardSelectionResult): Card {
    return info.getCards(cardPosNames.get(res.rowName))[res.idx]
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
        manager.transferCards(this.target, this.ruseAction.actionSource, null, CardPos.HAND, [card])
    }
}