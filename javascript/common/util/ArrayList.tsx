export default class ArrayList<T> {

    private _data: T[] = []

    public add(t: T) {
        this._data.push(t)
    }

    public addToFront(...t: T[]) {
        this._data = [...t, ...this._data]
    }

    public remove(t: T) {
        //因为我们可能加入了新的flow, 所以需要搜回之前的flow
        let idx = this._data.findIndex(tt => tt === t)
        if(idx < 0) {
            throw `Impossible!`
        }
        this._data.splice(idx, 1)
    }

    public get(idx: number): T {
        return this._data[idx]
    }

    public size(): number {
        return this._data.length
    }

}