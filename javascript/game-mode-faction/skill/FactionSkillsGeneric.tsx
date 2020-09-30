import GameContext from "../../common/GameContext";
import { factionDiffers, factionsSame } from "../../common/General";
import { Skill } from "../../common/Skill";


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

export function isSieged(a: string, context: GameContext) {
    let upCursor = context.cursor(a)
    let me = upCursor.get()
    let up = upCursor.up().get()
    let down = upCursor.down().down().get()
    if(factionsSame(up.getFaction(), down.getFaction()) && up !== down && factionDiffers(up.getFaction(), me.getFaction())) {
        return true
    }
    return false
}