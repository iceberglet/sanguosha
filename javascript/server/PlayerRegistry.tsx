import {Player} from "../common/Player"
import {ServerHint, ServerHintTransit, HintType, Rescind} from "../common/ServerHint"

import * as WebSocket from 'ws';
import { Serde } from "../common/util/Serializer";
import { PlayerAction, PlayerActionTransit } from "../common/PlayerAction";
import Pubsub from "../common/util/PubSub";
import { SkillStatus } from "../common/Skill";
import { flattenMap } from "../common/util/Util";

export class ServerPlayer {
    player: Player
    connection: WebSocket
}

type ActionExpector = {
    player: string,
    hint: ServerHintTransit,
    callback: (transit: PlayerActionTransit)=>void
}

export type Sanitizer<F> = (t: F, playerId: string) => F

export class PlayerRegistry {
    private _byId = new Map<string, ServerPlayer>()
    private _byConnection = new Map<WebSocket, ServerPlayer>()
    private _currentExpectors = new Map<string, ActionExpector>()
    private _failedHint = new Map<string, ServerHintTransit>()
    private static hintCount = 0

    constructor(public pubsub: Pubsub, private allowed: number) {
        pubsub.on(PlayerActionTransit, this.onPlayerAction)
    }

    public add(player: Player, conn: WebSocket) {
        if(this._byId.has(player.id)) {
            throw `[Player Registry] 已经有名为 ${player.id} 的大侠登录本服务器了`
        }
        let p: ServerPlayer = new ServerPlayer()
        p.player = player
        p.connection = conn
        this._byId.set(player.id, p)
        this._byConnection.set(conn, p)
    }

    public onPlayerReconnected(player: string) {
        if(this._failedHint.get(player)) {
            console.log(`[Player Registry] Replay failed serverhint to player ${player}`)
            this.send(player, this._failedHint.get(player))
        }
    }

    public removePlayer(ws: WebSocket) {
        let p = this._byConnection.get(ws)
        if(p) {
            console.warn('[Player Registry] Player Dropped', p.player.id)
            this._byId.delete(p.player.id)
            //remove current expectations if it's on this player
            let exp = this._currentExpectors.get(p.player.id)
            if(exp) {
                console.warn('[Player Registry] 掉线的玩家尚有未完成的操作.加入replay list', p.player.id)
                this._failedHint.set(p.player.id, exp.hint)
            }
        } else {
            console.warn('[Player Registry] Unnamed Player Dropped')
        }
        this._byConnection.delete(ws)
        //note: we still keep this in _byId so that if player connects again, we get to keep previous records!
    }

    /**
     * Resend the server hint currently in place so as to pick up the latest roundhint
     */
    public reissue() {
        flattenMap(this._currentExpectors).forEach((kv)=>{
            this.send(kv[0], new Rescind())
            this.send(kv[0], kv[1].hint)
        })
    }

    public async sendServerAsk(player: string, hint: ServerHint): Promise<PlayerAction> {
        return new Promise((resolve, reject)=>{
            console.log('[Player Registry] 服务器发出操作请求:', player, HintType[hint.hintType])
            let hintId = PlayerRegistry.hintCount++

            let transit = new ServerHintTransit(hintId, player, hint)
            let expector = {
                player,
                hint: transit,
                callback: (transit: PlayerActionTransit) => {
                    try {
                        //when we hear back stuff
                        this.stopExpecting(expector)
                        if(transit.hintId === hintId) {
                            console.log('[Player Registry] 服务器获得玩家操作:', player)
                            resolve(transit.action)
                        } else {
                            console.error(`[Player Registry] 玩家的操作并未包含服务器所期待的hint ID! Expect: ${hintId}, Found: ${transit.hintId}`)
                            reject(`Not getting the same id back from request! Expect: ${hintId}, Found: ${transit.hintId}`)
                        }
                    } catch (err) {
                        console.error('Failure', err)
                    }
                }
            }

            this.startExpecting(expector)

            try {
                this.send(player, transit)
            } catch (err) {
                console.error('[Player Registry] Failed to send Server Ask. Registering the failure for resend', player)
                this._failedHint.set(player, transit)
            }
        })
    }

    public rescindAll() {
        //send such request to all players
        this.broadcast(new Rescind())
        this._currentExpectors.forEach(cb => this.stopExpecting(cb))
    }

    public send(id: string, obj: any) {
        this._byId.get(id).connection.send(Serde.serialize(obj))
    }

    public broadcast<F extends object>(obj: F, sanitizer: Sanitizer<F> = null) {
        this._byConnection.forEach((v, k) => {
            let toSend = obj
            if(sanitizer) {
                toSend = sanitizer(obj, v.player.id)
            }
            k.send(Serde.serialize(toSend))
        })
    }

    public getPlayerById(id: string): ServerPlayer {
        let p: ServerPlayer = this._byId.get(id)
        if(!p) {
            throw `Dunno this player! ${id}`
        }
        return p
    }

    private startExpecting=(expector: ActionExpector)=> {
        let currExp = this._currentExpectors.get(expector.player)
        if(currExp) {
            throw `[Player Registry] 服务器还在等待玩家的回复，无法发出新的操作请求 ${currExp.player}`
        } else {
            this._currentExpectors.set(expector.player, expector)
        }
    }

    private stopExpecting=(expector: ActionExpector)=> {
        let currExp = this._currentExpectors.get(expector.player)
        if(currExp !== expector) {
            throw `[Player Registry] 尝试移除期待但是服务器似乎正在期待该玩家其他的操作 ${expector.player}`
        } else {
            this._currentExpectors.delete(expector.player)
        }
    }

    private onPlayerAction=(transit: PlayerActionTransit)=> {
        let exp = this._currentExpectors.get(transit.action.actionSource)
        if(!exp) {
            console.error('[Player Registry] Not expecting any player action!', transit)
        } else {
            //clear out failures
            // console.log('[Player Registry] 服务器收到答复:', transit.action.source)
            this._failedHint.delete(transit.action.actionSource)
            exp.callback(transit)
        }
    }
}