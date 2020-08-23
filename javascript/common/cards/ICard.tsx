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

export function isSuitRed(card: ICard) {
    return card.suit === 'heart' || card.suit === 'diamond'
}

export function isSuitBlack(card: ICard) {
    return card.suit === 'club' || card.suit === 'spade'
}