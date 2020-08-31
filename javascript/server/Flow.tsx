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

export abstract class UseEventOperation<T> extends Operation<T> {
    
    public timeline = Timeline.CHOOSING_TARGET
    public abort: boolean = false

    /**
     * 结算下一步
     * @param manager 
     * @returns true if this Flow is complete
     */
    public async perform(manager: GameManager): Promise<T> {
        await manager.events.publish(this)
        for(let t of [Timeline.USING, 
                        Timeline.CONFIRMING_TARGET, 
                        Timeline.BECOME_TARGET, 
                        Timeline.AFTER_CONFIRMING_TARGET, 
                        Timeline.AFTER_BECOMING_TARGET]) {
            this.timeline = t
            await manager.events.publish(this)
            if(this.abort) {
                return
            }
        }
        let res = await this.doPerform(manager)
        this.timeline = Timeline.COMPUTE_FINISH
        await manager.events.publish(this)
        return res
    }

    public abstract async doPerform(manager: GameManager): Promise<T>;
}

//https://gltjk.com/sanguosha/rules/flow/use.html
export enum Timeline {
    /**
     * 选择目标时
     * 该角色须声明使用的牌的牌名，同时为此牌选择合法目标，同时展示此牌对应的实体牌以确定此牌的所有牌面信息。
     */
    CHOOSING_TARGET,
    /**
     * 使用时
     */
    USING,
    /**
     * 指定目标时
     * 能发动的技能：【奋威】、【谮毁】。
     */     
    CONFIRMING_TARGET,
    /**
     * 成为目标时
     * 此牌的目标有可能改变或追加，即会产生新的目标
     * 【空城（国战）】、【享乐】、【流离】、【谦逊（国战）】、【帷幕（国战）】、【求援】、【求援（旧将）】、【千幻②】、【天命】。
     */
    BECOME_TARGET,
    /**
     * 指定目标后
     * 目标确定，不会再改变
     * 【咆哮②（阵）】、【铁骑】、【铁骑（阵）】、【烈弓】、【烈弓①（阵）】、【祸首②】、【激昂】、【鸟翔】、
     * 【无双①】、【无双②】、【肉林①】、【锋矢】、【谋溃】、【征服】。
     * b.装备技能：【青釭剑】、【雌雄双股剑】、【飞龙夺凤①】。
     */
    AFTER_CONFIRMING_TARGET,
    /**
     * 成为目标后
     * 能发动的技能/能执行的技能效果：
     * 【贞烈】、【啖酪】、【慷忾】、【协穆】摸牌的效果、【婉容】、【激昂】、【疑城】、【无双②】、【肉林②】。
     */
    AFTER_BECOMING_TARGET,
    /**
     * 结算完毕
     */
    COMPUTE_FINISH,
}

export class PlayerDeadInHisRound{}