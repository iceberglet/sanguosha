import * as React from 'react'
import Card from '../../common/cards/Card'
import './ui-card.scss'
import { Suits, Mask } from '../../common/util/Util'
import { ElementStatus } from './UIBoard'
import { ClassFormatter } from '../../common/util/Togglable'

type CallBack = (id: Card)=>void

type CardProp = {
    isShown: boolean
    card: Card
    onMouseDown?: CallBack
    onMouseUp?: CallBack
    onMouseClick?: CallBack
    onMouseEnter?: CallBack
    onMouseLeave?: CallBack
    onMouseStay?: CallBack
    elementStatus: ElementStatus
}

export default function UICard(prop: CardProp) {
    let onMouseDown = () => prop.onMouseDown && prop.onMouseDown(prop.card)
    let onMouseUp = () => prop.onMouseUp && prop.onMouseUp(prop.card)
    let onMouseClick = () => prop.onMouseClick && prop.onMouseClick(prop.card)
    let onMouseEnter = () => prop.onMouseEnter && prop.onMouseEnter(prop.card)
    let onMouseLeave = () => prop.onMouseLeave && prop.onMouseLeave(prop.card)
    let onMouseStay = () => prop.onMouseStay && prop.onMouseStay(prop.card)

    let {elementStatus} = prop
    let clazz = new ClassFormatter('ui-card')
                .and(elementStatus.isSelectable, 'selectable')
                .and(elementStatus === ElementStatus.SELECTED, 'selected')
                .done()

    if(!prop.isShown || prop.card.isDummy()) {
        return <div className={clazz} onMouseDown={onMouseDown} onMouseUp={onMouseUp} 
                    onClick={onMouseClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <img className='itself'
                src={`cards/back.png`}
                alt='HiddenCard'/>
        </div>
    }
    return <div className={clazz} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseOver={onMouseStay}
                onClick={onMouseClick} onMouseEnter={onMouseEnter}  onMouseLeave={onMouseLeave}>
        <img className='itself' 
            src={`cards/${prop.card.type.id}.png`} 
            alt={prop.card.type.id}/>
        <div className='top-left-container'>
            <div className={'number ' + prop.card.suit}>
                {prop.card.size.symbol}
            </div>
            <div className={'suit ' + prop.card.suit}>{Suits[prop.card.suit]}</div>
        </div>
        
        <Mask isMasked={elementStatus === ElementStatus.DISABLED}/>
    </div>
}