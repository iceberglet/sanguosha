import * as React from 'react'
import Card, { CardType } from '../../common/cards/Card'
import UICard, { wrapCard } from './UICard'
import { Checker } from './UIBoard'
import { InCardAndCoor, CardWidth, CardEndpoint, CardAndCoor } from './CardTransitManager'
import { Coor } from './ScreenPosObtainer'
import ArrayList from '../../common/util/ArrayList'
import { CardPos } from '../../common/transit/CardPos'

/**
 * Only renders the cards that are in the prop
 * existing cards not in prop will disappear immediately
 * new cards coming in will have initial position + animation duration
 * we will set up the animation and use a timeout to restore that card's good position
 */
type CardRowProp = {
    isShown: boolean,
    checker: Checker
}

type State = {
    //the card that's being hovered on
    //被hover的牌宽度有所增加以方便查看
    hover: number,
    cards: ArrayList<Renderable>
}

type Renderable = InCardAndCoor & {
    entered: 'begin' | 'starting' | 'end'
}

const leftOffset = 15

export default class UICardRow extends React.Component<CardRowProp, State> implements CardEndpoint {

    containerRef: React.RefObject<HTMLDivElement>
    myRefs = new Map<string, React.RefObject<HTMLDivElement>>()

    constructor(p: CardRowProp) {
        super(p)
        this.state = {
            hover: -1,
            cards: new ArrayList<Renderable>()
        }
        this.containerRef = React.createRef()
    }

    performAddAnimation = (cards: InCardAndCoor[]): void => {
        // this.props.info.removeCard()
        let rs: Renderable[] = []
        this.setState(s => {
            let rect = this.containerRef.current.getBoundingClientRect()
            cards.forEach(c =>{
                let r: Renderable = {...c, entered: 'begin'}
                if(r.coor) {
                    r.coor.x -= rect.left,
                    r.coor.y -= rect.top
                }
                rs.push(r)
                delete r.card.description
                delete r.card.as
                s.cards.add(r)
            })
            return s
        })
        setTimeout(()=>{
            //set those cards to true and kick them into movement!
            rs.forEach(r => r.entered = 'starting')
            this.forceUpdate()
        }, 10)
        setTimeout(()=>{
            //set those cards to true and kick them into movement!
            rs.forEach(r => r.entered = 'end')
            this.forceUpdate()
        }, cards[0].animDuration)
    }

    performRemovalAnimation = (cards: Card[], pos: CardPos, doNotRemove: boolean): Array<CardAndCoor> => {
        //remove from my playerInfo
        // console.log('Taking Away', cards, pos, doNotRemove)
        if(!doNotRemove) {
            this.state.cards.removeAllThat(r => !!cards.find(c => c.id === r.card.id))
        }
        let ret = cards.map(r => {
            return {
                card: r, coor: this.getCardLocation(r.id)
            }
        })
        this.forceUpdate()
        return ret
    }

    getSep=(numberOfCards: number): number=>{
        let {hover} = this.state
        let count = numberOfCards - 1 //minus the edge
        let con = this.containerRef.current
        let width = con? con.getBoundingClientRect().width - CardWidth - leftOffset * 2 : 700
        let sep: number

        if(count > 2 && hover >= 0 && hover < count) {
            //only if there is some hover and *not* on the last card
            sep = (width - CardWidth) / (count - 1)
        } else {
            sep = width / count
        }
        sep = Math.min(CardWidth, sep)  //if cards are few, back to cardWidth
        return sep
    }

    /**
     * Get world coordinate for this card
     * @param id 
     */
    getCardLocation(id: string): Coor {
        let ele = this.myRefs.get(id)?.current
        if(!ele) {
            throw `Card not found in hand! ${id}. has ${this.myRefs}`
        }
        return {
            x: ele.getBoundingClientRect().left,
            y: ele.getBoundingClientRect().top
        }
    }
    
    settingRef=(id: string, ref: React.RefObject<HTMLDivElement>) => {
        // console.log('setting ref', id, ref)
        if(!ref) {
            this.myRefs.delete(id)
        } else {
            this.myRefs.set(id, ref)
        }
    }

    render() {
        let {isShown, checker} = this.props
        let {hover, cards} = this.state
        let sep = this.getSep(this.state.cards.size())

        return <div className='ui-card-row' ref={this.containerRef}>
            {cards.map((c, i) => {
                let status = checker.getStatus(c.card.id)
                
                let x: number, y: number = 0
                if(c.entered !== 'begin') {
                    //use calculated coordinates
                    x = i * sep + leftOffset
                    if(hover >= 0 && i > hover) {
                        x += CardWidth - sep
                    }
                } else if(c.coor) {
                    //use original coordinates
                    x = c.coor.x
                    y = c.coor.y
                } else {
                    //cards with no origin
                    x = i * sep + leftOffset + CardWidth
                }
                let myStyle: any = {left: x + 'px', top: y + 'px'}
                if(c.entered === 'starting') {
                    myStyle.transitionDuration = c.animDuration + 'ms'
                }
                return <div className='ui-card-wrapper' style={myStyle} key={c.card.id} >
                    <UICard key={c.card.id} card={c.card} isShown={isShown} onPos={this.settingRef}
                                    elementStatus={status} nodescript={true}
                                    onMouseLeave={()=>{if(hover===i){this.setState({hover: -1})}}}
                                    onMouseEnter={()=>this.setState({hover: i})}
                                    onMouseClick={(cc)=>status.isSelectable && checker.onClicked(cc.id)}/>
                </div>
            })}
        </div>
    }
}

type MarkProp = {
    marks: Card[]
}

export function UIMarkRow(p: MarkProp) {
 
    return <div className='ui-mark-row'>
        {p.marks.map((m: Card) => {
            let as: CardType = m.as || m.type
            return wrapCard(m, <img className='judge-cards' key={as.name} src={`icons/${as.id}.png`} ref={r => r}/>)
        })}
    </div>
}