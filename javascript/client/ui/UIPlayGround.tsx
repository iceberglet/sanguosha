import * as React from 'react'
import UIHpCol from './UIHpCol'
import { UIMarkRow } from './UICardRow'

import './ui-board.scss'
import UIEquipGrid from './UIEquipGrid'
import { PlayerInfo } from '../../common/PlayerInfo'
import { Checker, ElementStatus } from './UIBoard'
import { Mask } from '../../common/util/Util'
import { ClassFormatter } from '../../common/util/Togglable'
import { Coor } from '../effect/EffectProducer'
import Pubsub from '../../common/util/PubSub'
import { DamageEffect, CurrentPlayerEffect } from '../../common/transit/EffectTransit'
import { getDamageSpriteSheet } from '../effect/SpriteSheet'
import { CardPos } from '../../common/transit/CardPos'
import { StageDeclarer } from './UIMyPlayerCard'

const damageDuration = 2000

export const CENTER = 'center'

export class ScreenPosObtainer {
    getters = new Map<string, ()=>Coor>()
    registerObtainer(id: string, ref: React.RefObject<any>) {
        this.getters.set(id, ()=>{
            let {top, bottom, left, right} = ref.current.getBoundingClientRect()
            return {
                // playerId: this.props.info.player.id,
                x: (left + right) / 2,
                y: (top + bottom) / 2
            }
        })
    }
    getPos(id: string): Coor {
        return this.getters.get(id)()
    }
}

type PlayGroundProp = {
    players: PlayerInfo[],
    distanceComputer: (s: string)=>number,
    screenPosObtainer: ScreenPosObtainer,
    showDist: boolean,
    checker: Checker,
    pubsub: Pubsub
}

type State = {
    //players who are being damaged
    damageAnimation: Set<string>,
    currentPlayerEffect: CurrentPlayerEffect
}

export default class UIPlayGround extends React.Component<PlayGroundProp, State> {

    dom: React.RefObject<any>

    constructor(p: PlayGroundProp) {
        super(p)
        this.dom = React.createRef()
        p.screenPosObtainer.registerObtainer(CENTER, this.dom)
        p.pubsub.on(DamageEffect, (d: DamageEffect)=>{
            this.setState(s => {
                s.damageAnimation.add(d.targetPlayer)
                return s
            })
            setTimeout(()=>{
                this.setState(s => {
                    s.damageAnimation.delete(d.targetPlayer)
                    return s
                })
            }, damageDuration)
        })
        p.pubsub.on(CurrentPlayerEffect, (currentPlayerEffect: CurrentPlayerEffect)=>{
            this.setState({currentPlayerEffect})
        })

        this.state = {
            damageAnimation: new Set<string>(),
            currentPlayerEffect: new CurrentPlayerEffect(null, null)
        }
    }

    render() {
        let {players, screenPosObtainer, showDist, distanceComputer, checker} = this.props
        let {damageAnimation, currentPlayerEffect} = this.state
        let number = players.length
        let rows = 3
        if(number <= 2) {
            rows = 1
        } else if (number <= 5) {
            rows = 2
        }

        let cardGetter = (p: PlayerInfo, i: number) => {
            return <UIPlayerCard key={i} info={p} dist={showDist && distanceComputer(p.player.id)} 
                        screenPosObtainer={screenPosObtainer} isDamaged={damageAnimation.has(p.player.id)}
                        elementStatus={checker.getStatus(p.player.id)} effect={currentPlayerEffect}
                        onSelect={s=>checker.onClicked(s)}/>
        }

        return <div className='playground' ref={this.dom}>
            {/* render top row, row-reverse */}
            <div className='top-row'>
            {
                players.filter((p, i) => i >= rows - 1 && i <= players.length - rows).map(cardGetter)
            }
            </div>
            <div className='secondary-row go-up'>
            {
                rows > 2 && players.filter((p, i) => i === 1 || i === players.length - 2).map(cardGetter)
            }
            </div>
            <div className='secondary-row'>
            {
                rows > 1 && players.filter((p, i) => i === 0 || i === players.length - 1).map(cardGetter)
            }
            </div>
            {/* render any cards on the table */}
            {/* render any effects */}
        </div>
    }

}

type CardProp = {
    info: PlayerInfo,
    screenPosObtainer: ScreenPosObtainer,
    dist?: number,
    effect: CurrentPlayerEffect,
    elementStatus: ElementStatus,
    isDamaged: boolean,
    onSelect: (s: string)=>void
}

export class UIPlayerCard extends React.Component<CardProp, object> {

    dom: React.RefObject<any>

    constructor(p: CardProp) {
        super(p)
        this.dom = React.createRef()
        p.screenPosObtainer.registerObtainer(p.info.player.id, this.dom)
    }

    onClick=()=>{
        if(this.props.elementStatus.isSelectable) {
            console.log('selected', this.props.info.player.id)
            this.props.onSelect(this.props.info.player.id)
        }
    }

    render() {
        let {info, dist, elementStatus, isDamaged, effect} = this.props
        let inMyTurn = effect.player === info.player.id
        let clazz = new ClassFormatter('ui-player-card')
                        .and(elementStatus.isSelectable, 'selectable')
                        .and(elementStatus === ElementStatus.SELECTED, 'selected')
                        .and(isDamaged, 'damaged')
                        .and(inMyTurn, 'in-turn')
                        .done()
        //todo: highlight, click
        return <div className={clazz} ref={this.dom} onClick={this.onClick}>
            {info.draw()}

            {dist && <div className='distance occupy'>{dist}</div>}

            {info.isDead || 
                <div>
                    <div className='hand'>{info.getCards(CardPos.HAND).length}</div>
                    <div className='player-hp'>
                        <UIHpCol current={info.hp} total={info.maxHp} />
                    </div>
                    <div className='equipments'>
                        <UIEquipGrid cards={info.getCards(CardPos.EQUIP)}/>
                    </div>
                    <div className='judge'>
                        <UIMarkRow marks={info.getJudgeCards()} />
                    </div>
                </div>
            }
            {inMyTurn && <StageDeclarer stage={effect.stage} className='left-btm-corner' />}
            {isDamaged && getDamageSpriteSheet()}
            <Mask isMasked={elementStatus === ElementStatus.DISABLED}/>
        </div>
    }
}