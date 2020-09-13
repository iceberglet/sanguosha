import { Operation } from "../Operation"
import { PlayerInfo } from "../../common/PlayerInfo";
import GameManager from "../GameManager";
import { Stage } from "../../common/Stage";

export class StageStartFlow extends Operation<void> {

    constructor(public readonly info: PlayerInfo, public readonly stage: Stage) {
        super()
    }

    public async perform(manager: GameManager) {
        //若要跳过任何阶段, 只需改变manager.roundStat
        await manager.events.publish(this)
    }

    public isFor(p: string, stage: Stage) {
        return p === this.info.player.id && this.stage === stage
    }
}


export class StageEndFlow extends Operation<void> {

    constructor(public readonly info: PlayerInfo, public readonly stage: Stage) {
        super()
    }

    public async perform(manager: GameManager) {
        //若要跳过任何阶段, 只需改变manager.roundStat
        await manager.events.publish(this)
    }
    
    public isFor(p: string, stage: Stage) {
        return p === this.info.player.id && this.stage === stage
    }
}