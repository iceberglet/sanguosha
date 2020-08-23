
import UICard from "./UICard"
import { ElementStatus } from "./UIBoard"
import * as React from 'react'
import Card, { CardManager } from "../../common/cards/Card"
import {CSSTransition, TransitionGroup} from 'react-transition-group'
import { ScreenPosObtainer } from "./ScreenPosObtainer"
import CardTransitManager, { CardEndpoint,InCardAndCoor, CardAndCoor } from "./CardTransitManager"
import { CardPos } from "../../common/transit/CardPos"
import { CardTransit } from "../../common/transit/EffectTransit"
import ArrayList from "../../common/util/ArrayList"

//left offset: 220
//btm offset: 
//width = total - 220 * 2 - 120
const cardWidth = 120 //100 (card) + 5*2 (border)
const cardHeight = 154
const rowOffset = 270
const btmOffset = 80

type SimpleRowProp = {
    cardManager: CardManager,
    screenPosObtainer: ScreenPosObtainer,
    cardTransitManager: CardTransitManager
}

type Renderable = InCardAndCoor & {
    rendered: boolean
}

type State = {
    width: number,
    //effectively the y position relative to bounding parent where we wanna see workflow cards
    height: number,
    cards: ArrayList<Renderable>,
}

export const CENTER = 'center'

export class UIWorkflowCardRow extends React.Component<SimpleRowProp, State> implements CardEndpoint {

    dom: React.RefObject<any>

    constructor(p: SimpleRowProp) {
        super(p)
        this.dom = React.createRef()
        this.state = {
            cards: new ArrayList<Renderable>(),
            width: 800,
            height: 600
        }
        p.screenPosObtainer.registerObtainer(CENTER, this.dom)
        p.cardTransitManager.register(this, CardTransit.WORKFLOW)
    }

    /**
     * 这些牌将转入此endpoint. 此endpoint需要之后再改变卡牌的位置
     * 带进的position是来源地的coordinates (左上角)
     * @param cards cards and coordinates (in absolute terms!!)
     * @param cardPos animation duration
     */
    pushCard(cards: InCardAndCoor[], transfer: CardTransit): void {
        let rect = this.dom.current.getBoundingClientRect()
        //set the original position of all cards which have no such position
        let toAdd: Renderable[] = cards.map(w => {
            if(w.coor) {
                w.coor.x -= rect.left,
                w.coor.y -= rect.top
            }
            return {...w, rendered: false}
        })
        this.setState(s => {
            if(transfer.head) {
                //clear existing ones
                s.cards.clear()
            }
            toAdd.forEach(s.cards.add)
            return s
        })
        setTimeout(()=>{
            //set those cards to true and kick them into movement!
            toAdd.forEach(r => r.rendered = true)
            this.forceUpdate()
        }, 20)
    }

    /**
     * 这些牌将从此endpoint转出,请提供此牌的位置 (in screen position!) (左上角)
     * @param card 
     */
    takeCards(cards: Card[], pos: CardPos): Array<CardAndCoor> {
        throw 'Impossible!!' //actually we should be able to!
    }

    componentDidMount() {
        this.setSize()
    }

    componentDidUpdate(prevProps: SimpleRowProp, prevState: State) {
        if(prevState.cards !== this.state.cards) {
            this.setSize()
        }
    }

    setSize() {
        let size = {
            width: this.dom.current.getBoundingClientRect().width - cardWidth - rowOffset * 2,
            height: this.dom.current.getBoundingClientRect().height - btmOffset - cardHeight
        }
        console.log('Setting Workflow Size', size)
        this.setState(size)
    }

    render() {
        let {width, height, cards} = this.state
        //if cards are few, back to cardWidth
        let sep = Math.min(cardWidth, width / Math.max(1, cards.size() -1))
        let leftOffset = rowOffset + (width - sep * (cards.size() - 1) + cardWidth) / 2
    
        return <div className='occupy workflow-row' ref={this.dom}>
            <TransitionGroup className='workflow-cards'>
                {cards.map((w, i) => {
                    let myStyle
                    if(w.rendered || !w.coor) {
                        //already in place. let's just apply calculated position!
                        myStyle = {left: leftOffset + sep * i + 'px', top: height + 'px'}
                    } else {
                        //use the original placing!
                        myStyle = {left: w.coor.x + 'px', top: w.coor.y + 'px', transitionDuration: w.animDuration + 'ms'}
                    }
                    // console.log('Render workflow card', w.card.id, w.coor, myStyle)
                    return <CSSTransition key={w.uuid} timeout={{appear: 1200, enter: 1200, exit: 3500}} classNames="workflow-card">
                        <div className='ui-card-wrapper' style={myStyle}>
                            <UICard card={w.card} isShown={true} elementStatus={ElementStatus.NORMAL} />
                        </div>
                    </CSSTransition>
                })}
            </TransitionGroup>
        </div>
    }
}