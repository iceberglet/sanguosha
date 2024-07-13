import * as React from 'react'
import {Card} from '../../common/cards/Card'
import UICard, { CardWidth, UICardHolder } from '../ui/UICard'
import { ElementStatus } from '../ui/UIBoard'
import { DragDropContext, Draggable, Droppable, DropResult, Sensor, SensorAPI } from 'react-beautiful-dnd'
import { CardMovementEvent, TOP, BTM } from '../../common/transit/CardPos'
import Pubsub from '../../common/util/PubSub'
import UIButton from '../ui/UIButton'
import { wait } from '../../common/util/Util'
import { AsyncBlockingQueue } from '../../common/util/BlockingQueue'

/**
 * Can be broadcasted to show everyone
 */
export class CustomUIData<T> {

    public static STOP: string = 'stop'

    constructor(public readonly type: string, public readonly data: T) {}
}

export type MountableProp<C, D> = {
    commonUI: C //data to render UI for everyone
    requestData: D //data to hint player into action
    consumer: (res: any, intermittent?: boolean) => void //to consume results
    pubsub: Pubsub //to listen to server stuff
}

export type MountableUI<C, D> = React.Component<MountableProp<C, D>, any>

class CustomUIRegistry {

    map = new Map<string, (prop: MountableProp<any, any>)=>React.ReactNode>()

    register<C, D>(type: string, provider: (prop: MountableProp<C, D>)=>React.ReactNode) {
        if(this.map.has(type)){
            throw `${type} is already registered!`
        }
        this.map.set(type, provider)
    }

    get<C, D>(type: string, prop: MountableProp<C, D>) {
        if(!this.map.has(type)){
            throw `${type} is not registered!`
        }
        return this.map.get(type)(prop)
    }
}

export const customUIRegistry = new CustomUIRegistry()

/////////////////////////////////////////////////////////////////////

export type WuguUIData = {
    cards: Array<Card>,
    title: string
}

class Wugu extends React.Component<MountableProp<WuguUIData, boolean>, object> {

    render() {
        let {commonUI, requestData, consumer} = this.props
        return <div className='cards-container wugu-container'>
            <div className='cards-container-title center'>{commonUI.title}</div>
            <div className='cards'>
                {commonUI.cards.map(card => {
                    let elementStatus = ElementStatus.DISABLED
                    if(!card.description) {
                        elementStatus = ElementStatus.NORMAL
                        if(requestData) {
                            elementStatus = ElementStatus.UNSELECTED
                        }
                    }
                    return <UICard key={card.id} card={card} isShown={true} elementStatus={elementStatus} 
                                        onMouseClick={()=>!card.description && requestData && consumer(card.id)} />
                })}
            </div>
        </div>
    }
}

customUIRegistry.register('wugu', (p: MountableProp<WuguUIData, boolean>)=>{
    return <Wugu {...p}/>
})


/////////////////////////////////////////////////////////////////////

export type GuanXingData = {
    size: number,
    title: string,

    //***** below is sanitized */
    isController: boolean,
    top: Array<[string, Card]>,
    btm: Array<[string, Card]>
}

type GuanXingState = {
    top: Array<[string, Card]>,
    btm: Array<[string, Card]>
}

const RowHeight = 192

class GuanXing extends React.Component<MountableProp<GuanXingData, boolean>, GuanXingState> {

    style : React.CSSProperties

    constructor(p: MountableProp<GuanXingData, boolean>) {
        super(p)
        this.style = {
            display: 'flex',
            width: CardWidth * p.commonUI.size + 'px',
            height: '154px',
        }
        this.state = {
            top: [...p.commonUI.top],
            btm: [...p.commonUI.btm]
        }
    }

    /**
     * Only useful if this client is NOT the dragger
     * @param event 
     */
    onDragEvent=(event: CardMovementEvent)=>{
        if(this.props.requestData) {
            //this is my own movement, ignore
            console.log('Ignoring my own movement', event)
            return
        }
        if((event.fromPos === TOP || event.fromPos === BTM)) {
            console.log('adding new event', event)
            this.toProcess.enqueue(event)
        } else {
            console.error('Not My Action!!!', event, this.props.requestData)
        }
    }

    inited = false
    toProcess: AsyncBlockingQueue<CardMovementEvent> = new AsyncBlockingQueue()

    componentDidMount() {
        this.props.pubsub.on<CardMovementEvent>(CardMovementEvent, this.onDragEvent)
    }

    componentWillUnmount() {
        this.props.pubsub.off<CardMovementEvent>(CardMovementEvent, this.onDragEvent)
    }

