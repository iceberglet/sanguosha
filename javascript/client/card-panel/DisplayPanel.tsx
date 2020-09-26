import * as React from 'react'
import UICard from '../ui/UICard'
import { ElementStatus } from '../ui/UIBoard'
import { DisplayHint } from '../../common/ServerHint'
import './card-panel.scss'
import Card from '../../common/cards/Card'
import UIButton from '../ui/UIButton'
import { General } from '../../common/General'
import GeneralUI from './GeneralUI'
import FactionWarGeneral from '../../game-mode-faction/FactionWarGenerals'

type Prop = DisplayHint & {
    onSelectionDone: (res: any)=>void
}

/**
 * By Default, selects just one card from it
 */
export default function DisplayPanel (p: Prop) {

    let toDisplay = p.items.map((item: Card | General, idx) => {
        if(p.mode === 'card')
            return <UICard card={item as Card} key={idx} isShown={true} elementStatus={ElementStatus.NORMAL} nodescript={true}/>
        return <GeneralUI key={idx} general={item as FactionWarGeneral}/>
    })

    let style = p.mode === 'general'? {
        height: '220px'
    }: {}

    return <div className='card-selection-container'>
                <div className='card-selection-hint center'>{p.title}</div>
                <div className='card-selection-row'>
                    <div className='row-of-cards' style={style}>
                        {toDisplay}
                    </div>
                </div>
                <div className='button-container'>
                    <UIButton display={'观看完毕'} disabled={false} onClick={()=>p.onSelectionDone('ignored')}/>
                </div>
        </div>
}