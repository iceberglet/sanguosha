import Multimap from "../../common/util/Multimap"
import { Skill, EventRegistryForSkills } from "./Skill"
import GameManager from "../../server/GameManager"
import { Button, PlayerAction, isCancel, getFromAction, UIPosition } from "../../common/PlayerAction"
import { HintType } from "../../common/ServerHint"
import { takeFromArray } from "../../common/util/Util"
import { RevealEvent } from "../FactionWarInitializer"
import { GameEventListener, SequenceAwarePubSub, AckingConsumer } from "../../common/util/PubSub"
import { StageEndFlow } from "../../server/engine/StageFlows"
import JudgeOp from "../../server/engine/JudgeOp"


/**
 * 事件种类 -> 技能(包含了玩家,触发条件,是否enable的信息)
 */
export class SequenceAwareSkillPubSub implements EventRegistryForSkills, GameEventListener {
    
    _map = new Map<Function, Multimap<string, Skill<any>>>()
    _pubsub: SequenceAwarePubSub

    constructor(private manager: GameManager, private sorter: (ids: string[]) => string[]) {
        this._pubsub = new SequenceAwarePubSub(sorter)
    }

    on<T>(type: Function, skill: Skill<T>) {
        let subMap = this._map.get(type) || new Multimap<string, Skill<any>>()
        if(subMap.contains(skill.playerId, skill)) {
            throw `Already has this skill!! ${skill.playerId} ${skill.id}`
        }
        subMap.set(skill.playerId, skill)
        this._map.set(type, subMap)
    }

    onEvent<T>(type: Function, player: string, consumer: AckingConsumer<T>) {
        if(type === StageEndFlow) {
            console.log('Stage End Subscribing!')
        }
        this._pubsub.on(type, player, consumer)
    }

    off<T>(type: Function, skill: Skill<T>) {
        let subMap = this._map.get(type)
        if(!subMap) {
            return
        }
        let success = subMap.remove(skill.playerId, skill)
        if(!success) {
            throw `Did not find such skill!! ${type} ${skill.id}`
        }
    }

    /**
     * Invokes all listeners of this objects' type
     * Will invoke in the sequence of seating as predetermined by the sequencer
     * 
     * Return number of processed
     * @param obj 
     * @param from 
     */
    async publish(obj: any): Promise<number> {
        let count = 0
        let subMap = this._map.get(obj.constructor)

        count += await this._pubsub.publish(obj)

        if(!subMap) {
            return
        }
        
        let sortedPlayers = this.sorter(subMap.keys())

        for(let player of sortedPlayers) {
            let skills = subMap.getArr(player)
                .filter(skill => skill.invocable(obj, this.manager))
            
            if(skills.length === 0) {
                continue
            }
            
            console.log('[技能驱动] 找到可发动的技能: ', skills.map(s => s.id))
            let choices: Button[] = []
            for(let s of skills) {
                //将明置 & 锁定技 -> 直接触发
                //将明置 & 非锁定技 -> 询问
                //将暗置 & 锁定/非锁定 -> 询问
                if(s.isRevealed && s.isLocked) {
                    console.log('[技能驱动] 直接发动锁定技: ', s.id)
                    await s.doInvoke(obj, this.manager)
                } else {
                    console.log('[技能驱动] 可能可以发动: ', s.id)
                    choices.push(new Button(s.id, s.isRevealed? `发动${s.id}` : `发动${s.id}并明置${s.isMain?'主将':'副将'}`))
                }
            }
            
            choices.push(Button.CANCEL)
            let resp: PlayerAction
            while(choices.length > 1) {
                resp = await this.manager.sendHint(player, {
                    hintType: HintType.MULTI_CHOICE,
                    hintMsg: '请选择发动技能或取消',
                    extraButtons: choices
                })
                if(!isCancel(resp)) {
                    let skillId = getFromAction(resp, UIPosition.BUTTONS)[0]
                    console.log('[技能驱动] 收到玩家指示发动: ', skillId)
                    let skill: Skill<any> = takeFromArray(skills, s => s.id === skillId)
                    if(!skill) {
                        throw 'Failed to find skill! ' + skillId
                    }
                    if(!skill.isRevealed) {
                        await this.manager.events.publish(new RevealEvent(player, skill.isMain, !skill.isMain))
                    }
                    await skill.doInvoke(obj, this.manager)
                    count++
                    let removedButton = takeFromArray(choices, c => c.id === skillId)
                    if(!removedButton) {
                        throw 'Failed to remove button! ' + skillId
                    }
                } else {
                    console.log('[技能驱动] 玩家放弃发动技能')
                    break
                }
            }
        }

        return count
    }
}