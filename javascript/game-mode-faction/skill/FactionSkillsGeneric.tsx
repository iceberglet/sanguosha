import PlayerActionDriverDefiner from "../../client/player-actions/PlayerActionDriverDefiner";
import { playerActionDriverProvider } from "../../client/player-actions/PlayerActionDriverProvider";
import GameContext from "../../common/GameContext";
import { factionDiffers, factionsSame } from "../../common/General";
import { PlayerInfo } from "../../common/PlayerInfo";
import { HintType } from "../../common/ServerHint";
import { EventRegistryForSkills, GeneralSkillStatusUpdate, Skill, SkillPosition, SkillRepo } from "../../common/Skill";
import DeathOp, { DeathTimeline } from "../../server/engine/DeathOp";
import GameManager from "../../server/GameManager";
import FactionPlayerInfo from "../FactionPlayerInfo";
import FactionWarGeneral from "../FactionWarGenerals";
import { RemoveGeneralEvent, RevealPlayerEvent } from "../FactionWarInitializer";


enum FormationType {
    SIEGE,
    LINE,
}
/**
 * 阵法召唤
A须满足下列五个条件，才能阵法召唤：
1、A有势力且不为野心家。
2、A有一张武将牌处于明置状态且此武将牌有阵法技。
3、除A外存在没有势力的角色。
4、与A势力相同的所有角色数小于玩家数的一半。
5、根据此阵法技的发动条件的不同，判断A能否阵法召唤的条件5也会不同：
（1）与围攻有关。
a、A的上家与A势力不同，且A的上家的上家没有势力。
b、A的下家与A势力不同，且A的下家的下家没有势力。
a和b满足其中一条，判断A能否阵法召唤的条件5即满足。
（2）与队列有关。
a、A按顺时针方向的路径至一名没有势力的角色，在路径上没有与A势力不同的角色。
b、A按逆时针方向的路径至一名没有势力的角色，在路径上没有与A势力不同的角色。
a和b满足其中一条，判断A能否阵法召唤的条件5即满足。
 */
// export abstract class FormationAwareSkill extends Skill {

//     /**
//      * Call back function when this skill should recompute formation conditions
//      * @param manager game manager
//      * @param repo skill repo
//      * @param enabled 是否满足条件? (场上至少四名玩家)
//      */
//     abstract async onFormationUpdate(manager: GameManager, repo: SkillRepo, enabled: boolean): Promise<void>

    
//     bootstrapClient() {
//         playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
//             return new PlayerActionDriverDefiner('阵法召唤')
//                     .expectAnyButton('')
//                     // .expectAnyButton('点击确定发动阵法召唤')
//                     .build(hint)
//         })
//     }

//     public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager, repo: SkillRepo): void {
//         skillRegistry.onEvent<DeathOp>(DeathOp, this.playerId, async(event)=>{
//             if(event.timeline === DeathTimeline.AFTER_REVEAL) {
//                 await this.onFormationUpdate(manager, repo, manager.getSortedByCurr(true).length >= 4)
//             }
//         })
//         skillRegistry.onEvent<RevealPlayerEvent>(RevealPlayerEvent, this.playerId, async(event)=>{
//             await this.onFormationUpdate(manager, repo, manager.getSortedByCurr(true).length >= 4)
//         })
//     }
// }

/**
 * 检测A和B是否相邻
 * @param a 
 * @param b 
 * @param context 
 */
export function areNeighbor(a: string, b: string, context: GameContext) {
    let aIdx = context.playerInfos.filter(p => !p.isDead).findIndex(p => p.player.id === a)
    let bIdx = context.playerInfos.filter(p => !p.isDead).findIndex(p => p.player.id === b)
    return Math.abs(aIdx - bIdx) === 1
}

/**
 * 检测A和B是否在同一队列内
 * @param a 
 * @param b 
 * @param context 
 */
export function areInFormation(a: string, b: string, context: GameContext) {
    if(a === b) {
        return false
    }
    let upCursor = context.cursor(a)
    let me = upCursor.get()
    let count = 0
    do{
        upCursor.up()
        if(upCursor.get().player.id === b) {
            return true
        }
        count++
    } while (factionsSame(upCursor.get().getFaction(), me.getFaction()) && count < 50)
    
    let downCursor = context.cursor(a)
    do{
        downCursor.down()
        if(downCursor.get().player.id === b) {
            return true
        }
        count++
    } while (factionsSame(downCursor.get().getFaction(), me.getFaction()) && count < 50)
    if(count >= 50) {
        console.error('Infinite Loop? ', a, b, context.playerInfos.map(p => [p.player.id, p.getFaction().name]))
    }
    return false
}


export type SiegeContext = {
    siegers: [string, string]
    victim: string
}
/**
 * 检查围攻关系
 * @param victim 
 * @param sieger 
 * @param context 
 */
export function getSiegeContext(victim: string, sieger: string, context: GameContext): SiegeContext {
    let upCursor = context.cursor(victim)
    let me = upCursor.get()
    let up = upCursor.up().get()
    let down = upCursor.down().down().get()
    if(sieger !== up.player.id && sieger !== down.player.id) {
        return null
    }
    if(factionsSame(up.getFaction(), down.getFaction()) && up !== down && factionDiffers(up.getFaction(), me.getFaction())) {
        return {
            siegers: [up.player.id, down.player.id],
            victim
        }
    }
    return null
}


export async function removeGeneral(manager: GameManager, skillRepo: SkillRepo, player: string, isMain: boolean) {
    let p = manager.context.getPlayer(player) as FactionPlayerInfo

    //take care of skills
    let skillPos: SkillPosition = isMain? 'main' : 'sub'
    for(let s of skillRepo.getSkills(p.player.id)) {
        if(s.position === skillPos) {
            s.isGone = true
            s.onRemoval(manager.context)
        }
    }
    //disable the abilities
    await manager.events.publish(new GeneralSkillStatusUpdate(this.displayName, p, skillPos, false, true))
    await manager.events.publish(new RemoveGeneralEvent(player, isMain))

    let currentGender = (isMain? p.general: p.subGeneral).gender
    let newGeneral = currentGender === 'M'? FactionWarGeneral.soldier_male : FactionWarGeneral.soldier_female
    //todo: remove skin fields
    if(isMain) {
        p.general = newGeneral
        p.isGeneralRevealed = true
    } else {
        p.subGeneral = newGeneral
        p.isSubGeneralRevealed = true
    }
    manager.broadcast(p as PlayerInfo, PlayerInfo.sanitize)
}