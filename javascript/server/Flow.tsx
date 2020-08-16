import GameManager from "./GameManager";



//一次完整结算
//比如: 一次南蛮入侵带来所有人出杀的flow
//1. Player 1 出南蛮
//2. Player 2 出杀
//3. Player 3 掉血, 触发技能(e.g.如遗计)
//4. Player 4 触发技能/装备(e.g.帷幕/藤甲)
//5. ...
//6. 直到南蛮结算完毕,进入下一个出牌
//结算中可能额外增加新的operation
//每个operation由GameManager发起, 其中WORKFLOW位置的牌将在结算完毕后进入弃牌堆
export default abstract class Flow {

    /**
     * 结算下一步
     * @param manager 
     * @returns true if this Flow is complete
     */
    public abstract async doNext(manager: GameManager): Promise<boolean>


}

export abstract class Operation<T> {

    /**
     * 结算下一步
     * @param manager 
     * @returns true if this Flow is complete
     */
    public abstract async perform(manager: GameManager): Promise<T>
}


export class PlayerDeadInHisRound{}