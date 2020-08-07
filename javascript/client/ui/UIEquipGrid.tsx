import * as React from 'react'
import Card from '../../common/cards/Card'
import './ui-equip.scss'
import { Suits } from '../../common/util/Util'

type EquipGridProp = {
    cards: Card[]
}

export default function UIEquipGrid(prop: EquipGridProp) {
    let weapon = prop.cards.find(c => c.type.genre === 'weapon')
    let shield = prop.cards.find(c => c.type.genre === 'shield')
    let horsePlus = prop.cards.find(c => c.type.genre === 'horse+1')
    let horseMinus = prop.cards.find(c => c.type.genre === 'horse-1')

    return <div className='ui-equip-grid'>
        <Equip key='weapon' card={weapon}/>
        <Equip key='shield' card={shield}/>
        <Equip key='horsePlus' card={horsePlus}/>
        <Equip key='horseMinus' card={horseMinus}/>
    </div>
}

type EquipProp = {
    card: Card
}

function Equip(p: EquipProp) {
    if(!p.card) {
        return <div className='equip'/>
    }
    return <div className='equip'>
        <img className='occupy' src={`equips/${p.card.type.id}.png`} alt={p.card.type.id} />
        <div className={'number ' + p.card.suit}>{p.card.size.symbol}</div>
        <div className={'suit ' + p.card.suit}>{Suits[p.card.suit]}</div>
    </div>
}