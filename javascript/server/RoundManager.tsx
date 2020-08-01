import GameContext from "../common/GameContext";
import { enumValues } from "../common/util/Util";

export enum Stage {
    //回合开始阶段
    ROUND_BEGIN,
    //判定阶段
    JUDGE,
    //摸牌阶段
    TAKE_CARD,
    //出牌阶段
    USE_CARD,
    //弃牌阶段
    DROP_CARD,
    //回合结束阶段
    ROUND_END
}

const stages = enumValues(Stage)

export enum StagePeriod {
    BEGIN, DURING, END
}

export type GameStageListener = (stage: Stage, period: StagePeriod, playerId: number) => void

//Manages the rounds
export default class RoundManager {

    //index of GameContext#playerInfos
    private currentPlayer: number = 0
    private currentStage: Stage = Stage.ROUND_BEGIN

    public constructor(private context: GameContext) {

    }

    public startGame() {
        while(true) {
            //go to next round
            let player = this.context.playerInfos[this.currentPlayer]
            if(player.isTurnedOver) {
                player.isTurnedOver = false
                this.goToNextPlayer()
                continue;
            } else {
                //let round = new Round(player)
                for(let s in stages) {
                    for(let p in Object.keys(StagePeriod)) {
                        //invoke the listeners
                    }
                }
            }
        }
    }

    private endCurrentStage() {
        
    }

    private goToNextPlayer() {
        this.currentPlayer = (this.currentPlayer + 1) % this.context.playerInfos.length
        this.currentStage = Stage.ROUND_BEGIN
    }

}