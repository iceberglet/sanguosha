import * as React from 'react'
import {v4 as uuidv4} from 'uuid'
import { EffectTransit } from '../../common/transit/EffectTransit'
import { ScreenPosObtainer } from '../ui/UIPlayGround'
import './effect-producer.scss'



const rayDuration = 2500
const textDuration = 3000

export type Coor = {
    x: number
    y: number
}

export type Ray = {
    from: Coor,
    to: Coor,
    dashOffset: number,
    dashArray: number
}

type State = {
    rays: Map<string, Ray>
    texts: Map<string, Coor>
}

type Prop = {
    screenPosObtainer: ScreenPosObtainer
}

export default class EffectProducer extends React.Component<Prop, State> {

    constructor(p: any) {
        super(p)
        this.state = {
            rays: new Map<string, Ray>(),
            texts: new Map<string, Coor>()
        }
    }

    processEffect(effect: EffectTransit) {
        let o = this.props.screenPosObtainer
        effect.targetPlayers?.forEach(t => {
            this.drawRay(o.getPos(effect.sourcePlayer), o.getPos(t))
            this.flashText(o.getPos(effect.sourcePlayer), effect.sourceText)
        })
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
                s.rays.delete(text)
                return s
            })
        }, textDuration)
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

    render() {
        return <div className='effect-container occupy'>
            <svg className='ray-container' width='100%' height='100%'>
                {this.renderRays()}
            </svg>
            {this.renderTexts()}
        </div>
    }

}