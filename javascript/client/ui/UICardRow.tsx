import * as React from 'react'
import Card from '../../common/cards/Card'
import {Mark} from '../../common/PlayerInfo'
import UICard from './UICard'
import { Checker } from './UIBoard'

type CardRowProp = {
    cards: Card[],
    isShown: boolean,
    checker: Checker
}

export default function UICardRow(prop: CardRowProp) {

    return <div className='ui-card-row'>
        {prop.cards.map(c => <UICard key={c.id} card={c} isShown={prop.isShown} 
                                elementStatus={prop.checker.getStatus(c.id)}
                                onMouseClick={(cc)=>prop.checker.onClicked(cc.id)}/>)}
    </div>
}

type MarkProp = {
    marks: Mark[]
}

export function UIMarkRow(p: MarkProp) {
    return <div className='ui-card-row'>
        {p.marks.map(m => <img className='judge-cards' key={m.as} src={`icons/${m.as}.png`}/>)}
    </div>
}