    sensor=async (api: SensorAPI) => {
        if(this.inited) {
            return
        }
        this.inited = true
        while(true) {
            let event = await this.toProcess.dequeue()
            let x = 0, y = 0
            if(event.fromPos !== event.toPos) {
                y = event.fromPos === TOP? RowHeight: -RowHeight
            }
            x = (event.to - event.from) * CardWidth
            let lock = api.tryGetLock(event.item)
            let drag = lock.fluidLift({x: 0, y: 0})
            for(let i = 0; i < 20; i++) {
                await wait(()=>drag.move({x: x * i / 19, y: y * i / 19}), 20)
            }
            drag.drop()
        }
    }

    /**
     * Only useful if this client IS the dragger
     * @param result 
     */
    onDragEnd=(result: DropResult)=>{
        // dropped outside the list
        console.log(result)
        if (!result.destination) {
            return;
        }
        let movement = new CardMovementEvent(result.draggableId,
            result.source.droppableId, result.destination.droppableId,
            result.source.index, result.destination.index)
        if(this.props.requestData) {
            this.props.consumer(movement, true)
        }
        this.setState(s => {
            movement.applyToTopBtm(s.top, s.btm)
            return s
        })
    }

    render() {
        let {commonUI, consumer} = this.props
        let {top, btm} = this.state
        let enabled = commonUI.isController
        return <div className='cards-container'>
            <div className='cards-container-title center'>{commonUI.title}</div>
            <DragDropContext onDragEnd={this.onDragEnd} sensors={enabled? [] : [this.sensor]} enableDefaultSensors={!!enabled}>
                <div className='row-title center'>牌堆顶</div>
                <Droppable droppableId={TOP} direction="horizontal" type='guanxing'>
                    {(provided, snapshot) => (
                        <div ref={provided.innerRef} style={this.style} {...provided.droppableProps} className='cards'>
                            {top.map((pair, i) => {
                                let c = pair[1]
                                return <Draggable key={pair[0]} draggableId={pair[0]} index={i}>
                                {(provided, snapshot) => (
                                    <div ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}>
                                        <UICard card={c} isShown={true} elementStatus={ElementStatus.NORMAL}/>
                                    </div>
                                )}
                                </Draggable>
                            })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
                <div className='row-title center'>牌堆底</div>
                <Droppable droppableId={BTM} direction="horizontal" type='guanxing'>
                    {(provided, snapshot) => (
                        <div ref={provided.innerRef} style={this.style} {...provided.droppableProps} className='cards'>
                            {btm.map((pair, i) => {
                                let c = pair[1]
                                return <Draggable key={pair[0]} draggableId={pair[0]} index={i}>
                                {(provided, snapshot) => (
                                    <div ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}>
                                        <UICard key={c.id} card={c} isShown={true} elementStatus={ElementStatus.NORMAL}/>
                                    </div>
                                )}
                                </Draggable>
                            })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            {
                enabled && <div className='center button-container'>
                    <UIButton disabled={false} display={'观星完毕'} onClick={()=>consumer(true)}/>
                </div>
            }
        </div>
    }
}

customUIRegistry.register('guanxing', (p: MountableProp<GuanXingData, boolean>)=>{
    return <GuanXing {...p}/>
})

/////////////////////////////////////////////////////////////////////

export type XunXunData = {
    // size: number,
    title: string,

    //***** below is sanitized */
    isController: boolean,
    top: Array<[string, Card]>,
    btm: Array<[string, Card]>
}

type XunXunState = {
    top: Array<[string, Card]>,
    btm: Array<[string, Card]>
}

class XunXun extends React.Component<MountableProp<XunXunData, boolean>, XunXunState> {

    style : React.CSSProperties

    constructor(p: MountableProp<XunXunData, boolean>) {
        super(p)
        this.style = {
            display: 'flex',
            width: '460px',
            height: '154px',
        }
        this.state = {
            top: [...p.commonUI.top],
            btm: [...p.commonUI.btm]
        }
    }

    /**
     * Only useful if this client is NOT the dragger
     * @param event 
     */
    onDragEvent=(event: CardMovementEvent)=>{
        if(this.props.requestData) {
            //this is my own movement, ignore
            console.log('Ignoring my own movement', event)
            return
        }
        if((event.fromPos === TOP || event.fromPos === BTM)) {
            console.log('adding new event', event)
            this.toProcess.enqueue(event)
        } else {
            console.error('Not My Action!!!', event, this.props.requestData)
        }
    }

    inited = false
    toProcess: AsyncBlockingQueue<CardMovementEvent> = new AsyncBlockingQueue()

    componentDidMount() {
        this.props.pubsub.on<CardMovementEvent>(CardMovementEvent, this.onDragEvent)
    }

    componentWillUnmount() {
        this.props.pubsub.off<CardMovementEvent>(CardMovementEvent, this.onDragEvent)
    }

    sensor=async (api: SensorAPI) => {
        if(this.inited) {
            return
        }
        this.inited = true
        while(true) {
            let event = await this.toProcess.dequeue()
            let x = 0, y = 0
            if(event.fromPos !== event.toPos) {
                y = event.fromPos === TOP? RowHeight: -RowHeight
            }
            x = (event.to - event.from) * CardWidth
            let lock = api.tryGetLock(event.item)
            let drag = lock.fluidLift({x: 0, y: 0})
            for(let i = 0; i < 20; i++) {
                await wait(()=>drag.move({x: x * i / 19, y: y * i / 19}), 20)
            }
            drag.drop()
        }
    }

    /**
     * Only useful if this client IS the dragger
     * @param result 
     */
    onDragEnd=(result: DropResult)=>{
        // dropped outside the list
        console.log(result)
        if (!result.destination) {
            return;
        }
        let movement = new CardMovementEvent(result.draggableId,
            result.source.droppableId, result.destination.droppableId,
            result.source.index, result.destination.index)
        if(this.props.requestData) {
            this.props.consumer(movement, true)
        }
        this.setState(s => {
            movement.applyToTopBtm(s.top, s.btm)
            return s
        })
    }

    render() {
        let {commonUI, consumer} = this.props
        let {top, btm} = this.state
        let enabled = commonUI.isController
        console.log(this.style)
        return <div className='cards-container'>
            <div className='cards-container-title center'>{commonUI.title}</div>
            <DragDropContext onDragEnd={this.onDragEnd} sensors={enabled? [] : [this.sensor]} enableDefaultSensors={!!enabled}>
                <div className='row-title center'>牌堆顶(请留下两张于牌堆顶)</div>
                <Droppable droppableId={TOP} direction="horizontal" type='guanxing'>
                    {(provided, snapshot) => (
                        <div ref={provided.innerRef} style={this.style} {...provided.droppableProps} className='cards'>
                            {top.map((pair, i) => {
                                let c = pair[1]
                                return <Draggable key={pair[0]} draggableId={pair[0]} index={i}>
                                {(provided, snapshot) => (
                                    <div ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}>
                                        <UICard card={c} isShown={true} elementStatus={ElementStatus.NORMAL}/>
                                    </div>
                                )}
                                </Draggable>
                            })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
                <div className='row-title center'>牌堆底</div>
                <Droppable droppableId={BTM} direction="horizontal" type='guanxing'>
                    {(provided, snapshot) => (
                        <div ref={provided.innerRef} style={this.style} {...provided.droppableProps} className='cards'>
                            {btm.map((pair, i) => {
                                let c = pair[1]
                                return <Draggable key={pair[0]} draggableId={pair[0]} index={i}>
                                {(provided, snapshot) => (
                                    <div ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}>
                                        <UICard key={c.id} card={c} isShown={true} elementStatus={ElementStatus.NORMAL}/>
                                    </div>
                                )}
                                </Draggable>
                            })}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            {
                enabled && <div className='center button-container'>
                    <UIButton disabled={top.length !== 2} display={'恂恂完毕'} onClick={()=>consumer(true)}/>
                </div>
            }
        </div>
    }
}

customUIRegistry.register('xunxun', (p: MountableProp<XunXunData, boolean>)=>{
    return <XunXun {...p}/>
})


//////////////////////////////////////////////////////////

/**
 * 左边永远是拼点的发起人
 * 一定要点大才能赢
 * 没赢就会写没赢
 */
export type CardFightData = {
    cardLeft: Card,
    cardRight: Card,
    numberLeft?: number,
    numberRight?: number,
    title: string
}

class CardFight extends React.Component<MountableProp<CardFightData, boolean>, object> {
    
    renderCard(c: Card) {
        if(!c) {
            return <UICardHolder />
        } else {
            return <UICard card={c} isShown={true} elementStatus={ElementStatus.NORMAL} />
        }
    }

    render() {
        let {commonUI, requestData, consumer} = this.props
        let left = commonUI.cardLeft, right = commonUI.cardRight
        let {numberLeft, numberRight} = commonUI
        let result: string
        if(numberLeft && numberRight) {
            result = numberLeft > numberRight? 'win' : 'lose'
        }
        return <div className='cf-container'>
            <div className='cf-title center'>{commonUI.title}</div>
            <div className='cf-cards'>
                <div className='left'>
                    {this.renderCard(left)}
                    {result && <div className={'occupy win-lose ' + result}/>}
                </div>
                <div>v.s.</div>
                {this.renderCard(right)}
            </div>
        </div>
    }
}

customUIRegistry.register('card-fight', (p: MountableProp<CardFightData, boolean>)=>{
    return <CardFight {...p}/>
})