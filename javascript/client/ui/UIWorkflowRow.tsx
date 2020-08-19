import { WorkflowCard, WorkflowTransit } from "../../common/transit/WorkflowCard"
import UICard from "./UICard"
import { ElementStatus } from "./UIBoard"
import * as React from 'react'
import Card, { CardManager } from "../../common/cards/Card"
import {CSSTransition, TransitionGroup} from 'react-transition-group'
import { ScreenPosObtainer } from "./ScreenPosObtainer"
import Pubsub from "../../common/util/PubSub"
import { render } from "react-dom"

//left offset: 220
//btm offset: 
//width = total - 220 * 2 - 120
const cardWidth = 120 //100 (card) + 5*2 (border)
const cardHeight = 154
const rowOffset = 270
const btmOffset = 80

type SimpleRowProp = {
    cardManager: CardManager,
    pubsub: Pubsub,
    screenPosObtainer: ScreenPosObtainer
}

type PositionedWorkflowCard = WorkflowCard & {
    started: boolean
    x?: number
    y?: number
}

type State = {
    width: number,
    height: number,
    cards: PositionedWorkflowCard[]
}

export const CENTER = 'center'

export class UIWorkflowCardRow extends React.Component<SimpleRowProp, State> {

    dom: React.RefObject<any>

    constructor(p: SimpleRowProp) {
        super(p)
        this.dom = React.createRef()
        p.pubsub.on(WorkflowTransit, (transit: WorkflowTransit)=>{
            //set the original position of all cards which have no such position
            let keep = transit.isHead? [] : this.state.cards
            let cards = [...keep, ...transit.cards.map(w => {
                if(w.source) {
                    let coor = p.screenPosObtainer.getPos(w.source)
                    return {...w, ...coor, started: false}
                }
                return {...w, started: false}
            })]
            this.setState({cards})
        })
        this.state = {
            cards: [],
            width: 800,
            height: 600
        }
        p.screenPosObtainer.registerObtainer(CENTER, this.dom)
    }

    componentDidUpdate(prevProps: SimpleRowProp, prevState: State) {
        if(prevState.cards !== this.state.cards) {
            this.setState({
                width: this.dom.current.getBoundingClientRect().width - cardWidth - rowOffset * 2,
                height: this.dom.current.getBoundingClientRect().height - btmOffset - cardHeight
            })
        }
    }

    render() {
        let {width, height, cards} = this.state
        //if cards are few, back to cardWidth
        let sep = Math.min(cardWidth, width / Math.max(1, cards.length-1))
        let leftOffset = rowOffset + (width - sep * (cards.length - 1) + cardWidth) / 2
    
        return <div className='occupy workflow-row' ref={this.dom}>
            <TransitionGroup className='workflow-cards'>
                {cards.map((w, i) => {
                    let myStyle = w.started || !w.x? {left: leftOffset + sep * i + 'px', top: height + 'px'} : 
                                    {left: w.x - cardWidth / 2 + 'px', top: w.y - cardHeight / 2 + 'px'}
    
                    return <CSSTransition key={i} timeout={{ appear: 0, enter: 0, exit: 600}} classNames="workflow-card" onEntered={()=>{
                            w.started = true
                            this.forceUpdate()
                        }}>
                        <div className='ui-card-wrapper' style={myStyle}>
                            <UICard card={this.props.cardManager.getCard(w.cardId)} isShown={true}
                                        elementStatus={ElementStatus.NORMAL} 
                                        //if the hover exists and equals this one we don't update man
                                        // onMouseStay={(c)=>(hover && c.id === hover.id) && setHover(c)} 
                                        />
                            {w.as && <div className='as center'>{w.as.name}</div>}
                        </div>
                    </CSSTransition>
                })}
            </TransitionGroup>
        </div>
    }
}