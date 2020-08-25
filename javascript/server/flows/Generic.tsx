import Card, { CardType } from "../../common/cards/Card";
import { CardPos } from "../../common/transit/CardPos";

export class CardBeingPlayedEvent {
    constructor(public readonly player: string, public readonly played: Card[], public readonly as: CardType) {}
}

export class CardBeingDroppedEvent {
    constructor(public readonly player: string, public readonly dropped: Array<[Card, CardPos]>) {}
}

export class CardObtainedEvent {
    constructor(public readonly player: string, public readonly obtained: Card[]) {}
}