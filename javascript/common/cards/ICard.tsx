import { Suit, CardSize, CardType, Color } from "./Card";
import { all } from "../util/Util";


export interface ICard {
    suit: Suit
    size: CardSize
    type: CardType
    as?: CardType
}

export class CardDummy implements ICard {
    public constructor(public suit: Suit, public size: CardSize, public type: CardType){}
}

export function mimicCard(card: ICard): CardDummy {
    return new CardDummy(card.suit, card.size, card.type)
}

export function deriveColor(suits: Suit[]): Color {
    if(all(suits, s=>isSuitRed(s))) {
        return 'red'
    }
    if(all(suits, s=>isSuitBlack(s))) {
        return 'black'
    }
    return 'n.a.'
}

export function isSuitRed(suit: Suit) {
    return suit === 'heart' || suit === 'diamond'
}

export function isSuitBlack(suit: Suit) {
    return suit === 'club' || suit === 'spade'
}