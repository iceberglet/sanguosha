import LoginMessage from "../../server/Login"
import { ServerHintTransit, Rescind } from "../ServerHint"
import { PlayerActionTransit, Button } from "../PlayerAction"
import GameContext from "../GameContext"
import { PlayerInfo, Identity } from "../PlayerInfo"
import Card, { CardType, CardSize } from "../cards/Card"
import { General, Faction } from "../General"
import IdentityWarGeneral, { Package } from "../../game-mode-identity/IdentityWarGenerals"
import IdentityWarPlayerInfo from "../../game-mode-identity/IdentityWarPlayerInfo"
import FactionWarGeneral from "../../game-mode-faction/FactionWarGenerals"
import FactionPlayerInfo from "../../game-mode-faction/FactionPlayerInfo"
import { Stage } from "../Stage"
import { TextFlashEffect, DamageEffect, CardTransit, CurrentPlayerEffect, PlaySound, LogTransit, SkinRequest } from '../transit/EffectTransit';
import { FWCard } from "../../game-mode-faction/FactionWarCardSet"
import RoundStat from "../RoundStat"
import { CustomUIData } from "../../client/card-panel/CustomUIRegistry"
import { GameStats } from "../../server/GameStatsCollector"
import { PlayerPrepChoice, Circus } from '../../game-mode-faction/FactionWarGameHoster'
import { SkillStatus } from "../Skill"
import Multimap from "./Multimap"
import { CardMovementEvent, CardPosChangeEvent, CardRearrangeRequest } from "../transit/CardPos"


export type Payload = {
    _type: string,
    payload: any
}

export interface CustomSerde<T> {
    //from this object to json-worthy stuff
    inflate(obj: T, delegate: (input: object) => Payload | object): Payload
    //from pure json-typed object to actually classed stuff
    deflate(obj: any, delegate: (input: any)=>object): T
}

class Serializer {

    _map = new Map<string, Function>()
    _customByName = new Map<string, CustomSerde<any>>()

    register<T>(t: Function, customSerde: CustomSerde<T> = null) {
        if(customSerde) {
            this._customByName.set(t.name, customSerde)
        } else {
            this._map.set(t.name, t)
        }
    }

    /**
     * @param json of an object or of a raw type
     */
    deserialize(json: string): any {
        return this.deflateObject(JSON.parse(json))
    }

    /**
     * 
     * @param input an object or raw type
     */
    serialize(input: object): string {
        return JSON.stringify(this.inflateObject(input))
    }

    private deflateObject = (input: any): object => {
        try {
            if (!input || this.isRaw(input)) {
                return input
            }
            let _type = input._type
            if(!_type || !input.payload) {
                throw `[Serializer] Unable to find type from payload! ${input}`
            }

            if(this._customByName.has(_type)) {
                return this._customByName.get(_type).deflate(input.payload, this.deflateObject)
            }

            let construct : Function = this._map.get(_type)
            if(!construct) {
                throw `[Serializer] Cannot find registered type: ${_type}`
            }
            let obj = Reflect.construct(construct, [])
            Object.keys(input.payload).forEach((k)=>{
                // the value is already parsed into objects.
                // @ts-ignore
                let v: any = input.payload[k]
                if(this.isRaw(v)) {
                    obj[k] = v
                } else {
                    obj[k] = this.deflateObject(v)
                }
            })
            // Object.assign(obj, input.payload)
            return obj
        } catch (err) {
            let error = {
                msg: 'Cannot deserialize', err,
                rawInput: input, 
                input: JSON.stringify(input)
            }
            console.error(error, err)
            throw error
        }
    }

    private inflateObject = (input: object): Payload | object => {
        if(this.isRaw(input)) {
            //raw type, just put it in
            return input
        }
        if(!input) {
            throw `WTF? ${input}`
        }

        if(this._customByName.has(input.constructor.name)) {
            return this._customByName.get(input.constructor.name).inflate(input, this.inflateObject)
        }

        let res: {[key: string] : any} = {}
        Object.keys(input).forEach(k => {
            // @ts-ignore
            let v: any = input[k]
            if(v instanceof Function || v instanceof Object) {
                if(v.constructor.name !== 'Function') {
                    //this is a class, we will expand it
                    res[k] = this.inflateObject(v)
                } else {
                    //ignore this as it is really a function
                }
            } else if (v instanceof Array) {
                res[k] = v.map(vv => this.inflateObject(vv))
            } else {
                res[k] = v
            }
        })
        return {
            payload: res,
            _type: input.constructor.name
        }
    }

    private isRaw(item : any) {
        return typeof(item) !== 'object'
    }
}




export const Serde = new Serializer()
Serde.register(Object)

Serde.register(TextFlashEffect)
Serde.register(DamageEffect)
Serde.register(CardTransit)
Serde.register(CurrentPlayerEffect)
Serde.register(LoginMessage)
Serde.register(ServerHintTransit)
Serde.register(PlayerActionTransit)
Serde.register(GameContext)
Serde.register(PlayerInfo)
Serde.register(CardType)
Serde.register(Card)
Serde.register(CardRearrangeRequest)
Serde.register(CardMovementEvent)
Serde.register(FWCard)
Serde.register(CardSize)
Serde.register(IdentityWarGeneral)
Serde.register(IdentityWarPlayerInfo)
Serde.register(FactionWarGeneral)
Serde.register(FactionPlayerInfo)
Serde.register(General)
Serde.register(Package)
Serde.register(Faction)
Serde.register(Identity)
Serde.register(Rescind)
Serde.register(CustomUIData)
Serde.register(RoundStat)
Serde.register(SkinRequest)
Serde.register(Multimap)
Serde.register(Button)
Serde.register(Stage)
Serde.register(LogTransit)
Serde.register(Map, {
    inflate<K, V>(map: Map<K, V>, delegate: any) {
        let res: Array<[K, V]> = []
        map.forEach((v, k) => {
            res.push([delegate(k), delegate(v)])
        })
        return {
            _type: Map.name,
            payload: res
        }
    },
    
    deflate<K, V>(arr: Array<[K, V]>, delegate: any): Map<K, V> {
        let map = new Map<K, V>()
        arr.forEach(a => map.set(delegate(a[0]), delegate(a[1])))
        return map
    }
})
Serde.register(Set, {
    inflate<T>(set: Set<T>, delegate: any) {
        let res: any[] = []
        set.forEach(s => res.push(delegate(s)))
        return {
            _type: Set.name,
            payload: res
        }
    },
    deflate<T>(obj: Array<any>, delegate: any): Set<T> {
        return new Set<T>(obj.map(o => delegate(o)))
    }
})
Serde.register(Array, {
    inflate(arr: Array<any>, delegate: any) {
        return {
            _type: Array.name,
            payload: arr.map(a => delegate(a))
        }
    },
    deflate(obj: any, delegate: any) {
        return obj.map(delegate)
    }
})
Serde.register(GameStats)
Serde.register(PlayerPrepChoice)
Serde.register(Circus)
Serde.register(CardPosChangeEvent)
Serde.register(SkillStatus)
Serde.register(PlaySound)