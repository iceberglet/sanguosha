import GameManager from "../../server/GameManager";
import { AckingConsumer } from "../../common/util/PubSub";
import { PlaySound, TextFlashEffect } from "../../common/transit/EffectTransit";
import PlayerAct from "../../server/context/PlayerAct";
import { PlayerInfo } from "../../common/PlayerInfo";
import FactionPlayerInfo from "../FactionPlayerInfo";
import { RevealGeneralEvent } from "../FactionWarInitializer";
import GameClientContext from "../../client/GameClientContext";


export interface EventRegistryForSkills {
    on<T>(type: Function, skill: SkillTrigger<T>): void
    onEvent<T>(type: Function, player: string, consumer: AckingConsumer<T>): void
    onPlayerDead(playerId: string): void
}

//what action to do when clicked on while being hidden?
export enum HiddenType {
    FOREWARNABLE,
    REVEAL_IN_MY_USE_CARD,
    NONE
}

export class SkillStatus {

    /**
     * 技能ID
     */
    id: string

    /**
     * isMain?
     */
    isMain: boolean

    /**
     * 技能名称
     */
    displayName: string

    /**
     * 是否出于任何原因(穿心, 断肠, 铁骑)被disable了?
     */
    isDisabled: boolean = false

    /**
     * 相关将领是否已经展示了?
     */
    isRevealed: boolean = false
    
    /**
     * 没有示将的话,是否开启了预亮?
     */
    isForewarned: boolean = false

    /**
     * 没有明置武将时,点击按钮的效果为何?
     */
    hiddenType: HiddenType = HiddenType.FOREWARNABLE
    
    public constructor(public readonly playerId: string) {}
}

export function invocable<T>(trigger: SkillTrigger<T>, event: T, manager: GameManager) {
    let skill = trigger.getSkill()
    if(skill.isDisabled) {
        return false
    }
    if((skill.isRevealed || skill.isForewarned) && trigger.conditionFulfilled(event, manager)) {
        return true
    }
    return false
}

/**
 * Sent for subscription
 * 需要能知道主体Skill的状态
 * 适宜分别响应多种事件
 */
export interface SkillTrigger<T> {

    getSkill(): Skill

    invokeMsg(event: T, manager: GameManager): string

    /**
     * Is this event condition met?
     * @param event 
     * @param manager 
     */
    conditionFulfilled(event: T, manager: GameManager): boolean

    /**
     * 技能发动
     * @param event 事件 
     * @param manager GameManager
     */
    doInvoke(event: T, manager: GameManager): Promise<void>
}

export abstract class Skill extends SkillStatus {
    
    hiddenType: HiddenType = HiddenType.FOREWARNABLE
    /**
     * 是否是锁定技
     */
    isLocked: boolean = false

    /**
     * 主将技/副将技override
     */
    disabledForMain: boolean = false
    disabledForSub: boolean = false

    description: string = '暂无 (Please override this field)'

    public toStatus(): SkillStatus {
        let s = new SkillStatus(this.playerId)
        s.isRevealed = this.isRevealed
        s.isDisabled = this.isDisabled
        s.isForewarned = this.isForewarned
        s.id = this.id
        s.displayName = this.displayName
        s.hiddenType = this.hiddenType
        s.isMain = this.isMain
        return s
    }

    /**
     * load player action driver on client
     * e.g. 红牌当杀之类的
     */
    public bootstrapClient(context: GameClientContext, player: PlayerInfo): void {
        //no-op by default
    }

    /**
     * 进行必要的事件登记
     * @param manager 
     */
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager) {

    }

    public async onStatusUpdated(manager: GameManager): Promise<void> {
        //no-op by default
    }

    public onRemoval(skillRegistry: EventRegistryForSkills, manager: GameManager) {
        //还原马术?

    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager): Promise<void> {
        throw 'Forgot to override me?'
    }


    protected playSound(manager: GameManager, counts: number) {
        let random = Math.ceil(Math.random() * counts)
        if(random === 0) {
            random = 1
        }
        manager.broadcast(new PlaySound(`audio/skill/${this.id}${random}.mp3`))
    }

    public invokeEffects(manager: GameManager, targets: string[] = [], msg: string = `${this.playerId} 发动了 ${this.displayName}`) {
        this.playSound(manager, 2)
        manager.broadcast(new TextFlashEffect(this.playerId, targets, this.id))
        if(msg) {
            manager.log(msg)
        } else if(targets.length === 0) {
            manager.log(`${this.playerId} 发动了 ${this.displayName}`)
        } else {
            manager.log(`${this.playerId} 对 ${targets} 发动了 ${this.displayName}`)
        }
    }

    protected async revealMySelfIfNeeded(manager: GameManager) {
        if(!this.isRevealed) {
            console.log(`[${this.id}] 明置 ${this.playerId}`)
            await manager.events.publish(new RevealGeneralEvent(this.playerId, this.isMain, !this.isMain))
        }
    }
}

export abstract class SimpleTrigger<T> implements SkillTrigger<T> {
    protected player: PlayerInfo
    constructor(protected skill: Skill, manager: GameManager) {
        this.player = manager.context.getPlayer(skill.playerId)
    }

    abstract conditionFulfilled(event: T, manager: GameManager): boolean 
    abstract async doInvoke(event: T, manager: GameManager): Promise<void>

    getSkill(): Skill {
        return this.skill
    }
    invokeMsg(event: T, manager: GameManager): string {
        return '发动' + this.getSkill().displayName
    }
}

/**
 * 一个技能的触发需要以下条件:
 * 1. 给定event + manager满足某种条件
 * 2. 技能不是disabled的
 * 3. 技能已经显示, 或者开启了预亮然后玩家同意显示
 * 4. 非锁定技需要提示玩家是否发动
 */
export abstract class SimpleConditionalSkill<T> extends Skill implements SkillTrigger<T> {

    public getSkill() {
        return this
    }

    public invocable(event: T, manager: GameManager): boolean {
        if(this.isDisabled) {
            return false
        }
        if((this.isRevealed || this.isForewarned) && this.conditionFulfilled(event, manager)) {
            return true
        }
        return false
    }

    public invokeMsg(event: T, manager: GameManager) {
        return '发动' + this.displayName
    }

    /**
     * Is this event condition met?
     * @param event 
     * @param manager 
     */
    public conditionFulfilled(event: T, manager: GameManager): boolean {
        return false
    }

    /**
     * 技能发动
     * @param event 事件 
     * @param manager GameManager
     */
    public async doInvoke(event: T, manager: GameManager): Promise<void> {
        return
    }
}

/**
 * 技能事件:
 * 1. 主将技,副将技的选择 (done)
 * 
 * 2. 增加技能
 *      a. 姜维观星
 *      b. 游戏进行时, (暴凌)
 * 
 * 3. 改变其他技能: (姜维观星override主将技能)
 * 
 * 4. 失去技能 (断肠)
 * 
 * 5. 移除武将牌
 * 
 * 6. 减少阴阳鱼 (重新计算血量)
 */

 export class GeneralSkillStatusUpdate {

    public constructor(public reason: string,  //缘由: (断肠/铁骑)
                        public target: FactionPlayerInfo,  //对象
                        public isMain: boolean, //主将还是副将?
                        public enable: boolean, //是失效还是有效(恢复有效?)
                        public includeLocked: boolean = false //包含此武将的锁定技否?
                        ){}

    
 }