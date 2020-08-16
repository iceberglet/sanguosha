import { WorkflowCard } from "../../common/transit/WorkflowCard"
import UICard from "./UICard"
import { ElementStatus } from "./UIBoard"
import * as React from 'react'
import Card, { CardManager } from "../../common/cards/Card"
import {CSSTransition, TransitionGroup} from 'react-transition-group'

const cardWidth = 120 //100 (card) + 5*2 (border)
const leftOffset = 15

type SimpleRowProp = {
    cardManager: CardManager,
    head: WorkflowCard[],
    cards: WorkflowCard[],
}

export function UIWorkflowCardRow(prop: SimpleRowProp) {

    let [hover, setHover] = React.useState<Card>(null)
    let [width, setWidth] = React.useState<number>(600)

    React.useEffect(() => {
        setWidth(ref.current.getBoundingClientRect().width - cardWidth)
    }, [prop.cards]);

    let ref = React.useRef(null);

    let sep = Math.min(cardWidth + leftOffset, width / Math.max(1, prop.cards.length-1))

    sep = Math.min(cardWidth, sep)  //if cards are few, back to cardWidth

    return <div className='occupy card-container' ref={ref}>
        <TransitionGroup className='workflow-cards'>
            {[...prop.head, ...prop.cards].map((w, i) => {
                return <CSSTransition key={w.cardId} timeout={600} classNames="workflow-card">
                    <div key={w.cardId} className='ui-card-wrapper' style={{left: sep * i}}>
                        <UICard card={prop.cardManager.getCard(w.cardId)} isShown={true}
                                    elementStatus={ElementStatus.NORMAL} 
                                    //if the hover exists and equals this one we don't update man
                                    onMouseStay={(c)=>(hover && c.id === hover.id) && setHover(c)} />
                        {w.as && <div className='as center'>{w.as.name}</div>}
                    </div>
                </CSSTransition>
            })}
        </TransitionGroup>
    </div>
}