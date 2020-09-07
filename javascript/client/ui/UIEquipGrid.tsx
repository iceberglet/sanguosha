import * as React from 'react'
import Card, { CardType, CardGenre } from '../../common/cards/Card'
import './ui-equip.scss'
import { Suits, toChinese } from '../../common/util/Util'
import { Checker, ElementStatus } from './UIBoard'
import { ClassFormatter } from '../../common/util/Togglable'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { wrapCard } from './UICard'

type EquipGridProp = {
    cards: Card[],
    big: boolean,
    checker?: Checker
}

export default function UIEquipGrid(prop: EquipGridProp) {

    let weapon = prop.cards.find(c => c.type.genre === 'weapon')
    let shield = prop.cards.find(c => c.type.genre === 'shield')
    let horsePlus = prop.cards.find(c => c.type.genre === 'horse+1')
    let horseMinus = prop.cards.find(c => c.type.genre === 'horse-1')

    let cards = [weapon, shield, horsePlus, horseMinus]
    return <TransitionGroup className='ui-equip-grid'>
            {
                cards.filter(c => c).map((c, i) => {
                    let status = (prop.checker?.getStatus(c.id)) || ElementStatus.NORMAL
                    let clazz = new ClassFormatter('equip-row')
                                .and(status.isSelectable, 'selectable')
                                .and(status === ElementStatus.SELECTED, 'selected')
                                .done()
                    return <CSSTransition key={c.id} timeout={{enter: 300, exit: 600}} classNames='equipment'>
                        <div className={clazz} onClick={()=>prop.checker?.onClicked(c.id)} style={getStyle(c.type.genre)}>
                            <Equip key={c.id} big={prop.big} card={c} />
                        </div>
                    </CSSTransition>
                })
            }
        </TransitionGroup>
}

type EquipProp = {
    card: Card,
    big: boolean
}

function Equip(p: EquipProp) {
    if(!p.card) {
        return <div />
    }
    return wrapCard(p.card, <div className='equip'>
            <img key='1' className='corner corner-top-left' src={'equips/corner.png'} />
            <img key='2' className='corner corner-btm-left' src={'equips/corner.png'} />
            <img key='3' className='corner corner-top-right' src={'equips/corner.png'} />
            <img key='4' className='corner corner-btm-right' src={'equips/corner.png'} />

            <img key='5' className='icon' src={`equips/${getType(p.card.type)[0]}.png`} alt={p.card.type.id} />
            <div key='6' className='text-one'>{getType(p.card.type)[1]}</div>
            <div key='7' className='text-two'>{p.card.type.name}</div>
            <div key='8' className={'number ' + p.card.suit}>{p.card.size.symbol}</div>
            <div key='9' className={'suit ' + p.card.suit}>{Suits[p.card.suit]}</div>
        </div>)
}

function getStyle(genre: CardGenre) {
    switch(genre) {
        case 'shield': return {top: '25%'}
        case 'horse+1': return {top: '50%'}
        case 'horse-1': return {top: '75%'}
    }
}

function getType(type: CardType): [string, string] {
    if(type.genre === 'weapon') {
        return ['weapon', toChinese(type.distance - 1)]
    }
    if(type.genre === 'shield') {
        return ['shield', null]
    }
    if(type.genre === 'horse+1') {
        return ['horse', '+1']
    }
    if(type.genre === 'horse-1') {
        return ['horse', '-1']
    }
}