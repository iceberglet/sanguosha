import Card, { CardType } from "../../common/cards/Card";
import { CardPos, isCardPosHidden } from "../../common/transit/CardPos";
import { PlayerInfo } from "../../common/PlayerInfo";
import { CardSelectionResult } from "../../common/ServerHint";
import { UIPosition } from "../../common/PlayerAction";

//todo: remember 之后的手牌数, 用以发动渐营 + 死谏 避免技能相互作用条件不满足无法发动
export abstract class CardAwayEvent {
    player: string
    cards: Array<[Card, CardPos]>

    isCardFrom(playerId: string) {
        return this.player === playerId && (this.cards[0][1] === CardPos.HAND || this.cards[0][1] === CardPos.EQUIP)
    }
}

//使用 / 打出
//必须是在牌出到了workflow之后publish
export class CardBeingUsedEvent extends CardAwayEvent {
    constructor(public readonly player: string, public readonly cards: Array<[Card, CardPos]>, 
                public readonly as: CardType, public readonly isFromSkill: boolean = false,
                public readonly isUse: boolean = true) {
                    super()
                }
}

//弃置
//必须是在牌出到了workflow之后publish
export class CardBeingDroppedEvent extends CardAwayEvent {
    constructor(public readonly player: string, public readonly cards: Array<[Card, CardPos]>) {
        super()
    }
}

//拿走
//必须是在牌出到了workflow之后publish
export class CardBeingTakenEvent extends CardAwayEvent {
    constructor(public readonly player: string, public readonly cards: Array<[Card, CardPos]>) {
        super()
    }
}

//获得
export class CardObtainedEvent {
    constructor(public readonly player: string, public readonly cards: Array<[Card, CardPos]>) {}
}



const cardPosNames = new Map<string, CardPos>([
    ['手牌', CardPos.HAND],
    ['装备区', CardPos.EQUIP],
    ['判定区', CardPos.JUDGE],
])


export function cardAmountAt(info: PlayerInfo, poses: UIPosition[]): number {
    let size = 0
    poses.forEach(p => {
        if(p === UIPosition.MY_HAND) {
            size += info.getCards(CardPos.HAND).length
        } else if (p === UIPosition.MY_EQUIP) {
            size += info.getCards(CardPos.EQUIP).length
        }
    })
    return size
}

export function gatherCards(info: PlayerInfo, poses: CardPos[], aggressor: string = null): {[key: string]: Array<Card>} {
    let count = 0
    let res: {[key: string]: Array<Card>} = {}
    for(let n of cardPosNames.keys()) {
        let pos = cardPosNames.get(n)
        if(!poses.find(p => pos === p)) {
            continue // not interested in this position
        }
        let cards = info.getCards(pos)
        if(cards.length === 0) {
            continue
        }
        count += cards.length
        if(isCardPosHidden(pos) && info.player.id !== aggressor) {
            res[n] = cards.map(c => Card.DUMMY)
        } else {
            res[n] = cards
        }
    }
    if(count === 0) {
        console.error('无法取得这些位置的牌...', info.player.id, poses)
        return null
    }
    return res
}

export function findCard(info: PlayerInfo, res: CardSelectionResult): Array<[Card, CardPos]> {
    return res.map(r => [info.getCards(cardPosNames.get(r.rowName))[r.idx], cardPosNames.get(r.rowName)])
}