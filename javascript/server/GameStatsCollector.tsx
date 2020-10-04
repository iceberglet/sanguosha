import { Player } from "../common/Player";
import DeathOp, { DeathTimeline } from "./engine/DeathOp";
import { SequenceAwarePubSub } from "../common/util/PubSub";
import DamageOp, { DamageTimeline } from "./engine/DamageOp";
import HealOp, { HealTimeline } from "./engine/HealOp";


export default class GameStatsCollector {
    
    private readonly stats = new Map<string, OverallStats>()

    constructor(public players: Player[]){
        players.forEach(p => {
            this.stats.set(p.id, {
                playerId: p.id,
                wins: 0,
                kill: 0,
                totalDamage: 0,
                totalHeal: 0,
                thisRound: {
                    kill: 0,
                    totalDamage: 0,
                    totalHeal: 0,
                }
            })
        })
    }

    public subscribeTo(pubsub: SequenceAwarePubSub) {
        pubsub.onGeneral(DeathOp, this.onDeath)
        pubsub.onGeneral(DamageOp, this.onDamage)
        pubsub.onGeneral(HealOp, this.onHeal)
        console.log('[数据] 重置本局数据')
        this.stats.forEach(s => {
            s.thisRound = {
                kill: 0,
                totalDamage: 0,
                totalHeal: 0
            }
        })
    }

    public declareWinner(winners: string[]): GameStats {
        winners.forEach(w => {
            this.stats.get(w).wins += 1
        })
        let stats: OverallStats[] = []
        this.stats.forEach(s => {
            stats.push(s)
        })
        return new GameStats(winners, stats)
    }

    onDeath = async (deathOp: DeathOp) => {
        if(deathOp.killer && deathOp.timeline === DeathTimeline.BEFORE_REVEAL) {
            this.stats.get(deathOp.killer.player.id).thisRound.kill += 1
            this.stats.get(deathOp.killer.player.id).kill += 1
        }
    }

    onDamage = async (damageOp: DamageOp) => {
        if(damageOp.timeline === DamageTimeline.TAKEN_DAMAGE && damageOp.source) {
            this.stats.get(damageOp.source.player.id).thisRound.totalDamage += damageOp.amount
            this.stats.get(damageOp.source.player.id).totalDamage += damageOp.amount
        }
    }

    onHeal = async (healOp: HealOp) => {
        if(healOp.timeline === HealTimeline.AFTER && healOp.source) {
            this.stats.get(healOp.source.player.id).thisRound.totalHeal += healOp.amount
            this.stats.get(healOp.source.player.id).totalHeal += healOp.amount
        }
    }

}

export class GameStats {

    public constructor(public winners: string[], public stats: OverallStats[]){

    }

}

export type Stats = {
    kill: number
    totalDamage: number
    totalHeal: number
}

export type OverallStats = Stats & {
    playerId: string
    wins: number
    thisRound: Stats
}