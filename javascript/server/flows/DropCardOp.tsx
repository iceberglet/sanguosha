import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { isCancel, UIPosition, getFromAction } from "../../common/PlayerAction";
import { CardPos } from "../../common/transit/CardPos";
import { HintType } from "../../common/ServerHint";

//弃牌阶段
export default class DropCardOp extends Operation<void> {

    amount = 0

    public constructor(public player: PlayerInfo) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        let myId = this.player.player.id

        this.amount = Math.max(this.player.getCards(CardPos.HAND).length - this.player.hp, 0)

        await manager.beforeFlowHappen.publish(this, myId);

        if(this.amount > 0) {

            let resp = await manager.sendHint(myId, {
                hintType: HintType.DROP_CARDS,
                hintMsg: `请弃置${this.amount}张手牌`,
                dropNumber: this.amount
            })
            

            if(isCancel(resp)) {
                throw 'How is this possible?'
            }

            //remove these cards
            let cards = getFromAction(resp, UIPosition.MY_HAND)//.map(id => manager.cardManager().getCard(id))

            let dropped = cards.map(c => {
                let card = manager.getCard(c)
                delete card.as
                card.description = `[${myId}]弃牌`
                return card
            })
            manager.sendToWorkflow(myId, CardPos.HAND, dropped, true)
        }

        await manager.afterFlowDone.publish(this, myId);
    }

    
}