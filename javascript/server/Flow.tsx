import GameContext from "../common/GameContext";
import { PlayerInfo } from "../common/PlayerInfo";
import { PlayerAction } from "../common/PlayerAction";
import GameManager, { Stage } from "./GameManager";


type FlowListener = (flow: Flow, context: GameContext) => void

//一次完整结算
//比如: 一次南蛮入侵带来的flow
//1. Player 1 出南蛮
//2. Player 2 出杀
//3. Player 3 掉血, 触发技能(e.g.如遗计)
//4. Player 4 触发技能/装备(e.g.帷幕/藤甲)
//5. ...
//6. 直到南蛮结算完毕,进入下一个出牌
// * 结算过程中可能会发起新的结算
export default abstract class Flow {

    /**
     * 结算下一步
     * @param context 
     * @param manager 
     * @returns true if this Flow is complete
     */
    public abstract async doNext(manager: GameManager): Promise<boolean>


}

export class PlayerDeadInHisRound{}