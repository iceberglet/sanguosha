import * as React from 'react'
import Card from '../../common/cards/Card'
import UICard from './UICard'

type CardRowProp = {
    cards: Card[],
    isShown: boolean
}

export default function UICardRow(prop: CardRowProp) {

    return <div className='ui-card-row'>
        {prop.cards.map(c => <UICard key={c.id} card={c} isShown={prop.isShown}/>)}
    </div>
}