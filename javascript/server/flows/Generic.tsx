import Card, { CardType } from "../../common/cards/Card";
import { CardPos } from "../../common/transit/CardPos";

//使用
export class CardBeingUsedEvent {
    constructor(public readonly player: string, public readonly played: Array<[Card, CardPos]>, public readonly as: CardType) {}
}

//打出
export class CardBeingPlayedEvent {
    constructor(public readonly player: string, public readonly played: Array<[Card, CardPos]>, public readonly as: CardType) {}
}

//弃置
export class CardBeingDroppedEvent {
    constructor(public readonly player: string, public readonly dropped: Array<[Card, CardPos]>) {}
}

//获得
export class CardObtainedEvent {
    constructor(public readonly player: string, public readonly obtained: Card[]) {}
}