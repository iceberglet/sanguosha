class Serializer {

    _map = new Map<string, Function>()

    register(t: Function) {
        this._map.set(t.name, t)
    }

    deserialize(input: Payload): object {
        let type = input.type
        let construct : Function = this._map.get(type)
        if(!construct) {
            throw `Cannot find type: ${type}`
        }
        let obj = Reflect.construct(construct, [])
        Object.assign(obj, input.payload)
        return obj
    }

    serialize(input: object): Payload {
        return {
            payload: input,
            type: input.constructor.name
        }
    }

}

type Payload = {
    payload: object
    type: string
}

export const Serde = new Serializer()