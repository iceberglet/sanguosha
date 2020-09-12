import Card, { CardType } from "../../common/cards/Card";
import { CardPos, isCardPosHidden } from "../../common/transit/CardPos";
import { PlayerInfo } from "../../common/PlayerInfo";
import { CardSelectionResult } from "../../common/ServerHint";

export interface CardAwayEvent {
    player: string
    cards: Array<[Card, CardPos]>
}

//使用 / 打出
export class CardBeingUsedEvent implements CardAwayEvent {
    constructor(public readonly player: string, public readonly cards: Array<[Card, CardPos]>, 
                public readonly as: CardType, public readonly isFromSkill: boolean = false,
                public readonly isUse: boolean = true) {}
}

//弃置
export class CardBeingDroppedEvent implements CardAwayEvent {
    constructor(public readonly player: string, public readonly cards: Array<[Card, CardPos]>) {}
}

//拿走
export class CardBeingTakenEvent implements CardAwayEvent {
    constructor(public readonly player: string, public readonly cards: Array<[Card, CardPos]>) {}
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

export function gatherCards(info: PlayerInfo, poses: CardPos[]): {[key: string]: Array<Card>} {
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
        if(isCardPosHidden(pos)) {
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