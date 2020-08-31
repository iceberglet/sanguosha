import { PlayerActionDriver, CompositePlayerActionDriver } from "./PlayerActionDriver"
import { ServerHint, HintType } from "../../common/ServerHint"

type Provider = (hint: ServerHint)=>PlayerActionDriver

class PlayerActionDriverProvider {

    providers = new Map<HintType, Provider[]>()
    special = new Map<string, Provider>()

    registerSpecial(key: string, provider: Provider) {
        if(this.special.has(key)) {
            throw 'This key is already registered! ' + key
        }
        this.special.set(key, provider)
    }

    unregisterSpecial(key: string) {
        if(!this.special.has(key)) {
            throw 'This key does not exist! ' + key
        }
        this.special.delete(key)
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

    getDriver(hint: ServerHint): PlayerActionDriver {
        if(hint.hintType === HintType.SPECIAL) {
            return this.special.get(hint.specialId)(hint)
        }
        let p = this.providers.get(hint.hintType) || []
        let drivers = p.map((provider)=>provider(hint))
            .filter(p => p)
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