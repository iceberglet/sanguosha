import * as React from 'react'
import { getOffset } from './UIOffset'
import UIHpCol from './UIHpCol'
import { PlayerInfo } from '../../common/PlayerInfo'
import './ui-my-player-card.scss'
import { ClassFormatter } from '../../common/util/Togglable'
import { ElementStatus } from './UIBoard'
import { Mask } from '../../common/util/Util'
import Pubsub from '../../common/util/PubSub'
import { DamageEffectTransit } from '../../common/transit/EffectTransit'
import { getDamageSpriteSheet } from '../effect/SpriteSheet'

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
}

export class UIMyPlayerCard extends React.Component<CardProp, State> {

    constructor(p: CardProp) {
        super(p)
        p.pubsub.on(DamageEffectTransit, (d: DamageEffectTransit)=>{
            if(d.targetPlayer !== p.info.player.id) {
                return
            }
            this.setState({damaged: true})
            setTimeout(()=>this.setState({damaged: false}), damageDuration)
        })
        this.state = {
            damaged: false
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
        let {damaged} = this.state
        let clazz = new ClassFormatter('ui-player-card ui-my-player-card')
                        .and(elementStatus.isSelectable, 'selectable')
                        .and(elementStatus === ElementStatus.SELECTED, 'selected')
                        .and(damaged, 'damaged')
                        .done()
        return <div className={clazz}  onClick={this.onClick}>
            <div className='occupy overflow-hidden'>
                <div className='card-avatar' 
                    style={{backgroundImage: `url('generals/${info.general.id}.png')`, ...getOffset(info.general.id)}} />
            </div>
            <div className='player-name'>{info.player.id}</div>
            <div className='general-name'>{info.general.name}</div>
            <div className='faction' style={{backgroundImage: `url('icons/${info.general.faction.image}.png')`}} />
            <div className='identity' style={{backgroundImage: `url('icons/${info.identity.id}.png')`}}/>
            <div className='player-hp'>
                <UIHpCol current={info.hp} total={info.maxHp} />
            </div>
            
            {damaged && getDamageSpriteSheet()}
            <Mask isMasked={elementStatus === ElementStatus.DISABLED}/>
        </div>
    }
}