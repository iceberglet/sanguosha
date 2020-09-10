import Multimap from "../../common/util/Multimap"
import { SimpleConditionalSkill, EventRegistryForSkills, SkillTrigger } from "./Skill"
import GameManager from "../../server/GameManager"
import { Button, UIPosition } from "../../common/PlayerAction"
import { HintType } from "../../common/ServerHint"
import { takeFromArray } from "../../common/util/Util"
import { RevealEvent } from "../FactionWarInitializer"
import { GameEventListener, SequenceAwarePubSub, AckingConsumer } from "../../common/util/PubSub"
import { StageEndFlow } from "../../server/engine/StageFlows"
import PlayerAct from "../../server/context/PlayerAct"


/**
 * 事件种类 -> 技能(包含了玩家,触发条件,是否enable的信息)
 */
export class SequenceAwareSkillPubSub implements EventRegistryForSkills, GameEventListener {
    
    _map = new Map<Function, Multimap<string, SkillTrigger<any>>>()
    _pubsub: SequenceAwarePubSub

    constructor(private manager: GameManager, private sorter: (ids: string[]) => string[]) {
        this._pubsub = new SequenceAwarePubSub(sorter)
    }

    on<T>(type: Function, skill: SimpleConditionalSkill<T>) {
        let subMap = this._map.get(type) || new Multimap<string, SimpleConditionalSkill<any>>()
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

    off<T>(type: Function, skill: SimpleConditionalSkill<T>) {
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
            
            console.log('[技能驱动] 找到可发动的技能: ', skills.map(s => s.getSkill().id))
            let choices: Button[] = []
            for(let s of skills) {
                let skill = s.getSkill()
                //将明置 & 锁定技 -> 直接触发
                //将明置 & 非锁定技 -> 询问
                //将暗置 & 锁定/非锁定 -> 询问
                if(skill.isRevealed && skill.isLocked) {
                    console.log('[技能驱动] 直接发动锁定技: ', skill.id)
                    await s.doInvoke(obj, this.manager)
                } else {
                    console.log('[技能驱动] 可能可以发动: ', skill.id)
                    let invokeMsg = s.invokeMsg(obj, this.manager)
                    if(!skill.isRevealed) {
                        invokeMsg += `并明置${skill.isMain?'主将':'副将'}`
                    }
                    choices.push(new Button(skill.id, invokeMsg))
                }
            }
            
            choices.push(Button.CANCEL)
            let resp: PlayerAct
            while(choices.length > 1) {
                resp = await this.manager.sendHint(player, {
                    hintType: HintType.MULTI_CHOICE,
                    hintMsg: '请选择发动技能或取消',
                    extraButtons: choices
                })
                if(!resp.isCancel()) {
                    let skillId = resp.button
                    console.log('[技能驱动] 收到玩家指示发动: ', skillId)
                    let skill: SkillTrigger<any> = takeFromArray(skills, s => s.getSkill().id === skillId)
                    if(!skill) {
                        throw 'Failed to find skill! ' + skillId
                    }
                    if(!skill.getSkill().isRevealed) {
                        await this.manager.events.publish(new RevealEvent(player, skill.getSkill().isMain, !skill.getSkill().isMain))
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