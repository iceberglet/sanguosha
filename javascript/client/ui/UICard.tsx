import * as React from 'react'
import Card from '../../common/cards/Card'
import './ui-card.scss'
import { EventCall } from '../../common/util/Util'

type CardProp = {
    isShown: boolean
    card: Card
    onMouseDown?: EventCall<Card>
    onMouseUp?: EventCall<Card>
    onMouseClick?: EventCall<Card>

}

export default function UICard(prop: CardProp) {
    let onMouseDown = (e : any): void => prop.onMouseDown && prop.onMouseDown(prop.card)
    let onMouseUp = (e : any): void => prop.onMouseUp && prop.onMouseUp(prop.card)
    let onMouseClick = (e : any): void => prop.onMouseClick && prop.onMouseClick(prop.card)

    if(!prop.isShown) {
        return <div className='ui-card' onMouseDown={onMouseDown} onMouseUp={onMouseUp} onClick={onMouseClick}>
            <img className='itself'
                src={`cards/back.png`} 
                alt='HiddenCard'/>
        </div>
    }
    return <div className='ui-card'>
        <img className='itself' 
            src={`cards/${prop.card.type.id}.png`} 
            alt={prop.card.type.id}/>
        <div className='top-left-container'>
            <div className={'number ' + prop.card.suit}>
                {prop.card.size.symbol}
            </div>
            <img className='suit'
                src={`icons/${prop.card.suit}.png`} 
                alt={prop.card.suit}/>
        </div>
    </div>
}