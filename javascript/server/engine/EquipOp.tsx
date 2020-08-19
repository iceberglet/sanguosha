import GameManager from "../GameManager";
import Card from "../../common/cards/Card";
import { CardPos } from "../../common/transit/CardPos";
import {PlayerInfo} from '../../common/PlayerInfo'

export class EquipOp {

    public constructor(public readonly beneficiary: string, 
        public readonly card: Card, 
        public readonly source: string = null) {
        if(!source) {
            source = beneficiary
        }
    }

    public async perform(manager: GameManager) {

        await manager.beforeFlowHappen.publish(this, manager.currPlayer().player.id)

        let newOwner = manager.context.getPlayer(this.beneficiary)
        let currEquips = newOwner.getCards(CardPos.EQUIP)
        let replace = currEquips.find(c => c.type.genre === this.card.type.genre)

        if(replace) {
            //need to remove this first
            await new UnequipOp(this.beneficiary, replace, this.source).perform(manager)
        }

        newOwner.addCard(this.card, CardPos.EQUIP)
        manager.broadcast(newOwner, PlayerInfo.sanitize)

        await manager.afterFlowDone.publish(this, manager.currPlayer().player.id)
    } 
}


export class UnequipOp {

    public constructor(public readonly loser: string,
                        public readonly card: Card,
                        public readonly remover: string = null) {
        if(!remover) {
            this.remover = loser
        }
    }

    public async perform(manager: GameManager) {

        await manager.beforeFlowHappen.publish(this, manager.currPlayer().player.id)

        manager.sendToWorkflow(this.loser, CardPos.EQUIP, [{
            cardId: this.card.id, isDropped: true, 
            source: this.loser, description: `${this.loser} 装备区弃置`
        }])

        await manager.afterFlowDone.publish(this, manager.currPlayer().player.id)

    } 
}