import * as React from 'react'
import Card from '../../common/cards/Card'
import {Mark} from '../../common/PlayerInfo'
import UICard from './UICard'
import { Checker } from './UIBoard'
import { Seeker } from './ScreenPosObtainer'

type CardRowProp = {
    cards: Card[],
    isShown: boolean,
    checker: Checker,
    seeker: Seeker
}

const cardWidth = 120 //100 (card) + 5*2 (border)
const leftOffset = 15

export default function UICardRow(prop: CardRowProp) {

    let [hover, setHover] = React.useState<number>(-1)
    let [width, setWidth] = React.useState<number>(600)

    // store.clear()

    React.useEffect(() => {
        setWidth(ref.current.getBoundingClientRect().width - cardWidth - leftOffset * 2)
    }, [width, hover]);

    let ref = React.useRef(null);

    let sep: number


    if(hover >= 0 && hover < prop.cards.length - 1) {
        //only if there is some hover and *not* on the last card
        sep = (width - cardWidth) / (prop.cards.length - 2)
    } else {
        sep = width / (prop.cards.length - 1)
    }
    sep = Math.min(cardWidth, sep)  //if cards are few, back to cardWidth

    return <div className='ui-card-row' ref={ref}>
        {prop.cards.map((c, i) => {
            let status = prop.checker.getStatus(c.id)
            let offset = i * sep + leftOffset
            if(hover >= 0 && i > hover) {
                offset += cardWidth - sep
            }
            return <div className='ui-card-wrapper' style={{left: offset+'px'}} key={i}>
                <UICard key={c.id} card={c} isShown={prop.isShown} seeker={prop.seeker}
                                elementStatus={status} 
                                onMouseLeave={()=>{if(hover===i){setHover(-1)}}}
                                onMouseEnter={()=>setHover(i)}
                                onMouseClick={(cc)=>status.isSelectable && prop.checker.onClicked(cc.id)}/>
            </div>
        })}
    </div>
}

type MarkProp = {
    marks: Mark[],
    seeker?: Seeker
}

export function UIMarkRow(p: MarkProp) {
 
    return <div className='ui-card-row'>
        {p.marks.map(m => <img className='judge-cards' key={m.as} src={`icons/${m.as}.png`} ref={r => p.seeker?.set(m.card.id, r)}/>)}
    </div>
}