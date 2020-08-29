import * as React from 'react'
import Card from '../../common/cards/Card'
import UICard from '../ui/UICard'
import { ElementStatus } from '../ui/UIBoard'

/**
 * Can be broadcasted to show everyone
 */
export class CustomUIData<T> {

    public static STOP: string = 'stop'

    constructor(public readonly type: string, public readonly data: T) {}
}

export type MountableProp<C, D> = {
    commonUI: C //data to render UI for everyone
    requestData: D //data to hint player into action
    consumer: (res: any) => void //to consume results
}

export type MountableUI<C, D> = React.Component<MountableProp<C, D>, any>

class CustomUIRegistry {

    map = new Map<string, (commonUI: any, hint: any, consumer: (res: any)=>void)=>React.ReactNode>()

    register<C, D>(type: string, provider: (commonUI: C, hint: D, consumer: (res: any) => void)=>React.ReactNode) {
        if(this.map.has(type)){
            throw `${type} is already registered!`
        }
        this.map.set(type, provider)
    }

    get(type: string, commonUI: any, hint: any, consumer: (res: any) => void) {
        if(!this.map.has(type)){
            throw `${type} is not registered!`
        }
        return this.map.get(type)(commonUI, hint, consumer)
    }
}

export const customUIRegistry = new CustomUIRegistry()

/////////////////////////////////////////////////////////////////////

type WuguUIData = {
    cards: Array<Card>,
    title: string
}

class Wugu extends React.Component<MountableProp<WuguUIData, boolean>, object> {

    render() {
        let {commonUI, requestData, consumer} = this.props
        return <div className='wugu-container'>
            <div className='wugu-title center'>{commonUI.title}</div>
            <div className='wugu-cards'>
                {commonUI.cards.map(card => {
                    let elementStatus = ElementStatus.DISABLED
                    if(!card.description) {
                        elementStatus = ElementStatus.NORMAL
                        if(requestData) {
                            elementStatus = ElementStatus.UNSELECTED
                        }
                    }
                    return <UICard key={card.id} card={card} isShown={true} elementStatus={elementStatus} 
                                        onMouseClick={()=>!card.description && requestData && consumer(card.id)} />
                })}
            </div>
        </div>
    }
}

customUIRegistry.register('wugu', (ui: WuguUIData, hint: boolean, con: (res: any) => void)=>{
    return <Wugu commonUI={ui} requestData={hint} consumer={con} />
})