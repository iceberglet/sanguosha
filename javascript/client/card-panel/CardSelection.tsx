import * as React from 'react'
import UICard from '../ui/UICard'
import { ElementStatus } from '../ui/UIBoard'
import { CardSelectionHint, CardSelectionResult } from '../../common/ServerHint'
import './card-panel.scss'
import Card from '../../common/cards/Card'


type Prop = CardSelectionHint & {
    onSelectionDone: (res: CardSelectionResult)=>void
}

/**
 * By Default, selects just one card from it
 */
export default function CardSelection (p: Prop) {
    return <div className='card-selection-container'>
        <div className='card-selection-hint center'>{p.title}</div>
        {Object.keys(p.rowsOfCard).map(rowName => {
            return <div className='card-selection-row' key={rowName}>
                <div className='row-name center'>{rowName}</div>
                <div className='row-of-cards'>
                {
                    p.rowsOfCard[rowName].map((c: Card, i: number) => {
                        return <div className='card-wrapper' key={i}>
                            <UICard card={c} isShown={true} elementStatus={ElementStatus.UNSELECTED} 
                                    onMouseClick={()=>p.onSelectionDone({rowName, idx: i})} />
                        </div>
                    })
                }
                </div>
            </div>
        })}
    </div>
}