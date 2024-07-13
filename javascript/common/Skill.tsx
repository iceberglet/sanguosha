import GameManager from "../server/GameManager";
import { AckingConsumer } from "./util/PubSub";
import { PlaySound, TextFlashEffect } from "./transit/EffectTransit";
import PlayerAct from "../server/context/PlayerAct";
import { Mark, PlayerInfo } from "./PlayerInfo";
import {FactionPlayerInfo}from "../game-mode-faction/FactionPlayerInfo";
import { RevealGeneralEvent } from "../game-mode-faction/FactionWarInitializer";
import GameClientContext from "../client/GameClientContext";
import {GameContext} from "./GameContext";


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

export type SkillPosition = 'main' | 'sub' | 'player'

export class SkillStatus {

    /**
     * 技能ID
     */
    id: string

    /**
     * isMain?
     */
    position: SkillPosition = 'sub'

    /**
     * 是否要删除此skill? (用于UI)
     */
    isGone: boolean

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

    /**
     * 是否需要重复确认技能的发动条件
     * 默认需要
     * 在多个技能同时满足发动条件时可能先发动的技能会破坏后发动的技能发动的条件
     */
    needRepeatedCheck: boolean

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

    /**
     * 技能发动找谁问?
     * @param event 事件 
     * @param manager GameManager
     */
    getSkillTriggerer(event: T, manager: GameManager): string;
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
    hint: string = '暂无提示 (Please override this field)'
    counter: string = '暂无弱点 (Please override this field)'

    public toStatus(): SkillStatus {
        let s = new SkillStatus(this.playerId)
        s.isRevealed = this.isRevealed
        s.isDisabled = this.isDisabled
        s.isForewarned = this.isForewarned
        s.id = this.id
        s.displayName = this.displayName
        s.hiddenType = this.hiddenType
        s.position = this.position
        s.isGone = this.isGone
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
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager, repo: SkillRepo) {

    }

    public async onStatusUpdated(manager: GameManager, repo: SkillRepo): Promise<void> {
        //no-op by default
    }

    /**
     * UI level on removal
     * @param context 
     */
    public onRemoval(context: GameContext) {
        //还原马术?
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager): Promise<void> {
        throw 'Forgot to override me?'
    }

    public isInactive(): boolean {
        return this.isDisabled || !this.isRevealed || this.isGone
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
            await manager.events.publish(new RevealGeneralEvent(this.playerId, this.position === 'main', this.position === 'sub'))
        }
    }
}

export abstract class SimpleTrigger<T> implements SkillTrigger<T> {
    protected player: PlayerInfo
    needRepeatedCheck = true
    constructor(protected skill: Skill, manager: GameManager) {
        this.player = manager.context.getPlayer(skill.playerId)
    }

    abstract conditionFulfilled(event: T, manager: GameManager): boolean 
    abstract doInvoke(event: T, manager: GameManager): Promise<void>

    getSkill(): Skill {
        return this.skill
    }
    invokeMsg(event: T, manager: GameManager): string {
        return '发动' + this.getSkill().displayName
    }

    getSkillTriggerer(event: T, manager: GameManager): string {
        return this.player.player.id
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

    needRepeatedCheck = true

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

    public getSkillTriggerer(event: T, manager: GameManager): string {
        return this.playerId
    }
}

export interface SkillRepo {
    addSkill(p: string, skill: Skill): void
    getSkill(pid: string, skillId: string): Skill
    getSkills(pid: string): Set<Skill>
    changeSkillDisabledness(s: Skill, enable: boolean, reason: string, marks?: Mark): Promise<void>
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
                        public position: SkillPosition, //主将还是副将?
                        public enable: boolean, //是失效还是有效(恢复有效?)
                        public includeLocked: boolean = false //包含此武将的锁定技否?
                        ){}

    
 }