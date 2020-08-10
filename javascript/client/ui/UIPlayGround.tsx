import * as React from 'react'
import UIHpCol from './UIHpCol'
import { UIMarkRow } from './UICardRow'

import './ui-board.scss'
import UIEquipGrid from './UIEquipGrid'
import { getOffset } from './UIOffset'
import { PlayerInfo } from '../../common/PlayerInfo'
import { Checker, ElementStatus } from './UIBoard'
import { Mask } from '../../common/util/Util'
import { ClassFormatter } from '../../common/util/Togglable'
import { Coor } from '../effect/EffectProducer'
import Pubsub from '../../common/util/PubSub'
import { DamageEffect } from '../../common/transit/EffectTransit'
import { getDamageSpriteSheet } from '../effect/SpriteSheet'
import { CardPos } from '../../common/transit/ContextTransit'

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
    damageAnimation: Set<string>
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

        this.state = {
            damageAnimation: new Set<string>()
        }
    }

    render() {
        let {players, screenPosObtainer, showDist, distanceComputer, checker} = this.props
        let {damageAnimation} = this.state
        let number = players.length
        let rows = 3
        if(number <= 2) {
            rows = 1
        } else if (number <= 5) {
            rows = 2
        }

        return <div className='playground' ref={this.dom}>
            {/* render top row, row-reverse */}
            <div className='top-row'>
            {
                players.filter((p, i) => i >= rows - 1 && i <= players.length - rows)
                    .map((p, i) => <UIPlayerCard key={i} info={p} dist={showDist && distanceComputer(p.player.id)} 
                                                screenPosObtainer={screenPosObtainer} isDamaged={damageAnimation.has(p.player.id)}
                                                elementStatus={checker.getStatus(p.player.id)}
                                                onSelect={s=>checker.onClicked(s)}/>)
            }
            </div>
            <div className='secondary-row go-up'>
            {
                rows > 2 && players.filter((p, i) => i === 1 || i === players.length - 2)
                    .map((p, i) => <UIPlayerCard key={i} info={p} dist={showDist && distanceComputer(p.player.id)} screenPosObtainer={screenPosObtainer}
                                                elementStatus={checker.getStatus(p.player.id)} isDamaged={damageAnimation.has(p.player.id)}
                                                onSelect={s=>checker.onClicked(s)}/>)
            }
            </div>
            <div className='secondary-row'>
            {
                rows > 1 && players.filter((p, i) => i === 0 || i === players.length - 1)
                    .map((p, i) => <UIPlayerCard key={i} info={p} dist={showDist && distanceComputer(p.player.id)} screenPosObtainer={screenPosObtainer}
                                                elementStatus={checker.getStatus(p.player.id)} isDamaged={damageAnimation.has(p.player.id)}
                                                onSelect={s=>checker.onClicked(s)}/>)
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
        let {info, dist, elementStatus, isDamaged} = this.props
        let clazz = new ClassFormatter('ui-player-card')
                        .and(elementStatus.isSelectable, 'selectable')
                        .and(elementStatus === ElementStatus.SELECTED, 'selected')
                        .and(isDamaged, 'damaged')
                        .done()
        //todo: highlight, click
        return <div className={clazz} ref={this.dom} onClick={this.onClick}>
            <div className='occupy overflow-hidden'>
                <div className='card-avatar' 
                    style={{backgroundImage: `url('generals/${info.general.id}.png')`, ...getOffset(info.general.id)}} />
            </div>
            <div className='player-name'>{info.player.id}</div>
            <div className='general-name'>{info.general.name}</div>
            <div className='faction' style={{backgroundImage: `url('icons/${info.general.faction.image}.png')`}} />
            <div className='identity' style={{backgroundImage: `url('icons/${info.identity.id}.png')`}}/>

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
            
            {isDamaged && getDamageSpriteSheet()}
            <Mask isMasked={elementStatus === ElementStatus.DISABLED}/>
        </div>
    }
}