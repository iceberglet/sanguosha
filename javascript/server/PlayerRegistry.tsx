import {Player} from "../common/Player"
import {ServerHint, ServerHintTransit} from "../common/ServerHint"

import * as WebSocket from 'ws';
import { Serde } from "../common/util/Serializer";
import { PlayerAction, PlayerActionTransit } from "../common/PlayerAction";
import Pubsub from "../common/util/PubSub";

export class Stats {
    rounds: number = 0
    wins: number = 0
    kill: number = 0
    death: number = 0

    totalDamage: number = 0
    totalHeal: number = 0
}

export class ServerPlayer {
    player: Player
    connection: WebSocket
}

type ActionExpector = {
    player: string,
    callback: (transit: PlayerActionTransit)=>void
}

export type Sanitizer<F> = (t: F, playerId: string) => F

export class PlayerRegistry {
    private _byId = new Map<string, ServerPlayer>()
    private _byConnection = new Map<WebSocket, ServerPlayer>()
    private _stats = new Map<string, Stats>()
    private _currentExpector: ActionExpector
    private static hintCount = 0

    constructor(pubsub: Pubsub) {
        pubsub.on(PlayerActionTransit, this.onPlayerAction)
    }

    public add(player: Player, conn: WebSocket) {
        if(this._byId.has(player.id)) {
            throw `已经有名为 ${player.id} 的大侠登录本服务器了`
        }
        let p: ServerPlayer = new ServerPlayer()
        p.player = player
        p.connection = conn
        this._byId.set(player.id, p)
        this._byConnection.set(conn, p)
        if(!this._stats.get(player.id)) {
            this._stats.set(player.id, new Stats())
        }
    }

    public removePlayer(ws: WebSocket) {
        let p = this._byConnection.get(ws)
        if(p) {
            console.warn('Player Dropped', p.player.id)
            this._byId.delete(p.player.id)
        } else {
            console.warn('Unnamed Player Dropped')
        }
        this._byConnection.delete(ws)
        //note: we still keep this in _byId so that if player connects again, we get to keep previous records!

        //remove current expectations if it's on this player
        if(this._currentExpector && this._currentExpector.player === p.player.id) {
            console.warn('玩家尚有待定操作.取消对此操作的期待', this._currentExpector.player)
            this.stopExpecting(this._currentExpector)
        }
    }

    public async sendServerAsk(player: string, hint: ServerHint): Promise<PlayerAction> {
        return new Promise((resolve, reject)=>{
            console.log('服务器发出操作请求:', player, hint)
            let hintId = PlayerRegistry.hintCount++

            let expector = {
                player,
                callback: (transit: PlayerActionTransit) => {
                    //when we hear back stuff
                    this.stopExpecting(expector)
                    if(transit.hintId === hintId) {
                        console.log('服务器获得玩家操作:', player, transit.action)
                        resolve(transit.action)
                    } else {
                        console.error(`玩家的操作并未包含服务器所期待的hint ID! Expect: ${hintId}, Found: ${transit.hintId}`)
                        reject(`Not getting the same id back from request! Expect: ${hintId}, Found: ${transit.hintId}`)
                    }
                }
            }
            

            this.startExpecting(expector)

            this.send(player, new ServerHintTransit(hintId, hint))
        })
    }

    public send(id: string, obj: any) {
        this._byId.get(id)?.connection?.send(Serde.serialize(obj))
    }

    public broadcast<F extends object, T extends object>(obj: F, sanitizer: Sanitizer<F> = null) {
        this._byConnection.forEach((v, k) => {
            if(sanitizer) {
                obj = sanitizer(obj, v.player.id)
            }
            k.send(Serde.serialize(obj))
        })
    }

    public getPlayerById(id: string): ServerPlayer {
        let p: ServerPlayer = this._byId.get(id)
        if(!p) {
            throw `Dunno this player! ${id}`
        }
        return p
    }

    public getStats(id: string): Stats {
        return this._stats.get(id)
    }

    private startExpecting=(expector: ActionExpector)=> {
        if(this._currentExpector) {
            throw `服务器还在等待玩家的回复，无法发出新的操作请求 ${this._currentExpector.player} ${expector.player}`
        }
        this._currentExpector = expector
    }

    private stopExpecting=(expector: ActionExpector)=> {
        if(expector !== this._currentExpector) {
            throw `尝试移除期待但是服务器似乎正在期待其他玩家的操作 ${this._currentExpector.player} ${expector.player}`
        }
        this._currentExpector = null
    }

    private onPlayerAction=(transit: PlayerActionTransit)=> {
        if(!this._currentExpector) {
            console.error('Not expecting any player action!', transit)
        } else {
            this._currentExpector.callback(transit)
        }
    }
}