export default class ClassToggler {

    constructor(private base: string = '') {

    }

    add(check: boolean, clazz: string) {
        if(check) {
            this.base += ' ' + clazz
        }
    }

    done(): string {
        return this.base
    }
}