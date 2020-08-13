export default class ArrayList<T> {

    public _data: T[] = []

    public add(t: T) {
        this._data.push(t)
    }

    public addToFront(...t: T[]) {
        this._data = [...t, ...this._data]
    }

    public remove(t: T): boolean {
        //因为我们可能加入了新的flow, 所以需要搜回之前的flow
        let idx = this._data.findIndex(tt => tt === t)
        if(idx < 0) {
            return false
        }
        this._data.splice(idx, 1)
        return true
    }

    public get(idx: number): T {
        return this._data[idx]
    }

    public size(): number {
        return this._data.length
    }

}