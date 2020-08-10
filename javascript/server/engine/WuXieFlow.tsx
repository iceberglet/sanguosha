import GameManager from "../GameManager";
import GameContext from "../../common/GameContext";
import { PlayerInfo, Mark } from "../../common/PlayerInfo";
import { CardType } from "../../common/cards/Card";
import Flow from "../Flow";

export default class WuXieFlow extends Flow {

    constructor(
        //从谁开始计算?
        private playerInfo: PlayerInfo, 
        //需要无懈什么?
        private cartType: CardType) {
        super()
    }

    public async doNext(manager: GameManager): Promise<boolean> {
        return true
    }

    public async process() {
        //get next judge card
        while(!(await this.processNextJudge())) {
            console.log('判定牌完成, 继续下一个')
        }
    }

    //return true if all done
    private async processNextJudge(): Promise<boolean> {
        return true
    }
}