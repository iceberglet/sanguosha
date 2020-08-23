import * as React from 'react'
import Card from '../../common/cards/Card'
import './ui-card.scss'
import { Suits } from '../../common/util/Util'
import { ElementStatus } from './UIBoard'
import { ClassFormatter } from '../../common/util/Togglable'

type CallBack = (id: Card)=>void
type PosCallBack = (id: string, ref: React.RefObject<HTMLDivElement>)=>void

type CardProp = {
    isShown: boolean
    card: Card
    onMouseDown?: CallBack
    onMouseUp?: CallBack
    onMouseClick?: CallBack
    onMouseEnter?: CallBack
    onMouseLeave?: CallBack
    onMouseStay?: CallBack
    onPos?: PosCallBack
    elementStatus: ElementStatus
}

export default function UICard(prop: CardProp) {
    let onMouseDown = () => prop.onMouseDown && prop.onMouseDown(prop.card)
    let onMouseUp = () => prop.onMouseUp && prop.onMouseUp(prop.card)
    let onMouseClick = () => prop.onMouseClick && prop.onMouseClick(prop.card)
    let onMouseEnter = () => prop.onMouseEnter && prop.onMouseEnter(prop.card)
    let onMouseLeave = () => prop.onMouseLeave && prop.onMouseLeave(prop.card)
    let onMouseStay = () => prop.onMouseStay && prop.onMouseStay(prop.card)
    let myRef = React.useRef()

    React.useEffect(()=>{
        prop.onPos && prop.onPos(prop.card.id, myRef)
        return ()=>{
            prop.onPos && prop.onPos(prop.card.id, null)
        }
    }, [])

    let {elementStatus, card, isShown} = prop
    let clazz = new ClassFormatter('ui-card')
                .and(elementStatus.isSelectable, 'selectable')
                .and(elementStatus === ElementStatus.SELECTED, 'selected')
                .and(elementStatus === ElementStatus.DISABLED, 'darkened')
                .done()

    if(!isShown || card.isDummy()) {
        return <div className={clazz} onMouseDown={onMouseDown} onMouseUp={onMouseUp} 
                    onClick={onMouseClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
            <img className='itself'
                src={`cards/back.png`}
                alt='HiddenCard'/>
        </div>
    }
    return <div className={clazz} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseOver={onMouseStay}
                onClick={onMouseClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} ref={myRef}>
        <img className='itself' 
            src={`cards/${card.type.id}.png`} 
            alt={card.type.id}/>
        <div className='top-left-container'>
            <div className={'number ' + card.suit}>
                {card.size.symbol}
            </div>
            <div className={'suit ' + card.suit}>{Suits[card.suit]}</div>
        </div>
        {card.as && <div className='as center'>{card.as.name}</div>}
    </div>
}