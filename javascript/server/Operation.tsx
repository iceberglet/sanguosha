import GameManager from "./GameManager";
import { PlayerInfo } from "../common/PlayerInfo";
import Card, { CardType } from "../common/cards/Card";


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

    constructor(public readonly targets: PlayerInfo[], public readonly whatIsThis: string) {
        super()
    }

    getTarget() {
        if(this.targets.length !== 1) {
            console.error('目标不唯一!!', this.targets)
            // return this.targets[0]
        }
        return this.targets[0]
    }

    hasTarget(t: string) {
        return this.targets.findIndex(tt => tt.player.id === t) > -1
    }

    removeTarget(target: string) {
        let idx = this.targets.findIndex(t => t.player.id === target)
        if(idx > -1) {
            this.targets.splice(idx, 1)
        } else {
            console.error('Failed to remove target', target, this)
        }
    }

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
        }
        if(this.targets.length === 0) {
            await this.onAborted(manager)
            return null
        } else {
            let res = await this.doPerform(manager)
            this.timeline = Timeline.COMPUTE_FINISH
            await manager.events.publish(this)
            return res
        }
    }

    public async onAborted(manager: GameManager): Promise<void> {
        //no-op by default
    }

    public abstract async doPerform(manager: GameManager): Promise<T>;
}

export abstract class RuseOp<T> extends UseEventOperation<T> {

    constructor(public readonly target: PlayerInfo,
                public readonly cards: Card[],
                public readonly ruseType: CardType) {
        super([target], ruseType.name)
    }
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