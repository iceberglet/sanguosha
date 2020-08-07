
type Consumer<T> = (t: T) => void

export default class Pubsub {

    _map = new Map<Function, Consumer<any>>()

    on<T>(type: Function, consumer: Consumer<T>) {
        this._map.set(type, consumer)
    }

    publish(obj: any) {
        let con: Consumer<any> = this._map.get(obj.constructor)
        if(!con) {
            throw `No one is listening to this message! ${obj.constructor.name}`
        }
        con(obj)
    }

}