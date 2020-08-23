import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { CardPos } from "../../common/transit/CardPos";
import { CardTransit } from "../../common/transit/EffectTransit";

//摸牌阶段
export default class TakeCardOp extends Operation<void> {

    public constructor(public player: PlayerInfo, 
                        public amount: number) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        await manager.beforeFlowHappen.publish(this, this.player.player.id);

        if(this.amount > 0) {
            await this.do(manager)
        }

        await manager.afterFlowDone.publish(this, this.player.player.id);
    }

    public async do(manager: GameManager) {
        let cards = manager.context.deck.getCardsFromTop(this.amount)
        //animation of card transfer. need to sanitize
        manager.broadcast(CardTransit.fromDeck(this.player.player.id, cards), CardTransit.sanitize)
        //add cards from deck to player
        cards.forEach(c => this.player.addCard(c, CardPos.HAND))
        //update this player's info
        manager.broadcast(this.player, PlayerInfo.sanitize)
    }
    
}