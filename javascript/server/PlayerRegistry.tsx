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

type ActionExpector = (transit: PlayerActionTransit)=>void

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
    }

    public sendServerAsk(player: string, hint: ServerHint): Promise<PlayerAction> {
        return new Promise((resolve, reject)=>{
            console.log('服务器发出操作请求:', player, hint)
            let hintId = PlayerRegistry.hintCount++

            let expector = (transit: PlayerActionTransit) => {
                //when we hear back stuff
                this.stopExpecting(expector)
                if(transit.hintId === hintId) {
                    console.log('服务器获得玩家操作:', player, transit.action)
                    resolve(transit.action)
                } else {
                    reject(`Not getting the same id back from request! Expect: ${hintId}, Found: ${transit.hintId}`)
                }
            }

            this.startExpecting(expector)

            this.send(player, new ServerHintTransit(hintId, hint))
        })
    }

    public send(id: string, obj: any) {
        this._byId.get(id)?.connection?.send(Serde.serialize(obj))
    }

    public broadcast(obj: any) {
        for(let conn of this._byConnection.keys()) {
            conn.send(Serde.serialize(obj))
        }
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
            throw 'There is some existing expectation which is not yet done!'
        }
        this._currentExpector = expector
    }

    private stopExpecting=(expector: ActionExpector)=> {
        if(expector !== this._currentExpector) {
            throw 'Want to remove expector but it is not me which is in place!'
        }
        this._currentExpector = null
    }

    private onPlayerAction=(transit: PlayerActionTransit)=> {
        if(!this._currentExpector) {
            console.error('Not expecting any player action!', transit)
        } else {
            this._currentExpector(transit)
        }
    }
}