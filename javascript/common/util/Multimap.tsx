import { flattenMap } from "./Util"

export default class Multimap<K, V> {

    private _map = new Map<K, Set<V>>()

    removeAll(k: K): boolean {
        return this._map.delete(k)
    }

    remove(k: K, v: V) : boolean {
        let vs = this.get(k)
        return vs.delete(v)
    }

    containsKey(k: K) {
        return this.get(k).size > 0
    }
    
    contains(k: K, v: V) {
        return this.get(k).has(v)
    }

    set(k: K, v: V) {
        let set = this._map.get(k) || new Set<V>()
        set.add(v)
        this._map.set(k, set)
    }

    get(k: K): Set<V> {
        return this._map.get(k) || new Set<V>()
    }

    getArr(k: K): V[] {
        return toArray(this.get(k))
    }

    keys(): K[] {
        return flattenMap(this._map).map(kv=>kv[0])
    }
}


export class Pairs {
    private sortedMultimap = new Multimap<string, string>()

    public isPaired(a: string, b: string) {
        if(a < b) {
            return this.sortedMultimap.contains(a, b)
        } else {
            return this.sortedMultimap.contains(b, a)
        }
    }

    public registerPair(a: string, b: string) {
        if(a < b) {
            this.sortedMultimap.set(a, b)
        } else {
            this.sortedMultimap.set(b, a)
        }
    }
}

export function toArray<K>(set: Set<K>): K[] {
    let res: K[] = []
    set.forEach(v => res.push(v))
    return res
}