import * as React from 'react'
import Card, { CardType } from '../../common/cards/Card'
import UICard, { wrapCard } from './UICard'
import { Checker, ElementStatus } from './UIBoard'
import { InCardAndCoor, CardEndpoint, CardAndCoor } from './CardTransitManager'
import { Coor } from './ScreenPosObtainer'
import ArrayList from '../../common/util/ArrayList'
import { CardPos, CardPosChangeEvent } from '../../common/transit/CardPos'
import { reorder } from '../../common/util/Util'
import { DragDropContext, Draggable, Droppable, DropResult, ResponderProvided } from 'react-beautiful-dnd'
import { UIPosition } from '../../common/PlayerAction'

/**
 * Only renders the cards that are in the prop
 * existing cards not in prop will disappear immediately
 * new cards coming in will have initial position + animation duration
 * we will set up the animation and use a timeout to restore that card's good position
 */
type CardRowProp = {
    isShown: boolean,
    checker: Checker,
    myName: string,
    onCardsShifted: (shift: CardPosChangeEvent)=>void
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

export default class UICardRow extends React.Component<CardRowProp, State> implements CardEndpoint {

    containerRef: HTMLDivElement
    myRefs = new Map<string, React.RefObject<HTMLDivElement>>()

    constructor(p: CardRowProp) {
        super(p)
        this.state = {
            hover: -1,
            cards: new ArrayList<Renderable>()
        }
        // this.containerRef = React.createRef()
    }

    performAddAnimation = (cards: InCardAndCoor[]): void => {
        // this.props.info.removeCard()
        let rs: Renderable[] = []
        this.setState(s => {
            let rect = this.containerRef.getBoundingClientRect()
            let offsetX = rect.left, offsetY = rect.top
            if(this.containerRef.lastElementChild) {
                let myBrother = this.containerRef.lastElementChild
                offsetX = myBrother.getBoundingClientRect().left// + myBrother.clientWidth)
            }
            cards.forEach(c =>{
                let r: Renderable = {...c, entered: 'begin'}
                if(r.coor) {
                    r.coor.x -= offsetX
                    r.coor.y -= offsetY
                } else {
                    r.coor = {
                        x: 20, y: 0
                    }
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
            //settle the card!
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

    onDragEnd=(result: DropResult, provided: ResponderProvided)=>{
        // dropped outside the list
        if (!result.destination) {
            return;
        }

        reorder(
            this.state.cards._data,
            result.source.index,
            result.destination.index
        );

        //notify server
        this.props.onCardsShifted(new CardPosChangeEvent(UIPosition.MY_HAND, 
            this.props.myName, 
            result.source.index,
            result.destination.index))

        this.forceUpdate()
    }

    render() {
        let {isShown, checker} = this.props
        let {hover, cards} = this.state

        return <DragDropContext onDragEnd={this.onDragEnd}>
            <Droppable droppableId="hand" direction="horizontal" type='hand'>
            {(provided, snapshot) => (
                <div ref={r => {provided.innerRef(r); this.containerRef = r}} style={getListStyle(snapshot.isDraggingOver)} {...provided.droppableProps}>
                {/* <div ref={this.containerRef} > */}
                    {cards.map((c, i) => {
                        let status = checker.getStatus(c.card.id)
                    
                        let style: any = {}
                        if(c.entered === 'begin') {
                            style.transform = `translate(${c.coor.x}px, ${c.coor.y}px)`
                        }
                        if(c.entered === 'starting') {
                            style.transition = c.animDuration + 'ms'
                        }

                        return <Draggable key={c.card.id} draggableId={c.card.id} index={i}>
                        {(provided, snapshot) => (
                            <div ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                style={{...getItemStyle(snapshot.isDragging, provided.draggableProps.style), ...style}}
                                className='ui-my-row-card-wrapper'>
                                <UICard key={c.card.id} card={c.card} isShown={isShown} onPos={this.settingRef}
                                            elementStatus={status} nodescript={true} noAs={true}
                                            onMouseLeave={()=>{if(hover===i){this.setState({hover: -1})}}}
                                            onMouseEnter={()=>this.setState({hover: i})}
                                            onMouseClick={(cc)=>status.isSelectable && checker.onClicked(cc.id)}/>
                            </div>
                        )}
                        </Draggable>
                    })}
                    {provided.placeholder}
                {/* </div> */}
                </div>
            )}
            </Droppable>
        </DragDropContext>
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


const getItemStyle = (isDragging: boolean, draggableStyle: any) : React.CSSProperties => {
    let style = {
        // some basic styles to make the items look a bit nicer
        pointerEvents: 'none',
        // styles we need to apply on draggables
        ...draggableStyle
    }
    return style
}

const getListStyle = (isDraggingOver: boolean) : React.CSSProperties => ({
    // background: isDraggingOver ? 'lightblue' : 'lightgrey',
    display: 'flex',
    // padding: grid,
    overflow: 'visible',

    width: '100%',
    paddingRight: '100px'
});