import Flow from "../Flow"
import { PlayerInfo } from "../../common/PlayerInfo";
import GameManager from "../GameManager";
import { Stage } from "../../common/Stage";

export class StageStartFlow extends Flow {

    constructor(public readonly info: PlayerInfo, public readonly stage: Stage) {
        super()
    }

    public async doNext(manager: GameManager) {
        //若要跳过任何阶段, 只需改变manager.roundStat
        await manager.beforeFlowHappen.publish(this, this.info.player.id)

        await manager.afterFlowDone.publish(this, this.info.player.id)

        return true
    }
}


export class StageEndFlow extends Flow {

    constructor(public readonly info: PlayerInfo, public readonly stage: Stage) {
        super()
    }

    public async doNext(manager: GameManager) {
        //若要跳过任何阶段, 只需改变manager.roundStat
        await manager.beforeFlowHappen.publish(this, this.info.player.id)

        await manager.afterFlowDone.publish(this, this.info.player.id)

        return true
    }
}