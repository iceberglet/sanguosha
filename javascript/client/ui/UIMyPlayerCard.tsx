import * as React from 'react'
import UIHpCol from './UIHpCol'
import { PlayerInfo } from '../../common/PlayerInfo'
import './ui-my-player-card.scss'
import { ClassFormatter } from '../../common/util/Togglable'
import { ElementStatus, Checker } from './UIBoard'
import { Mask } from '../../common/util/Util'
import Pubsub from '../../common/util/PubSub'
import { DamageEffect, CurrentPlayerEffect } from '../../common/transit/EffectTransit'
import { getDamageSpriteSheet } from '../effect/SpriteSheet'
import { Stage } from '../../common/Stage'
import { SkillStatus, Skill } from '../../game-mode-faction/skill/Skill'

const damageDuration = 2000

type CardProp = {
    info: PlayerInfo
    elementStatus: ElementStatus,
    onSelect: (s: string)=>void,
    pubsub: Pubsub,
    skillButtons: SkillButtonProp[]
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
            effect: new CurrentPlayerEffect(null, null, new Set<string>())
        }
    }

    onClick=()=>{
        if(this.props.elementStatus.isSelectable) {
            console.log('selected', this.props.info.player.id)
            this.props.onSelect(this.props.info.player.id)
        }
    }

    render() {
        let {info, elementStatus, skillButtons} = this.props
        let {damaged,effect} = this.state
        let pendingOnMe = effect.pendingUser?.has(info.player.id)
        let clazz = new ClassFormatter('ui-player-card ui-my-player-card')
                        .and(elementStatus.isSelectable, 'selectable')
                        .and(elementStatus === ElementStatus.SELECTED, 'selected')
                        .and(damaged, 'damaged')
                        .and(pendingOnMe, 'glow-on-hover')
                        .done()

        return <div className={clazz}  onClick={this.onClick}>
            {info.drawSelf(skillButtons)}
            
            <Mask isMasked={info.isDrunk} maskClass={'drunk'} />
            <Mask isMasked={info.isTurnedOver} maskClass={'turned-over'} />
            {info.isTurnedOver && <div className='occupy center font-big'>翻面</div>}
            <div className='player-hp'>
                <UIHpCol current={info.hp} total={info.maxHp} />
            </div>
            
            {effect.player === info.player.id && <StageDeclarer stage={effect.stage} className={'top-right-corner'}/>}
            {damaged && <div className='occupy'>{getDamageSpriteSheet()}</div>}
            {info.isDead && <img className='death' src='ui/dead.png'/>}
            {info.isChained && <div className='tie-suo' />}
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

export type SkillButtonProp = {
    skill: Skill
    skillChecker: Checker
    statusUpdater: (skillEvent: SkillStatus)=>void
}

type ButtonProp = SkillButtonProp & {
    className: string
}

export function SkillButton(p: ButtonProp) {
    
    // isRevealed = false
    //      click => send event: isForewarned = true / false
    // isRevealed = true
    //      enabled if it is enabled, and player action triggers it (via checker)?
    //      
    let {isRevealed, isDisabled, isForewarned} = p.skill
    let cb = ()=>{
        if(isRevealed) {
            if (p.skillChecker?.getStatus(p.skill.id).isSelectable && !isDisabled){
                p.skillChecker.onClicked(p.skill.id)
            } else {
                console.log('Clicked on ', p.skill.id, ' but not reacting as the skill is disabled or not appropriate')
            }
        } else {
            if(p.skillChecker?.getStatus(p.skill.id).isSelectable) {
                console.log('Skill is not revealed but we are forcing it through a given action')
                p.skillChecker.onClicked(p.skill.id)
            } else {
                let status = p.skill.toStatus()
                status.isForewarned = !status.isForewarned
                console.log('Player Changing Forewarnning ', p.skill.id, status)
                p.statusUpdater(status)
            }
        }
    }

    let clazz: string
    if(isRevealed) {
        let status = (p.skillChecker?.getStatus(p.skill.id)) || ElementStatus.NORMAL
        clazz = new ClassFormatter('skill-button center ' + p.className)
                    .and(status.isSelectable && !p.skill.isDisabled, 'selectable')
                    .and(status === ElementStatus.SELECTED, 'selected')
                    .done()
    } else {
        clazz = new ClassFormatter('skill-button center selectable ' + p.className)
                    .and(isForewarned, 'selected')
                    // .and(!isDisabled, 'enabled') //即使暗置也可以使用
                    .done()
    }

    return <div className={clazz} onClick={cb} >
        {p.skill.displayName}
    </div>
}