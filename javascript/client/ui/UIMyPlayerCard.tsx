import * as React from 'react'
import UIHpCol from './UIHpCol'
import { PlayerInfo } from '../../common/PlayerInfo'
import './ui-my-player-card.scss'
import { ClassFormatter } from '../../common/util/Togglable'
import { ElementStatus } from './UIBoard'
import { Mask } from '../../common/util/Util'
import Pubsub from '../../common/util/PubSub'
import { DamageEffect, CurrentPlayerEffect } from '../../common/transit/EffectTransit'
import { getDamageSpriteSheet } from '../effect/SpriteSheet'
import { Stage } from '../../common/Stage'

const damageDuration = 2000

type CardProp = {
    info: PlayerInfo
    onUseSkill: (s: string)=>void,
    elementStatus: ElementStatus,
    onSelect: (s: string)=>void,
    pubsub: Pubsub
}

type State = {
    damaged: boolean
    effect: CurrentPlayerEffect
}

export class UIMyPlayerCard extends React.Component<CardProp, State> {

    constructor(p: CardProp) {
        super(p)
        p.pubsub.on(DamageEffect, (d: DamageEffect)=>{
            if(d.targetPlayer !== p.info.player.id) {
                return
            }
            this.setState({damaged: true})
            setTimeout(()=>this.setState({damaged: false}), damageDuration)
        })
        p.pubsub.on(CurrentPlayerEffect, (e: CurrentPlayerEffect)=>this.setState({effect: e}))
        this.state = {
            damaged: false,
            effect: new CurrentPlayerEffect(null, null)
        }
    }

    onClick=()=>{
        if(this.props.elementStatus.isSelectable) {
            console.log('selected', this.props.info.player.id)
            this.props.onSelect(this.props.info.player.id)
        }
    }

    render() {
        let {info, elementStatus} = this.props
        let {damaged,effect} = this.state
        let clazz = new ClassFormatter('ui-player-card ui-my-player-card')
                        .and(elementStatus.isSelectable, 'selectable')
                        .and(elementStatus === ElementStatus.SELECTED, 'selected')
                        .and(damaged, 'damaged')
                        .done()

        return <div className={clazz}  onClick={this.onClick}>
            {info.drawSelf()}
            <div className='player-hp'>
                <UIHpCol current={info.hp} total={info.maxHp} />
            </div>
            
            {effect.player === info.player.id && <StageDeclarer stage={effect.stage} className={'top-right-corner'}/>}
            {damaged && getDamageSpriteSheet()}
            {info.isDead && <img className='death' src='ui/dead.png'/>}
            <Mask isMasked={elementStatus === ElementStatus.DISABLED}/>
        </div>
    }
}

type Prop = {
    stage: Stage
    className: string
}

export function StageDeclarer(p: Prop) {

    return <div key={p.stage.name} className={p.className + ' player-stage'} style={{background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${p.stage.color} 25%, ${p.stage.color} 75%, rgba(255,255,255,0) 100%)`}}>
        {p.stage.name}
    </div>

} 