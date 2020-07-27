

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
        } else if (this.items.size < this.maxSize) {
            this.items.add(item)
        }
    }

    public clear() {
        this.items.clear()
    }

    public toArray(): T[] {
        let res: T[] = []
        for(let i of this.items) {
            res.push(i)
        }
        return res
    }

    public isEmpty() {
        return this.items.size === 0
    }
}