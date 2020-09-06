

class Describer {

    _map = new Map<string, string>()

    get(key: string) {
        return this._map.get(key)
    }

    register(key: string, value: string) {
        if(this._map.has(key)) {
            console.warn(`Already has key ${key}`)
            return
        }
        this._map.set(key, value)
    }

}

export const describer = new Describer()