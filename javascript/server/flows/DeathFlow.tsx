import { PlayerInfo } from "../../common/PlayerInfo";
import { CardPos } from "../../common/transit/CardPos";
import Card from "../../common/cards/Card";
import Flow, { Operation } from "../Flow";
import GameManager from "../GameManager";
import { TransferCardEffect } from "../../common/transit/EffectTransit";


//this player is surely dead
//will send event for processing
export default class DeathFlow extends Flow {

    cardsAndPos: Array<[Card, CardPos]>

    public constructor(public readonly info: PlayerInfo) {
        super()
        this.info.declareDeath()
        this.cardsAndPos = this.info.getAllCards()
    }
    
    public async doNext(manager: GameManager): Promise<boolean> {

        manager.beforeFlowHappen.publish(this, this.info.player.id)

        //physically transfer everything
        this.cardsAndPos.forEach(cardAndPos => {
            manager.context.transferCards(this.info.player.id, null, cardAndPos[1], CardPos.DROPPED, [cardAndPos[0].id])
        })

        //show player death. no need to sanitize anymore
        manager.broadcast(this.info)

        //animation of card transfer. no need to sanitize
        manager.broadcast(new TransferCardEffect(this.info.player.id, null, this.cardsAndPos.map(c => c[0].id)))

        return true
    }
}