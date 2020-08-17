import { WorkflowCard, WorkflowTransit } from "../../common/transit/WorkflowCard"
import UICard from "./UICard"
import { ElementStatus } from "./UIBoard"
import * as React from 'react'
import Card, { CardManager } from "../../common/cards/Card"
import {CSSTransition, TransitionGroup} from 'react-transition-group'
import { ScreenPosObtainer } from "./UIPlayGround"
import { Coor } from "../effect/EffectProducer"

//left offset: 220
//btm offset: 
//width = total - 220 * 2 - 120
const cardWidth = 120 //100 (card) + 5*2 (border)
const cardHeight = 154
const rowOffset = 270
const btmOffset = 80

type SimpleRowProp = {
    cardManager: CardManager,
    head: WorkflowCard[],
    cards: WorkflowCard[],
    screenPosObtainer: ScreenPosObtainer
}

type PositionedWorkflowCard = WorkflowCard & {
    started: boolean
    x?: number
    y?: number
}

export const CENTER = 'center'


export function UIWorkflowCardRow(prop: SimpleRowProp) {

    let [hover, setHover] = React.useState<Card>(null)
    let [width, setWidth] = React.useState<number>(600)      
    let [height, setHeight] = React.useState<number>(800)      
    let [myCards, setMyCards] = React.useState<PositionedWorkflowCard[]>([]) 
    let ref = React.useRef(null)


    React.useEffect(() => {
        setWidth(ref.current.getBoundingClientRect().width - cardWidth - rowOffset * 2)
        setHeight(ref.current.getBoundingClientRect().height - btmOffset - cardHeight)
        //set the original position of all cards which have no such position
        setMyCards([...prop.head, ...prop.cards].map(w => {
            //if my state already has this card, ignore
            let curr = myCards.find(c => c.cardId === w.cardId)
            if(curr) {
                return curr
            }
            //this is some new card
            if(w.source) {
                let coor = prop.screenPosObtainer.getPos(w.source)
                console.log('New Card!', coor, w.source)
                return {...w, ...coor, started: false}
            }
            return {...w, started: false}
        }))
    }, [prop.head, prop.cards]);

    React.useEffect(()=>{
        prop.screenPosObtainer.registerObtainer(CENTER, ref)
    }, [ref])

    //if cards are few, back to cardWidth
    let sep = Math.min(cardWidth, width / Math.max(1, prop.cards.length-1))

    return <div className='occupy workflow-row' ref={ref}>
        <TransitionGroup className='workflow-cards'>
            {myCards.map((w, i) => {

                let myStyle = w.started || !w.x? {left: rowOffset + sep * i + 'px', top: height + 'px'} : 
                                {left: w.x - cardWidth / 2 + 'px', top: w.y - cardHeight / 2 + 'px'}

                return <CSSTransition key={w.cardId} timeout={600} classNames="workflow-card" onEntered={()=>{
                        w.started = true
                        console.log('Animation started for', w.cardId)
                        setMyCards([...myCards])
                    }}>
                    <div key={w.cardId} className='ui-card-wrapper' style={myStyle}>
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