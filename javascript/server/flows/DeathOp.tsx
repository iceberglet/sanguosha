import { PlayerInfo } from "../../common/PlayerInfo";
import { CardPos } from "../../common/transit/CardPos";
import Card from "../../common/cards/Card";
import { Operation, PlayerDeadInHisRound } from "../Flow";
import GameManager from "../GameManager";
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

        await manager.events.publish(this)

        //涅槃
        if(this.abort) {
            return
        }

        //physically transfer everything
        this.toDrop.forEach(cardAndPos => {
            cardAndPos[0].description = `${this.info.player.id} 阵亡弃牌`
            manager.sendToWorkflow(this.info.player.id, cardAndPos[1], [cardAndPos[0]])
        })

        //show player death. no need to sanitize anymore
        this.info.declareDeath()
        manager.broadcast(this.info)

        if(manager.currPlayer().player.id === this.info.player.id) {
            throw new PlayerDeadInHisRound()
        }

    }
}