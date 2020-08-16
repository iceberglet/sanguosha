import { PlayerInfo } from "../../common/PlayerInfo";
import { CardPos } from "../../common/transit/CardPos";
import Card from "../../common/cards/Card";
import Flow, { Operation, PlayerDeadInHisRound } from "../Flow";
import GameManager from "../GameManager";
import { TransferCardEffect } from "../../common/transit/EffectTransit";
import DamageOp from "./DamageOp";


//this player is surely dead
//will send event for processing
export default class DeathOp extends Operation<void> {

    //涅槃? 不屈?
    abort: boolean = false
    //cards to drop
    //remove stuff from here (曹丕行殇?)
    toDrop: Array<[Card, CardPos]>

    public constructor(public readonly info: PlayerInfo, public readonly dmanageOp: DamageOp) {
        super()
        this.info.declareDeath()
        this.toDrop = this.info.getAllCards()
    }
    
    public async perform(manager: GameManager): Promise<void> {

        manager.beforeFlowHappen.publish(this, this.info.player.id)

        if(this.abort) {
            return
        }

        manager.afterFlowDone.publish(this, this.info.player.id)

        //physically transfer everything
        this.toDrop.forEach(cardAndPos => {
            manager.context.transferCards(this.info.player.id, null, cardAndPos[1], CardPos.DROPPED, [cardAndPos[0].id])
        })

        //show player death. no need to sanitize anymore
        manager.broadcast(this.info)

        //animation of card transfer. no need to sanitize
        manager.broadcast(new TransferCardEffect(this.info.player.id, null, this.toDrop.map(c => c[0].id)))

        if(manager.currPlayer().player.id === this.info.player.id) {
            throw new PlayerDeadInHisRound()
        }

    }
}