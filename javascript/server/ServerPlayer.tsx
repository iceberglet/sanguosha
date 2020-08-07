import {Player} from "../common/Player"

import * as WebSocket from 'ws';
import { Serde } from "../common/util/Serializer";

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

class PlayerRegistry {
    private _byId = new Map<string, ServerPlayer>()
    private _byConnection = new Map<WebSocket, ServerPlayer>()
    private _stats = new Map<string, Stats>()

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
}

export const playerRegistry = new PlayerRegistry()