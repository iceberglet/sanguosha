import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { PlayerAction, isCancel } from "../../common/PlayerAction";
import { CardPos } from "../../common/transit/ContextTransit";
import { TransferCardEffect } from "../../common/transit/EffectTransit";

//摸牌阶段
export default class TakeCardOp extends Operation {

    public constructor(public player: PlayerInfo, 
                        public amount: number) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        await manager.beforeFlowHappen.publish(this, this.player.player.id);

        if(this.amount > 0) {
            let cards = manager.context.deck.getCardsFromTop(this.amount)
            //animation of card transfer. need to sanitize
            manager.broadcast(new TransferCardEffect(null, this.player.player.id, cards.map(c => c.id)), TransferCardEffect.toTransit)
            //add cards from deck to player
            cards.forEach(c => this.player.addCard(c, CardPos.HAND))
            //update this player's info
            manager.broadcast(this.player, PlayerInfo.toTransit)
        }

        await manager.afterFlowDone.publish(this, this.player.player.id);
    }

    
}