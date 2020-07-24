class AbilityManagerClass {

    allAbilities: Map<string, Ability> = new Map()

    getAbilityByName(name: string) {
        let ab = this.allAbilities.get(name)
        if(!ab) {
            throw `Unknown Ability ${name}`
        }
    }
}

export const AbilityManager = new AbilityManagerClass()

export abstract class Ability {

    //锁定技
    isLocked: boolean = false
    //限定技
    isLimited: boolean = false
    //主公技
    isRuler: boolean = false
    //觉醒技
    isAwaken: boolean = false

    protected constructor(name: string) {
        AbilityManager.allAbilities.set(name, this)
        console.log(`Registered Ability ${name}`)
    }
}

require.context('./abilities', true, /\.tsx$/).keys().forEach(element => {
    require(`./abilities${element.substring(1)}`)
});