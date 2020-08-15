import * as React from 'react'
import Card, { CardType, CardGenre } from '../../common/cards/Card'
import './ui-equip.scss'
import { Suits } from '../../common/util/Util'
import { Checker, ElementStatus } from './UIBoard'
import { ClassFormatter } from '../../common/util/Togglable'

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

    let weaponStatus = prop.checker?.getStatus(weapon.id) || ElementStatus.NORMAL
    let shieldStatus = (shield && prop.checker?.getStatus(shield.id)) || ElementStatus.NORMAL
    let horseStatus = (horsePlus && prop.checker?.getStatus(horsePlus.id)) || ElementStatus.NORMAL
    let horseMinusStatus = (horseMinus && prop.checker?.getStatus(horseMinus.id)) || ElementStatus.NORMAL
    return <div className='ui-equip-grid'>
        <Equip key='weapon' big={prop.big} card={weapon} status={weaponStatus} onClick={prop.checker?.onClicked}/>
        <Equip key='shield' big={prop.big} card={shield} status={shieldStatus} onClick={prop.checker?.onClicked}/>
        <Equip key='horsePlus' big={prop.big} card={horsePlus} status={horseStatus} onClick={prop.checker?.onClicked}/>
        <Equip key='horseMinus' big={prop.big} card={horseMinus} status={horseMinusStatus} onClick={prop.checker?.onClicked}/>
    </div>
}

type EquipProp = {
    card: Card,
    big: boolean,
    status?: ElementStatus,
    onClick?: (id: string)=>void
}

function Equip(p: EquipProp) {
    if(!p.card) {
        return <div className='equip-row'/>
    }
    let typeAndText = getType(p.card.type)
    let clazz = new ClassFormatter('equip-row')
                .and(p.status.isSelectable, 'selectable')
                .and(p.status === ElementStatus.SELECTED, 'selected')
                .done()
    return <div className={clazz} onClick={()=>p.onClick && p.onClick(p.card.id)}>
        <div className='equip'>
            <img key='1' className='corner corner-top-left' src={'equips/corner.png'} />
            <img key='2' className='corner corner-btm-left' src={'equips/corner.png'} />
            <img key='3' className='corner corner-top-right' src={'equips/corner.png'} />
            <img key='4' className='corner corner-btm-right' src={'equips/corner.png'} />

            <img key='5' className='icon' src={`equips/${typeAndText[0]}.png`} alt={p.card.type.id} />
            <div key='6' className='text-one'>{typeAndText[1]}</div>
            <div key='7' className='text-two'>{p.card.type.name}</div>
            <div key='8' className={'number ' + p.card.suit}>{p.card.size.symbol}</div>
            <div key='9' className={'suit ' + p.card.suit}>{Suits[p.card.suit]}</div>
        </div>
    </div>
}

function getType(type: CardType): [string, string] {
    if(type.genre === 'weapon') {
        switch (type.distance) {
            case 1: return ['weapon', '一']
            case 2: return ['weapon', '二']
            case 3: return ['weapon', '三']
            case 4: return ['weapon', '四']
            case 5: return ['weapon', '五']
        }
        
        throw `Donno distance ${type.distance}`
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