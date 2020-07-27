import {PlayerActionDriver} from "../client/player-actions/PlayerActionDriver"
import GameContext from "./GameContext"


class SkillManagerClass {

    allAbilities: Map<string, Ability> = new Map()

    getAbilityByName(name: string) {
        let ab = this.allAbilities.get(name)
        if(!ab) {
            throw `Unknown Ability ${name}`
        }
    }
}

export const SkillManager = new SkillManagerClass()

export abstract class Ability {

    isProactive: boolean = false
    //锁定技
    isLocked: boolean = false
    //限定技
    isLimited: boolean = false
    //主公技
    isRuler: boolean = false
    //觉醒技
    isAwaken: boolean = false

    protected constructor(public id: string, public name: string, public desc: string) {
        SkillManager.allAbilities.set(name, this)
        console.log(`Registered Ability ${name}`)
    }

    //client usage
    public abstract createDriver(context: GameContext): PlayerActionDriver
}

require.context('./abilities', true, /\.tsx$/).keys().forEach(element => {
    require(`./abilities${element.substring(1)}`)
});