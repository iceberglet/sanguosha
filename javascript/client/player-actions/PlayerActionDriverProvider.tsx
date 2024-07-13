import { PlayerActionDriver, CompositePlayerActionDriver } from "./PlayerActionDriver"
import { ServerHint, HintType } from "../../common/ServerHint"
import {Multimap} from "../../common/util/Multimap"
import GameClientContext from "../GameClientContext"

type Provider = (hint: ServerHint, context: GameClientContext)=>PlayerActionDriver

class PlayerActionDriverProvider {

    providers = new Map<HintType, Provider[]>()
    special = new Multimap<string, Provider>()

    registerSpecial(key: string, provider: Provider) {
        this.special.set(key, provider)
    }

    unregisterSpecial(key: string, provider: Provider) {
        this.special.get(key).delete(provider)
    }

    registerProvider(hintType: HintType, provider: Provider) {
        let curr = this.providers.get(hintType) || []
        curr.push(provider)
        this.providers.set(hintType, curr)
        // console.log(`Registering PlayerActionDriverProvider ${hintType} > ${provider.constructor.name}`)
    }

    unregisterProvider(hintType: HintType, provider: Provider) {
        let ps = this.providers.get(hintType)
        let idx = ps.findIndex(p => p === provider)
        if(idx > -1) {
            this.providers.get(hintType).splice(idx, 1)
        } else {
            throw 'Not Found'
        }
        // console.log(`Unregistering PlayerActionDriverProvider ${hintType} > ${provider.constructor.name}`)
    }

    getDriver(hint: ServerHint, context: GameClientContext): PlayerActionDriver {
        if(hint.hintType === HintType.SPECIAL) {
            let set = this.special.getArr(hint.specialId)
            if(set.length === 1) {
                return set[0](hint, context)
            } else if (set.length === 0) {
                throw `Cannot find any driver for special hint! ${hint.hintType} ${hint.specialId}`
            } else {
                return new CompositePlayerActionDriver(set.map(s => s(hint, context)))
            }
        }
        let p = this.providers.get(hint.hintType) || []
        let drivers = p.map((provider)=>provider(hint, context)).filter(p => p)
        if(drivers.length > 1) {
            return new CompositePlayerActionDriver(drivers)
        } else if (drivers.length === 1) {
            return drivers[0]
        } else {
            throw `Cannot find any driver for hint! ${hint.hintType}`
        }
    }
}

export const playerActionDriverProvider = new PlayerActionDriverProvider()