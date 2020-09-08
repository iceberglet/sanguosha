import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";

export enum HealTimeline {
    BEFORE, AFTER
}

export default class HealOp extends Operation<void> {

    timeline = HealTimeline.BEFORE

    public constructor(public source: PlayerInfo, 
                        public target: PlayerInfo, 
                        public amount: number) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {

        //救援增加治疗量? 
        await manager.events.publish(this)

        //Heal可以被防止么?
        if(this.amount > 0) {
            this.target.heal(this.amount)
            manager.broadcast(this.target, PlayerInfo.sanitize)

            this.timeline = HealTimeline.AFTER
            await manager.events.publish(this)

            //恩怨?
            // await manager.afterFlowDone.publish(this)
        }
    }

    
}