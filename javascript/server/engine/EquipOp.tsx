import GameManager from "../GameManager";
import {Card}from "../../common/cards/Card";
import { CardPos } from "../../common/transit/CardPos";
import {PlayerInfo} from '../../common/PlayerInfo'
import { CardBeingDroppedEvent } from "./Generic";
import { PlaySound } from "../../common/transit/EffectTransit";

export class EquipOp {

    //todo: there are many other ways to equip??
    public constructor(public readonly beneficiary: PlayerInfo, 
        public readonly card: Card, 
        public readonly sourcePos: CardPos = CardPos.HAND,
        public readonly source: PlayerInfo = beneficiary) {
    }

    public async perform(manager: GameManager) {

        let replace = this.beneficiary.findCardAt(CardPos.EQUIP, this.card.type.genre)

        if(replace) {
            //need to remove this first
            await new UnequipOp(this.beneficiary, replace, this.source).perform(manager)
        }

        if(this.card.type.isHorse()) {
            manager.broadcast(new PlaySound('audio/card/common/horse.ogg'))
        } else {
            manager.broadcast(new PlaySound('audio/card/common/equipment.ogg'))
        }
        await manager.transferCards(this.source.player.id, this.beneficiary.player.id, this.sourcePos, CardPos.EQUIP, [this.card])

        await manager.events.publish(this)
        // newOwner.addCard(this.card, CardPos.EQUIP)
        // manager.broadcast(newOwner, PlayerInfo.sanitize)

    } 
}


export class UnequipOp {

    public constructor(public readonly loser: PlayerInfo,
                        public readonly card: Card,
                        public readonly remover: PlayerInfo = null) {
        if(!remover) {
            this.remover = loser
        }
    }

    public async perform(manager: GameManager) {

        await manager.events.publish(this)

        this.card.description = `${this.loser} 装备区弃置`
        manager.sendToWorkflow(this.loser.player.id, CardPos.EQUIP, [this.card])
        await manager.events.publish(new CardBeingDroppedEvent(this.loser.player.id, [[this.card, CardPos.EQUIP]]))

    } 
}