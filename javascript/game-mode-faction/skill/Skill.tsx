import GameManager from "../../server/GameManager";
import { PlayerAction } from "../../common/PlayerAction";
import { AckingConsumer } from "../../common/util/PubSub";
import { PlaySound } from "../../common/transit/EffectTransit";


export interface EventRegistryForSkills {
    on<T>(type: Function, skill: Skill<T>): void
    onEvent<T>(type: Function, player: string, consumer: AckingConsumer<T>): void
}

export class SkillStatus {

    /**
     * 技能ID
     */
    id: string

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
    
    public constructor(public readonly playerId: string) {}
}

/**
 * 一个技能的触发需要以下条件:
 * 1. 给定event + manager满足某种条件
 * 2. 技能不是disabled的
 * 3. 技能已经显示, 或者开启了预亮然后玩家同意显示
 * 4. 非锁定技需要提示玩家是否发动
 */
export abstract class Skill<T> extends SkillStatus {

    public constructor(public readonly playerId: string) {
        super(playerId)
    }

    public toStatus(): SkillStatus {
        let s = new SkillStatus(this.playerId)
        s.isRevealed = this.isRevealed
        s.isDisabled = this.isDisabled
        s.isForewarned = this.isForewarned
        s.id = this.id
        s.displayName = this.displayName
        return s
    }

    isMain: boolean
    /**
     * 是否是锁定技
     */
    isLocked: boolean = false

    description: string = '暂无 (Please override this field)'

    /**
     * load player action driver on client
     * e.g. 红牌当杀之类的
     */
    public bootstrapClient(): void {
        //no-op by default
    }

    public async onPlayerAction(act: PlayerAction, event: any, manager: GameManager): Promise<void> {
        throw 'Forgot to override me?'
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

    protected playSound(manager: GameManager, counts: number) {
        let random = Math.ceil(Math.random() * counts)
        if(random === 0) {
            random = 1
        }
        manager.broadcast(new PlaySound(`audio/skill/${this.id}${random}.mp3`))
    }


    /**
     * 进行必要的事件登记
     * @param manager 
     */
    public abstract hookup(skillRegistry: EventRegistryForSkills, manager: GameManager): void

    /**
     * Is this event condition met?
     * @param event 
     * @param manager 
     */
    protected abstract conditionFulfilled(event: T, manager: GameManager):boolean

    /**
     * 技能发动
     * @param event 事件 
     * @param manager GameManager
     */
    public abstract async doInvoke(event: T, manager: GameManager): Promise<void>

}