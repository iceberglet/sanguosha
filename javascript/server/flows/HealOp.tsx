import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { PlayerAction, isCancel } from "../../common/PlayerAction";


export default class HealOp extends Operation<void> {


    public constructor(public source: PlayerInfo, 
        public target: PlayerInfo, 
        public amount: number,
        public cause: PlayerAction) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        let targetId = this.target.player.id

        //救援增加治疗量? 
        await manager.beforeFlowHappen.publish(this)

        //Heal可以被防止么?
        if(this.amount > 0) {
            this.target.heal(this.amount)
            manager.broadcast(this.target, PlayerInfo.sanitize)

            //恩怨?
            await manager.afterFlowDone.publish(this)
        }
    }

    
}