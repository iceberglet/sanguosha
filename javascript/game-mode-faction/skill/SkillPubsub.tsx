import Multimap from "../../common/util/Multimap"
import { EventRegistryForSkills, SkillTrigger, invocable } from "../../common/Skill"
import GameManager from "../../server/GameManager"
import { Button } from "../../common/PlayerAction"
import { HintType } from "../../common/ServerHint"
import { takeFromArray } from "../../common/util/Util"
import { RevealGeneralEvent } from "../FactionWarInitializer"
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

    //todo: need to be invoked last
    onPlayerDead(playerId: string) {
        this._map.forEach(v => v.removeAll(playerId))
    }

    on<T>(type: Function, trigger: SkillTrigger<T>) {
        let subMap = this._map.get(type) || new Multimap<string, SkillTrigger<any>>()
        if(subMap.contains(trigger.getSkill().playerId, trigger)) {
            throw `Already has this skill!! ${trigger.getSkill().playerId} ${trigger.getSkill().id}`
        }
        subMap.set(trigger.getSkill().playerId, trigger)
        this._map.set(type, subMap)
    }

    onEvent<T>(type: Function, player: string, consumer: AckingConsumer<T>) {
        if(type === StageEndFlow) {
            console.log('Stage End Subscribing!')
        }
        this._pubsub.on(type, player, consumer)
    }

    off<T>(type: Function, trigger: SkillTrigger<T>) {
        let subMap = this._map.get(type)
        if(!subMap) {
            return
        }
        let success = subMap.remove(trigger.getSkill().playerId, trigger)
        if(!success) {
            throw `Did not find such skill!! ${type} ${trigger.getSkill().id}`
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
            let skillTriggers = subMap.getArr(player)

            let choices: Array<[SkillTrigger<any>, Button]> = []
            for(let s of skillTriggers) {
                if(invocable(s, obj, this.manager)) {
                    let skill = s.getSkill()
                    if(skill.isRevealed && skill.isLocked) {
                        console.log('[技能驱动] 直接发动锁定技: ', skill.id)
                        await s.doInvoke(obj, this.manager)
                    } else {
                        console.log('[技能驱动] 可能可以发动: ', skill.id)
                        let invokeMsg = s.invokeMsg(obj, this.manager)
                        if(!skill.isRevealed) {
                            invokeMsg += `并明置${skill.position === 'main' ?'主将':'副将'}`
                        }
                        choices.push([s, new Button(skill.id, invokeMsg)])
                    }
                }
            }
            
            if(choices.length === 0) {
                continue
            }
            
            //在一个技能发动后最好确认剩下的技能依然可以发动,以免尴尬 (奋命拆掉了谋断的装备牌啥的)
            //小心一个技能使得另一个技能无法发动 (先渐营再死谏就囧了)
            
            choices.push([null, Button.CANCEL])
            let resp: PlayerAct
            while(choices.length > 1) {
                //不需要反复确认的技能可以直接请求继续发动
                choices = choices.filter(c => !c[0] || !c[0].needRepeatedCheck || invocable(c[0], obj, this.manager))
                
                //应该不可能存在多个skill triggerer的情况!
                let askWho = choices[0][0].getSkillTriggerer(obj, this.manager)

                resp = await this.manager.sendHint(askWho, {
                    hintType: HintType.MULTI_CHOICE,
                    hintMsg: '请选择发动技能或取消',
                    extraButtons: choices.map(c => c[1])
                })
                if(!resp.isCancel()) {
                    let skillId = resp.button
                    console.log('[技能驱动] 收到玩家指示发动: ', skillId)
                    let skill: SkillTrigger<any> = takeFromArray(skillTriggers, s => s.getSkill().id === skillId)
                    if(!skill) {
                        throw 'Failed to find skill! ' + skillId
                    }
                    if(!skill.getSkill().isRevealed) {
                        await this.manager.events.publish(new RevealGeneralEvent(player, skill.getSkill().position === 'main', skill.getSkill().position === 'sub'))
                    }
                    await skill.doInvoke(obj, this.manager)
                    count++
                    let removedButton = takeFromArray(choices, c => c[1].id === skillId)
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