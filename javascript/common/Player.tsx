import { v4 as uuidv4 } from 'uuid';

export default class Player {
    public readonly id: string

    constructor(public readonly name: string) {
        this.id = uuidv4()
    }
}