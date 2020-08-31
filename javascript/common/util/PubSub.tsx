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

export interface EventRegistry {
    
    onGeneral<T>(type: Function, consumer: AckingConsumer<T>): void;
    offGeneral<T>(type: Function, consumer: AckingConsumer<T>): void;
    on<T>(type: Function, player: string, consumer: AckingConsumer<T>): void;
    off<T>(type: Function, player: string, consumer: AckingConsumer<T>): void;

}

export interface GameEventListener {
    /**
     * Invokes all listeners of this objects' type
     * Will invoke in the sequence of seating as predetermined by the sequencer
     * 
     * Return number of processed
     * @param obj 
     * @param from 
     */
    publish(obj: any): Promise<number>
}

export class CompositeListener implements GameEventListener {
    
    constructor(private delegates: Array<GameEventListener>) {}

    async publish(obj: any): Promise<number> {
        let count = 0
        for(let d of this.delegates) {
            count += await d.publish(obj)
        }
        return count
    }
}

export class SequenceAwarePubSub implements GameEventListener, EventRegistry {
    
    _map = new Map<Function, Map<string, ArrayList<AckingConsumer<any>>>>()
    _generalListeners = new Map<Function, ArrayList<AckingConsumer<any>>>()

    constructor(private sorter: (ids: string[]) => string[]) {

    }

    onGeneral<T>(type: Function, consumer: AckingConsumer<T>) {
        let cons = this._generalListeners.get(type) || new ArrayList<AckingConsumer<T>>()
        cons.add(consumer)
        this._generalListeners.set(type, cons)
    }

    offGeneral<T>(type: Function, consumer: AckingConsumer<T>) {
        let success = this._generalListeners.get(type).remove(consumer)
        if(!success) {
            throw `Did not find such consumer!! ${type} ${consumer.name}`
        }
    }

    on<T>(type: Function, player: string, consumer: AckingConsumer<T>) {
        let playerToConsumersMap: Map<string, ArrayList<AckingConsumer<T>>> = this._map.get(type) || new Map<string, ArrayList<AckingConsumer<T>>>()
        let playersConsumers = (playerToConsumersMap.get(player) || new ArrayList<AckingConsumer<T>>())
        playersConsumers.add(consumer)
        playerToConsumersMap.set(player, playersConsumers)
        this._map.set(type, playerToConsumersMap)
    }

    off<T>(type: Function, player: string, consumer: AckingConsumer<T>) {
        try {
            let success = this._map.get(type).get(player).remove(consumer)
            if(!success) {
                throw `Did not find such consumer!! ${type} ${player}`
            }
        } catch (err) {
            console.error('Failed to find ', type.name, player, consumer, err)
        }
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
        let count = 0
        let playerToConsumersMap: Map<string, ArrayList<AckingConsumer<void>>> = this._map.get(obj.constructor)
        let generalListeners = this._generalListeners.get(obj.constructor)
        if(generalListeners) {
            count += generalListeners.size()
            for(let l of generalListeners._data) {
                l(obj)
            }
        }

        if(!playerToConsumersMap) {
            // console.warn(`No one is listening to this message! ${obj.constructor.name}`)
            return count
        }
        for(let p of this.sorter(getKeys(playerToConsumersMap))) {
            if(!playerToConsumersMap.get(p)) {
                continue
            }
            count += playerToConsumersMap.get(p).size()
            await Promise.all(playerToConsumersMap.get(p)._data.map(c => c(obj)))
        }
        return count
    }
}