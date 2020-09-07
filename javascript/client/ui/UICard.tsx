import * as React from 'react'
import Card from '../../common/cards/Card'
import './ui-card.scss'
import { Suits } from '../../common/util/Util'
import { ElementStatus } from './UIBoard'
import { ClassFormatter } from '../../common/util/Togglable'
// import "bootstrap/dist/css/bootstrap.css";
import './tooltip.scss'
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import { describer } from '../../common/util/Describer'

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
    className?: string
    nodescript?: boolean
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

    let {elementStatus, card, isShown, nodescript} = prop
    let clazz = new ClassFormatter('ui-card ' + prop.className)
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


    return wrapCard(card, <div className={clazz} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onMouseOver={onMouseStay} 
                                onClick={onMouseClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} ref={myRef}>
        <img className='back'
            src={`cards/back.png`}
            alt='HiddenCard'/>
        <img className='itself' 
            src={`cards/${card.type.id}.png`} 
            alt={card.type.id}/>
        <div className='top-left-container'>
            <div className={'number ' + card.suit}>
                {card.size.symbol}
            </div>
            <div className={'suit ' + card.suit}>{Suits[card.suit]}</div>
        </div>
        {!nodescript && card.as && <div className='as center'>{card.as.name}</div>}
        {!nodescript && card.description && <div className='description'>{card.description}</div>}
    </div>)
}

export function wrapCard(card: Card, ele: React.ReactElement) {
    let des = describer.get(card.type.id)
    let as = card.as && describer.get(card.as.id)
    if(des || as) {
        let overlay = (props: any) => <Tooltip {...props}>
                {<p>{`${Suits[card.suit]} ${card.size.symbol} ${card.type.name}`}</p>}
                {des? <p>{'【'+card.type.name+'】' + des}</p> : null}
                {as? <p>{'【'+card.as.name+'】' + as}</p> : null}
            </Tooltip>
        return <OverlayTrigger placement='auto' key={card.id} overlay={overlay} delay={{show: 1000, hide: 200}}>
            {ele}
        </OverlayTrigger>
    } else {
        return ele
    }
}