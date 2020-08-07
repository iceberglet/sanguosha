import LoginMessage from "../../server/Login"
import GameTransit from "../transit/GameTransit"
import { ServerHintTransit } from "../ServerHint"

class Serializer {

    _map = new Map<string, Function>()

    register(t: Function) {
        this._map.set(t.name, t)
    }

    deserialize(json: string): object {
        let input: Payload = JSON.parse(json)
        let type = input.type
        if(!type) {
            throw `[Serializer] Unable to find type from payload! ${json}`
        }
        let construct : Function = this._map.get(type)
        if(!construct) {
            throw `[Serializer] Cannot find registered type: ${type}`
        }
        let obj = Reflect.construct(construct, [])
        Object.assign(obj, input.payload)
        return obj
    }

    serialize(input: object): string {
        return JSON.stringify({
            payload: input,
            type: input.constructor.name
        })
    }

}

type Payload = {
    payload: object
    type: string
}

export const Serde = new Serializer()
Serde.register(Object)
Serde.register(LoginMessage)
Serde.register(GameTransit)
Serde.register(ServerHintTransit)