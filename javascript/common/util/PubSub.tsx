import ArrayList from './ArrayList'
import { getKeys } from './Util'

type Consumer<T> = (t: T) => void
type AckingConsumer<T> = (t: T) => Promise<void>

export default class Pubsub {

    _map = new Map<Function, Consumer<any>[]>()

    on<T>(type: Function, consumer: Consumer<T>) {
        let con: Consumer<any>[] = this._map.get(type) || []
        con.push(consumer)
        this._map.set(type, con)
    }
    

    publish(obj: any) {
        let con: Consumer<any>[] = this._map.get(obj.constructor)
        if(!con) {
            throw `No one is listening to this message! ${obj.constructor.name}`
        }
        con.forEach(item => item(obj))
    }

}

export class SequenceAwarePubSub {
    
    _map = new Map<Function, Map<string, ArrayList<AckingConsumer<void>>>>()
    constructor(private sorter: (ids: string[]) => string[]) {

    }

    on<T>(type: Function, player: string, consumer: AckingConsumer<void>) {
        let playerToConsumersMap: Map<string, ArrayList<AckingConsumer<void>>> = this._map.get(type) || new Map<string, ArrayList<AckingConsumer<void>>>()
        let playersConsumers = (playerToConsumersMap.get(player) || new ArrayList<AckingConsumer<void>>())
        playersConsumers.add(consumer)
        playerToConsumersMap.set(player, playersConsumers)
        this._map.set(type, playerToConsumersMap)
    }

    off<T>(type: Function, player: string, consumer: AckingConsumer<void>) {
        this._map.get(type).get(player)?.remove(consumer)
    }

    /**
     * Invokes all listeners of this objects' type
     * Will invoke in the sequence of seating as predetermined by the sequencer
     * 
     * Return number of processed
     * @param obj 
     * @param from 
     */
    async publish(obj: any): Promise<number> {
        let playerToConsumersMap: Map<string, ArrayList<AckingConsumer<void>>> = this._map.get(obj.constructor)
        if(!playerToConsumersMap) {
            // console.warn(`No one is listening to this message! ${obj.constructor.name}`)
            return 0
        }
        let count = 0
        for(let p of this.sorter(getKeys(playerToConsumersMap))) {
            count += playerToConsumersMap.get(p).size()
            await Promise.all(playerToConsumersMap.get(p)._data.map(c => c(obj)))
        }
        return count
    }
}