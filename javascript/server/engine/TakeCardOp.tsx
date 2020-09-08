import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { CardPos } from "../../common/transit/CardPos";
import { CardTransit } from "../../common/transit/EffectTransit";
import { CardObtainedEvent } from "./Generic";

export class TakeCardStageOp extends Operation<void> {
    
    public constructor(public player: PlayerInfo, 
        public amount: number) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        await manager.events.publish(this)

        if(this.amount > 0) {
            await this.do(manager)
        }
    }

    public async do(manager: GameManager) {
        await new TakeCardOp(this.player, this.amount).perform(manager)
    }
}

//摸牌阶段
export default class TakeCardOp extends Operation<void> {

    public constructor(public player: PlayerInfo, 
                        public amount: number) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        let cards = manager.context.deck.getCardsFromTop(this.amount)
        //add cards from deck to player
        cards.forEach(c => this.player.addCard(c, CardPos.HAND))
        //animation of card transfer. need to sanitize
        manager.broadcast(CardTransit.fromDeck(this.player.player.id, cards), CardTransit.defaultSanitize)
        //event
        await manager.events.publish(new CardObtainedEvent(this.player.player.id, cards))
    }
    
}