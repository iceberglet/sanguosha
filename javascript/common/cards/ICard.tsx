import { Suit, CardSize, CardType } from "./Card";


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

export function isSuitRed(suit: Suit) {
    return suit === 'heart' || suit === 'diamond'
}

export function isSuitBlack(suit: Suit) {
    return suit === 'club' || suit === 'spade'
}