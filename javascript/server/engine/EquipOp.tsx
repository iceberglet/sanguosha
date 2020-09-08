import GameManager from "../GameManager";
import Card from "../../common/cards/Card";
import { CardPos } from "../../common/transit/CardPos";
import {PlayerInfo} from '../../common/PlayerInfo'
import { CardBeingDroppedEvent } from "./Generic";
import { PlaySound } from "../../common/transit/EffectTransit";

export class EquipOp {

    //todo: there are many other ways to equip??
    public constructor(public readonly beneficiary: string, 
        public readonly card: Card, 
        public readonly sourcePos: CardPos = CardPos.HAND,
        public readonly source: string = beneficiary) {
    }

    public async perform(manager: GameManager) {

        await manager.events.publish(this)

        let newOwner = manager.context.getPlayer(this.beneficiary)
        let currEquips = newOwner.getCards(CardPos.EQUIP)
        let replace = currEquips.find(c => c.type.genre === this.card.type.genre)

        if(replace) {
            //need to remove this first
            await new UnequipOp(this.beneficiary, replace, this.source).perform(manager)
        }

        if(this.card.type.isHorse()) {
            manager.broadcast(new PlaySound('audio/card/common/horse.ogg'))
        } else {
            manager.broadcast(new PlaySound('audio/card/common/equipment.ogg'))
        }
        manager.transferCards(this.source, this.beneficiary, this.sourcePos, CardPos.EQUIP, [this.card])
        // newOwner.addCard(this.card, CardPos.EQUIP)
        // manager.broadcast(newOwner, PlayerInfo.sanitize)

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

        await manager.events.publish(this)

        this.card.description = `${this.loser} 装备区弃置`
        manager.sendToWorkflow(this.loser, CardPos.EQUIP, [this.card])
        await manager.events.publish(new CardBeingDroppedEvent(this.loser, [[this.card, CardPos.EQUIP]]))

    } 
}