import GameContext from "../common/GameContext";
import { PlayerInfo } from "../common/PlayerInfo";
import { PlayerAction } from "../client/player-actions/PlayerUIAction";

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


type FlowListener = (flow: Flow, context: GameContext) => void

//一次完整结算
//比如: 一次南蛮入侵带来的flow
//1. Player 1 出南蛮
//2. Player 2 出杀
//3. Player 3 掉血, 触发技能(e.g.如遗计)
//4. Player 4 触发技能/装备(e.g.帷幕/藤甲)
//5. ...
//6. 直到南蛮结算完毕,进入下一个出牌
class Flow {

    currentPlayer: PlayerInfo

    currentStage: Stage

    actions: PlayerAction[]



}