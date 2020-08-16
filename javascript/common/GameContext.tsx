import { PlayerInfo } from "./PlayerInfo";
import { CardPos } from "./transit/CardPos";
import { GameModeEnum, GameMode } from "./GameMode";

/**
 * Contains current state of the game
 * All players' situations, card holdings, hp
 * Remaining Deck, dropped cards
 * 
 */
export default class GameContext {

    //------------- listeners -------------------
    constructor(public readonly playerInfos: PlayerInfo[], public readonly gameMode: GameModeEnum) {
    }


    getGameMode() {
        return GameMode.get(this.gameMode)
    }


    //todo: 马术？神曹操？公孙瓒？
    computeDistance(fromPlayer: string, toPlayer: string): number {
        if(fromPlayer === toPlayer) {
            return 0
        }
        let living = this.playerInfos.filter(p => !p.isDead)
        let from = living.findIndex(p => p.player.id === fromPlayer)
        let to = living.findIndex(p => p.player.id === toPlayer)
        if(from === -1 || to === -1) {
            throw `Can't find these two people, they are dead or don't exist! ${this.playerInfos}, ${fromPlayer}, ${toPlayer}`
        }
        let pFrom = living[from]
        let pTo = living[to]
        let delta = 0
        if(pFrom.findCardAt(CardPos.EQUIP, 'horse-1')) {
            delta -= 1
        }
        if(pTo.findCardAt(CardPos.EQUIP, 'horse+1')) {
            delta += 1
        }

        if(from <= to) {
            //we can go by left or go by right
            return Math.min(to - from, this.playerInfos.length - to + from) + delta
        } else {
            return Math.min(from - to, this.playerInfos.length - from + to) + delta
        }
    }

    /**
     * 根据当前玩家视角给出其余玩家的排序
     * 不包含死亡的玩家
     * @param playerId 
     * @param inclusive 是否包含当前玩家. 默认false
     */
    getRingFromPerspective(playerId: string, inclusive: boolean = false, deadAlso: boolean = false): PlayerInfo[] {
        let idx = this.playerInfos.findIndex(p => p.player.id === playerId)
        return [...this.playerInfos.slice(inclusive? idx : idx + 1), ...this.playerInfos.slice(0, idx)].filter(p => deadAlso || !p.isDead)
    }

    /**
     * 根据当前玩家视角排序,用以决定结算顺序
     * 不包含死亡的玩家
     * @param playerId 当前玩家ID
     * @param ids 需要排序的玩家, 可以包含playerId
     */
    sortFromPerspective(playerId: string, ids: string[]): PlayerInfo[] {
        return this.getRingFromPerspective(playerId, true).filter(info => ids.indexOf(info.player.id) >= 0)
    }

    getPlayer(id: string): PlayerInfo {
        let p = this.playerInfos.find(p => p.player.id === id)
        if(!p) {
            throw `Player Not Found!! ${id}. Available: ${this.playerInfos.map(p => p.player.id)}`
        }
        return p
    }

    sanitize(sendTo: string) {
        return new GameContext(this.playerInfos.map(p => PlayerInfo.sanitize(p, sendTo)), this.gameMode)
    }
}
