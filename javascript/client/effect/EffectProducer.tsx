import * as React from 'react'
import {v4 as uuidv4} from 'uuid'
import { TextFlashEffect, TransferCardEffect } from '../../common/transit/EffectTransit'
import './effect-producer.scss'
import Card, { CardManager } from '../../common/cards/Card'
import UICard from '../ui/UICard'
import { ElementStatus } from '../ui/UIBoard'
import { CENTER } from '../ui/UIWorkflowRow'
import { getEffect } from './SpriteSheet'
import { Coor, ScreenPosObtainer } from '../ui/ScreenPosObtainer'

const rayDuration = 2500
const textDuration = 3000
const animDuration = 16 / 60 * 1000
const cardFloatDuration = 1750


export type Ray = {
    from: Coor,
    to: Coor,
    dashOffset: number,
    dashArray: number
}

type FieldCards = {
    cards: Card[],
    pos: Coor
}

type State = {
    rays: Map<string, Ray>
    texts: Map<string, Coor>
    fieldCards: Map<string, FieldCards>
    sheets: Map<number, [Coor, React.ReactElement]>
}

type Prop = {
    screenPosObtainer: ScreenPosObtainer
}

let counter = 0

export default class EffectProducer extends React.Component<Prop, State> {

    constructor(p: any) {
        super(p)
        this.state = {
            rays: new Map<string, Ray>(),
            texts: new Map<string, Coor>(),
            fieldCards: new Map<string, FieldCards>(),
            sheets: new Map<number, [Coor, React.ReactElement]>()
        }
    }

    processEffect(effect: TextFlashEffect) {
        let o = this.props.screenPosObtainer
        let id = counter++
        let sprites = getEffect(effect.sourceText, 
                                ()=>{
                                    console.log('Remove Sprites', id)
                                    this.setState(s => {
                                        s.sheets.delete(id)
                                        return s
                                    })
                                }) 
        if(sprites) {
            let b = o.getPos(CENTER)
            let a = o.getPos(effect.sourcePlayer)
            let l = 140
            let dx = b.x - a.x, dy = b.y - a.y
            let ratio = Math.sqrt(dx * dx / (dx * dx + dy * dy))
            let target: Coor = {x: a.x + l * ratio * Math.sign(dx), y: a.y + l * Math.sqrt(1 - ratio * ratio) * Math.sign(dy) }
            console.log('From', a, ratio, target)
            this.setState(s => {
                s.sheets.set(id, [target, sprites])
                return s
            })
        } else {
            this.flashText(o.getPos(effect.sourcePlayer), effect.sourceText)
        }
        effect.targetPlayers?.forEach(t => {
            this.drawRay(o.getPos(effect.sourcePlayer), o.getPos(t))
        })
    }

    transferCards(effect: TransferCardEffect, cardManager: CardManager) {
        if(effect.source === effect.target) {
            throw `Source and Target are the same!! ${effect}`
        }
        let o = this.props.screenPosObtainer
        let from = o.getPos(effect.source || CENTER)
        let to = o.getPos(effect.target || CENTER)
        let cards = effect.cards.map(c => cardManager.getCard(c))
        let id = uuidv4()
        this.setState(s => {s.fieldCards.set(id, {pos: from, cards}); return s})
        setTimeout(()=>this.setState(s => {
            s.fieldCards.set(id, {pos: to, cards}); return s
        }), 20)
        //remove after use
        setTimeout(()=>this.setState(s => {
            s.fieldCards.delete(id); return s
        }), cardFloatDuration)
    }

    drawRay(from: Coor, to: Coor)  {
        let id = uuidv4()
        let x1 = from.x, y1 = from.y
        let x2 = to.x, y2 = to.y
        let l = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2)*(y1 - y2))
        this.setState(s => {
            //set start
            s.rays.set(id, {from, to, dashArray: 4*l, dashOffset: 4*l})
            return s
        }, ()=>{
            //set end
            setTimeout(()=>this.setState(s => {
                if(s.rays.has(id)) {
                    s.rays.set(id, {from, to, dashArray: 4*l, dashOffset: -1*l})
                    return s
                }
            }), 20)
        })
        //remove after use
        setTimeout(()=>{
            this.setState(s => {
                s.rays.delete(id)
                return s
            })
        }, rayDuration)
    }

    flashText(coor: Coor, text: string) {
        this.setState(s => {
            s.texts.set(text, coor)
            return s
        })
        // remove after use
        setTimeout(()=>{
            this.setState(s => {
                s.texts.delete(text)
                return s
            })
        }, textDuration)
    }

    flashEffect(id: number, coor: Coor, sheet: React.ReactElement) {
        this.setState(s => {
            s.sheets.set(id, [coor, sheet])
            return s
        })
        // remove after use
        setTimeout(()=>{
            this.setState(s => {
                s.sheets.delete(id)
                return s
            })
        }, animDuration)
    }

    renderRays() {
        let rays: React.ReactElement[] = []
        this.state.rays.forEach((v, k) => {
            let x1 = v.from.x, y1 = v.from.y
            let x2 = v.to.x, y2 = v.to.y
            let path = `M ${x1} ${y1} L ${x2} ${y2}`
            rays.push(<path key={k} className='ray' d={path} style={{strokeDasharray: v.dashArray, strokeDashoffset: v.dashOffset}}/>)
        })
        return rays
    }

    renderTexts() {
        let texts: React.ReactElement[] = []
        this.state.texts.forEach((c, t)=>{
            texts.push(<div key={t} className='text' style={{left: c.x + 'px', top: c.y + 'px'}}>{t}</div>)
        })
        return texts
    }

    renderEffects() {
        let res: React.ReactElement[] = []
        this.state.sheets.forEach((el, id)=>{
            let c = el[0]
            res.push(<div key={id} className='sprite-container center' style={{left: c.x + 'px', top: c.y + 'px'}}>{el[1]}</div>)
        })
        return res
    }

    renderCards() {
        let cards: React.ReactElement[] = [], count = 0
        this.state.fieldCards.forEach((f, id) => {
            let width = Math.max(100, f.cards.length * 24)
            cards.push(<div key={id} className='floating-cards' style={{
                        width: width + 'px', 
                        left: f.pos.x - width / 2 + 'px', 
                        top: f.pos.y + 'px'}}>
                {f.cards.map(c => <div key={count++} className='card-holder'>
                    <UICard isShown={true} card={c} elementStatus={ElementStatus.NORMAL}/>
                </div>)}
            </div>)
        })
        return cards
    }

    render() {
        return <div className='effect-container occupy'>
            <svg className='ray-container' width='100%' height='100%'>
                {this.renderRays()}
            </svg>
            {this.renderTexts()}
            {this.renderCards()}
            {this.renderEffects()}
        </div>
    }

}