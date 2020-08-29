import Card from "../../common/cards/Card";
import { Coor } from "./ScreenPosObtainer";
import { CardTransit } from "../../common/transit/EffectTransit";
import { CardPos, isCardPosHidden } from "../../common/transit/CardPos";
import * as React from 'react'
import { flattenMap } from "../../common/util/Util";
import UICard from "./UICard";
import { ElementStatus } from "./UIBoard";
import { PlayerInfo } from "../../common/PlayerInfo";
import {v4 as uuidv4} from 'uuid'
import { TransitionGroup, CSSTransition } from "react-transition-group";
import './card-transit.scss'

export const CardWidth = 120
export const CardHeight = 150


//get top left coordinates of a div with offset for card width
export function getCardCoor(div: HTMLElement): Coor {
    let rect = div.getBoundingClientRect()
    return {
        x: (rect.left + rect.right) / 2 - CardWidth / 2,
        y: (rect.top + rect.bottom) / 2 - CardHeight / 2
    }
}

/**
 * 一个卡牌可以转入/转出的地方
 * 包含: 
 * - 其他玩家的将牌位置
 * - UI中央的牌堆
 * - UI中央的workflow堆(只可转入)
 * - 玩家装备/判定区/牌放置区
 * - 玩家手牌区
 */
export interface CardEndpoint {

    /**
     * 这些牌将转入此endpoint. 此endpoint需要之后再改变卡牌的位置
     * 带进的position是来源地的coordinates (左上角)
     * @param cards cards and coordinates (in absolute terms!!)
     * @param cardPos animation duration
     */
    performAddAnimation(cards: InCardAndCoor[], transfer: CardTransit): void

    /**
     * 这些牌将从此endpoint转出,请提供此牌的位置 (in screen position!) (左上角)
     * @param card 
     */
    performRemovalAnimation(cards: Card[], pos: CardPos, doNotRemove?: boolean): Array<CardAndCoor>
}

export type InCardAndCoor = CardAndCoor & {
    uuid: string
    animDuration: number
}

export type CardAndCoor = {
    coor: Coor
    card: Card
}

const sep = 36

export class DeckEndpoint extends React.Component<{cardTransitManager: CardTransitManager}, any> implements CardEndpoint {

    dom: React.RefObject<HTMLDivElement> = React.createRef()

    constructor(p: any) {
        super(p)
        p.cardTransitManager.register(this, CardTransit.DECK)
    }

    componentWillUnmount() {
        this.props.cardTransitManager.register(null, CardTransit.DECK)
    }

    performAddAnimation(cards: InCardAndCoor[], transfer: CardTransit): void {
        throw 'Impossible!'
    }
    
    performRemovalAnimation(cards: Card[], cardPos: CardPos, doNotRemove?: boolean): Array<CardAndCoor> {
        let coor = getCardCoor(this.dom.current)
        return cards.map((c, i) => ({
            card: c, coor: {
                y: coor.y, 
                x: coor.x + (i - cards.length / 2) * sep
            }
        }))
    }

    render() {
        return <div className='card-transit occupy deck' ref={this.dom} />
    }
}


type Prop = {
    /**
     * Used to update player
     */
    info: PlayerInfo,
    /**
     * Used to force update player card rendering
     */
    callback: ()=>void
}

type State = {
    transit: Map<string, InCardAndCoor>
}
/**
 * Place this container such that it aligns with your component
 * this container will occupy the same component (with position-events: none)
 * the coordinates will be updated as per relative to your parent
 */
export class DefaultCardEndpoint extends React.Component<Prop, State> implements CardEndpoint {

    dom: React.RefObject<HTMLDivElement> = React.createRef()

    constructor(p: Prop) {
        super(p)
        this.state = {
            transit: new Map<string, InCardAndCoor>()
        }
    }

    performAddAnimation(cards: InCardAndCoor[], transfer: CardTransit): void {
        this.setState(s => {
            cards.forEach(cp => {
                //cards to player
                //will never have description / head properties
                delete cp.card.description
                s.transit.set(cp.uuid, {...cp, coor: this.offsetMyCoor(cp.coor)})
                this.props.info.addCard(cp.card, transfer.toPos)
                this.props.callback()
            })
            return s
        }, ()=>{
            setTimeout(()=>this.updateCards(cards), 10)
        })
    }

