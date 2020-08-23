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

    public removeAllThat(filter: (t: T)=>boolean): T[] {
        let idx: number = -1, res: T[] = []
        do {
            idx = this._data.findIndex(filter)
            if(idx > -1) {
                res.push(...this._data.splice(idx, 1))
            }
        } while(idx > -1)
        return res
    }

    public filter(callbackfn: (value: T, index: number, array: T[]) => boolean): T[] {
        return this._data.filter(callbackfn)
    }

    public forEach(callbackfn: (value: T, index: number, array: T[]) => void) {
        this._data.forEach(callbackfn)
    }

    public map<U>(callbackfn: (value: T, index: number, array: T[]) => U): U[] {
        return this._data.map(callbackfn)
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