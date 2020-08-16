export default class ArrayList<T> {

    public _data: T[] = []

    public add = (t: T) =>{
        this._data.push(t)
    }

    public addToFront(...t: T[]) {
        this._data = [...t, ...this._data]
    }

    public removeThat(filter: (t: T)=>boolean): boolean {
        let idx = this._data.findIndex(filter)
        if(idx < 0) {
            return false
        }
        this._data.splice(idx, 1)
        return true
    }

    public remove(t: T): boolean {
        return this.removeThat(tt => tt === t)
    }

    public get(idx: number): T {
        return this._data[idx]
    }

    public size(): number {
        return this._data.length
    }

    public clear() {
        this._data = []
    }

}