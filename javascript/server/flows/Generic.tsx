import Card, { CardType } from "../../common/cards/Card";
import { CardPos, isCardPosHidden } from "../../common/transit/CardPos";
import { PlayerInfo } from "../../common/PlayerInfo";
import { CardSelectionResult } from "../../common/ServerHint";

export interface CardAwayEvent {
    player: string
    cards: Array<[Card, CardPos]>
}

//使用
export class CardBeingUsedEvent implements CardAwayEvent {
    constructor(public readonly player: string, public readonly cards: Array<[Card, CardPos]>, public readonly as: CardType) {}
}

//打出
export class CardBeingPlayedEvent implements CardAwayEvent {
    constructor(public readonly player: string, public readonly cards: Array<[Card, CardPos]>, public readonly as: CardType) {}
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
    constructor(public readonly player: string, public readonly obtained: Card[]) {}
}



const cardPosNames = new Map<string, CardPos>([
    ['手牌', CardPos.HAND],
    ['装备区', CardPos.EQUIP],
    ['判定区', CardPos.JUDGE],
])

export function gatherCards(info: PlayerInfo, poses: CardPos[]): {[key: string]: Array<Card>} {
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
        if(isCardPosHidden(pos)) {
            res[n] = cards.map(c => Card.DUMMY)
        } else {
            res[n] = cards
        }
    }
    return res
}

export function findCard(info: PlayerInfo, res: CardSelectionResult): Array<[Card, CardPos]> {
    return res.map(r => [info.getCards(cardPosNames.get(r.rowName))[r.idx], cardPosNames.get(r.rowName)])
}