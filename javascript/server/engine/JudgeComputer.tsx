import GameManager from "../GameManager";
import GameContext from "../../common/GameContext";
import { PlayerInfo, Mark } from "../../common/PlayerInfo";

export default class JudgeComputer {

    constructor(private playerInfo: PlayerInfo, private manager: GameManager, private context: GameContext) {}

    public async process() {
        //get next judge card
        while(!(await this.processNextJudge())) {
            console.log('判定牌完成, 继续下一个')
        }
    }

    //return true if all done
    private async processNextJudge(): Promise<boolean> {
        let judges = this.playerInfo.getJudgeCards()
        if(judges.length === 0) {
            return true
        }
        




        return false
    }
}