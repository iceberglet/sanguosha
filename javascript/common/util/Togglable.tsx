

export class ClassFormatter {
    public constructor(private clazz: string = '') {

    }

    public and(cond: boolean, clazz: string): ClassFormatter {
        if(cond) {
            this.clazz += ' ' + clazz
        }
        return this
    }

    public done() {
        return this.clazz
    }
}

export default class Togglable<T> {
    private items: Set<T> = new Set<T>()
    private itemArray: T[] = []

    public constructor(private maxSize: number) {
        
    }

    public has(t: T): boolean {
        return this.items.has(t)
    }

    public isFull() {
        return this.maxSize > this.size()
    }

    public size(): number {
        return this.items.size
    }

    public toggle(item: T) {
        if(this.items.has(item)) {
            this.items.delete(item)
            let idx = this.itemArray.findIndex(t => t === item)
            this.itemArray.splice(idx, 1)
        } else if (this.items.size < this.maxSize) {
            this.items.add(item)
            this.itemArray.push(item)
        }
    }

    public clear() {
        this.items.clear()
        this.itemArray = []
    }

    public toArray(): T[] {
        return this.itemArray
    }

    public isEmpty() {
        return this.items.size === 0
    }
}