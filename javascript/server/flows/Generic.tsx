import { PlayerAction } from "../../common/PlayerAction";
import { ICard } from "../../common/cards/ICard";

export class CardBeingPlayedEvent {

    constructor(public readonly action: PlayerAction, 
                public readonly playedAs: ICard) {}

}

export class CardBeingDroppedEvent {
    constructor(public readonly action: PlayerAction) {
        
    }
}