    //update to my coordinates
    updateCards(cards: InCardAndCoor[]): void {
        this.setState(s => {
            cards.forEach((cp, i) => {
                let myCoor = this.offsetMyCoor(getCardCoor(this.dom.current))
                s.transit.get(cp.uuid).coor = {
                    y: myCoor.y, 
                    x: myCoor.x + (i - cards.length / 2) * sep
                }
            })
            return s
        })
        //set animation timeout (assuming they share the same animation duration!!!)
        //remove after animation
        setTimeout(()=>{
            this.setState(ss => {
                cards.forEach(cp => ss.transit.delete(cp.uuid))
                return ss
            })
        }, cards[0].animDuration)
    }
    
    performRemovalAnimation(cards: Card[], cardPos: CardPos, doNotRemove?: boolean): Array<CardAndCoor> {
        if(!doNotRemove) {
            // console.log('Removing Cards From Player', this.props.info.player.id, cardPos, cards)
            if(isCardPosHidden(cardPos)) {
                console.log('Randomly removing the dummy cards!')
                this.props.info.removeRandomly(cardPos, cards.length)
            } else {
                cards.forEach(c => this.props.info.removeFromPos(c.id, cardPos))
            }
            //call so that player registers the change
            this.props.callback()
        }
        let coor = getCardCoor(this.dom.current)
        let sep = 36
        return cards.map((c, i) => ({
            card: c, coor: {
                y: coor.y - CardHeight / 2, 
                x: coor.x + (i - cards.length / 2) * sep - CardWidth / 2
            }
        }))
    }

    private offsetMyCoor(screenCoor: Coor): Coor {
        return {
            x: screenCoor.x - this.dom.current.getBoundingClientRect().left,
            y: screenCoor.y - this.dom.current.getBoundingClientRect().top
        }
    }

    render() {
        // console.log('Rendering', this.state.transit.size)
        return <div className='card-transit occupy' ref={this.dom}>
            <TransitionGroup>
                {flattenMap(this.state.transit).map(([id, cardAndPos])=>{
                    // console.log('Rendering', id, cardAndPos.coor.x, cardAndPos.coor.y)
                    return <CSSTransition key={id} timeout={{appear: 0, enter: 0, exit: 2000}} classNames='fade-out'>
                        <div className='ui-card-wrapper' key={id} style={{left: cardAndPos.coor.x + 'px', top: cardAndPos.coor.y + 'px', transitionDuration: cardAndPos.animDuration + 'ms'}}>
                            <UICard card={cardAndPos.card} isShown={true} elementStatus={ElementStatus.NORMAL}/>
                        </div>
                    </CSSTransition>
                })}
            </TransitionGroup>
        </div>
    }
}

/**
 * 负责乾坤大挪移
 */
export default class CardTransitManager {

    endpoints = new Map<string, CardEndpoint>()

    /**
     * 
     * @param endpoint endpoint 本身 null->unregister
     * @param id 必须是player ID / workflow / center
     * @param pos 可以是手牌, 或者其他. 若为null, 则表示通吃(所有位置的我都要!)
     */
    register=(endpoint: CardEndpoint, id: string)=>{
        if(!endpoint) {
            this.endpoints.delete(id)
            return
        }
        if(this.endpoints.has(id)) {
            throw `Already has registered: ${id}`
        }
        this.endpoints.set(id, endpoint)
    }

    onCardTransfer=(transfer: CardTransit)=>{
        let f: CardEndpoint = this.getEndpoint(transfer.from, transfer.fromPos)
        let t: CardEndpoint = this.getEndpoint(transfer.to, transfer.toPos)
        // let e: CardEndpoint = this.endpoints.get(transfer.from)
        if(!f || !t) {
            throw `Cannot find endpoint for id: ${transfer.from}, ${transfer.to}`
        }
        console.log('On Card Transfer', transfer)

        //do not remove if told (for show case only)
        let initial = f.performRemovalAnimation(transfer.cards, transfer.fromPos, transfer.doNotRemove).map(item => ({...item, 
            animDuration: transfer.animDurationSeconds,
            uuid: uuidv4()
        }))

        //only do animation if source and destination are different
        t.performAddAnimation(initial, transfer)
    }

    private getEndpoint(id: string, pos: CardPos) {
        return this.endpoints.get(id)
    }
}