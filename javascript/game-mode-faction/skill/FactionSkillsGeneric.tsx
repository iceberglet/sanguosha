import GameContext from "../../common/GameContext";
import { factionDiffers, factionsSame } from "../../common/General";
import { Skill } from "../../common/Skill";

export abstract class FormationSkill extends Skill {

    /**
     * 检测A和B是否相邻
     * @param a 
     * @param b 
     * @param context 
     */
    areNeighbor(a: string, b: string, context: GameContext) {
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
    areInFormation(a: string, b: string, context: GameContext) {
        let upCursor = context.cursor(a)
        let pA = upCursor.get()
        do{
            upCursor.up()
            if(upCursor.get().player.id === b) {
                return true
            }
        } while (factionsSame(upCursor.get().getFaction(), pA.getFaction()))
        
        let downCursor = context.cursor(a)
        let pB = downCursor.get()
        do{
            downCursor.down()
            if(downCursor.get().player.id === b) {
                return true
            }
        } while (factionsSame(downCursor.get().getFaction(), pB.getFaction()))
        return false
    }

    isSieged(a: string, context: GameContext) {
        let upCursor = context.cursor(a)
        let me = upCursor.get()
        let up = upCursor.up().get()
        let down = upCursor.down().down().get()
        if(factionsSame(up.getFaction(), down.getFaction()) && up !== down && factionDiffers(up.getFaction(), me.getFaction())) {
            return true
        }
        return false
    }
    
}