import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { isCancel, UIPosition, getFromAction } from "../../common/PlayerAction";
import { CardPos } from "../../common/transit/CardPos";
import { TransferCardEffect } from "../../common/transit/EffectTransit";
import { HintType } from "../../common/ServerHint";

//弃牌阶段
export default class DropCardOp extends Operation<void> {

    amount = 0

    public constructor(public player: PlayerInfo) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        this.amount = Math.max(this.player.getCards(CardPos.HAND).length - this.player.hp, 0)

        await manager.beforeFlowHappen.publish(this, this.player.player.id);

        if(this.amount > 0) {

            let resp = await manager.sendHint(this.player.player.id, {
                hintType: HintType.DROP_CARDS,
                hintMsg: `请弃置${this.amount}张手牌`,
                dropNumber: this.amount
            })

            if(isCancel(resp)) {
                throw 'How is this possible?'
            }

            //remove these cards
            let cards = getFromAction(resp, UIPosition.MY_HAND).map(id => manager.cardManager().getCard(id))

            cards.forEach(c => this.player.removeCard(c.id))
            //remove
            manager.broadcast(this.player, PlayerInfo.sanitize)
            //animation of card transfer. no need to sanitize
            manager.broadcast(new TransferCardEffect(this.player.player.id, null, cards.map(c => c.id)))
        }

        await manager.afterFlowDone.publish(this, this.player.player.id);
    }

    
}