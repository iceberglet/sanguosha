import { PlayerInfo } from "./PlayerInfo";
import { CardPos, isCardPosHidden } from "./transit/CardPos";
import Card from "./cards/Card";
import { GameModeEnum } from "./GameModeEnum";
import { ICard } from "./cards/ICard";
import Multimap from "./util/Multimap";

export type Interpreter = (c: ICard) => ICard
/**
 * Contains current state of the game
 * All players' situations, card holdings, hp
 * Remaining Deck, dropped cards
 * 
 */
export default class GameContext {

    private interpreters = new Multimap<string, Interpreter>()

    //------------- listeners -------------------
    constructor(public readonly playerInfos: PlayerInfo[], public readonly gameMode: GameModeEnum) {
    }    

    interpretCard(player: string, icard: ICard): ICard {
        this.interpreters.get(player).forEach(interpreter => icard = interpreter(icard))
        return icard
    }

    registerInterpreter(player: string, interpreter: Interpreter) {
        this.interpreters.set(player, interpreter)
    }

    /**
     * 找出离你距离最近的角色. 不包括自己
     * @param player 
     */
    findingNearestNeighbors(player: string): PlayerInfo[] {
        let min = Infinity, targets: PlayerInfo[] = []
        this.playerInfos.forEach(p => {
            if(p.player.id === player || p.isDead) {
                return
            }
            let dist = this.computeDistance(player, p.player.id)
            if(dist < min) {
                min = dist
                targets = [p]
            } else if (dist === min) {
                targets.push(p)
            }
        })
        return targets
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
        let delta = pFrom.distanceModTargetingOthers + pTo.distanceModTargetingMe
        if(pFrom.findCardAt(CardPos.EQUIP, 'horse-1')) {
            delta -= 1
        }
        if(pTo.findCardAt(CardPos.EQUIP, 'horse+1')) {
            delta += 1
        }

        if(from <= to) {
            //we can go by left or go by right
            return Math.max(1, Math.min(to - from, living.length - to + from) + delta)
        } else {
            return Math.max(1, Math.min(from - to, living.length - from + to) + delta)
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

    getPlayer = (id: string): PlayerInfo => {
        let p = this.playerInfos.find(p => p.player.id === id)
        if(!p) {
            throw `Player Not Found!! ${id}. Available: ${this.playerInfos.map(p => p.player.id)}`
        }
        return p
    }

    sanitize(sendTo: string) {
        return new GameContext(this.playerInfos.map(p => {
            let copy = PlayerInfo.sanitize(p, sendTo)
            //restore the cards
            if(sendTo === p.player.id) {
                copy.cards = p.cards
            } else {
                let cards = new Map<CardPos, Card[]>()
                p.cards.forEach((v, k, m) => cards.set(k, v.map((c, i) => {
                    if(isCardPosHidden(k)) {
                        return Card.DUMMY
                    }
                    return c
                })))
                copy.cards = cards
            }
            return copy
        }), this.gameMode)
    }
}
