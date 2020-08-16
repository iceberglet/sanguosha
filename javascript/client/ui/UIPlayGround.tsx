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
import { WorkflowCard, WorkflowTransit } from '../../common/transit/WorkflowCard'
import { UIWorkflowCardRow } from './UIWorkflowRow'
import { CardManager } from '../../common/cards/Card'

const damageDuration = 2000

const workflowCardNo = 10

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
        let getter = this.getters.get(id)
        console.log(id, getter)
        return getter()
    }
}

type PlayGroundProp = {
    players: PlayerInfo[],
    distanceComputer: (s: string)=>number,
    screenPosObtainer: ScreenPosObtainer,
    showDist: boolean,
    checker: Checker,
    pubsub: Pubsub,
    cardManager: CardManager
}

type State = {
    //players who are being damaged
    damageAnimation: Set<string>,
    currentPlayerEffect: CurrentPlayerEffect,
    workflowCards: WorkflowCard[],
    head: WorkflowCard[]
}

export default class UIPlayGround extends React.Component<PlayGroundProp, State> {

    dom: React.RefObject<any>
    flowTooMuchTimeout: NodeJS.Timeout

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
        p.pubsub.on(WorkflowTransit, (transit: WorkflowTransit)=>{
            if(transit.removeHead()) {
                this.setState({head: [], workflowCards: []})
                clearTimeout(this.flowTooMuchTimeout)
            } else if (transit.isHead){
                this.setState({head: transit.cards, workflowCards: []})
                clearTimeout(this.flowTooMuchTimeout)
            } else {
                let workflowCards: WorkflowCard[] = [...this.state.workflowCards, ...transit.cards]
                let todrop = transit.cards.length
                while(workflowCards.length > workflowCardNo) {
                    workflowCards.shift()
                    todrop--
                }
                this.setState({workflowCards})
                if(todrop > 0) {
                    this.flowTooMuchTimeout = setTimeout(()=>{
                        this.setState({workflowCards: this.state.workflowCards.slice(todrop)})
                    }, 7000)
                }
            }
        })

        this.state = {
            damageAnimation: new Set<string>(),
            currentPlayerEffect: new CurrentPlayerEffect(null, null),
            workflowCards: [],
            head: []
        }
    }

    render() {
        let {players, screenPosObtainer, showDist, distanceComputer, checker, cardManager} = this.props
        let {damageAnimation, currentPlayerEffect, workflowCards, head} = this.state
        let number = players.length
        let rows = 3
        if(number <= 2) {
            rows = 1
        } else if (number <= 5) {
            rows = 2
        }

        let cardGetter = (p: PlayerInfo, i: number) => {
            return <UIPlayerCard key={i} info={p} dist={showDist && !p.isDead && distanceComputer(p.player.id)} 
                        screenPosObtainer={screenPosObtainer} isDamaged={damageAnimation.has(p.player.id)}
                        elementStatus={p.isDead? ElementStatus.NORMAL : checker.getStatus(p.player.id)} 
                        effect={currentPlayerEffect}
                        onSelect={s=>checker.onClicked(s)}/>
        }

        return <div className='playground'>
            {/* render top row, row-reverse */}
            <div className='top-row'>
            {
                players.filter((p, i) => i >= rows - 1 && i <= players.length - rows).map(cardGetter)
            }
            </div>
            
            {rows > 2 && <div className='secondary-row go-up'>
                {players.filter((p, i) => i === 1 || i === players.length - 2).map(cardGetter)}
            </div>}
            
            {rows > 1 && <div className={'secondary-row ' + (rows > 2 || 'go-up')}>
                {players.filter((p, i) => i === 0 || i === players.length - 1).map(cardGetter)}
            </div>}
            {/* render any cards on the table */}
            <div className={'workflow-row'} ref={this.dom}>
                <UIWorkflowCardRow cardManager={cardManager} head={head} cards={workflowCards}/>
            </div>
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
        if(!this.props.info.isDead && this.props.elementStatus.isSelectable) {
            console.log('selected', this.props.info.player.id)
            this.props.onSelect(this.props.info.player.id)
        }
    }

    render() {
        let {info, dist, elementStatus, isDamaged, effect} = this.props
        let inMyTurn = effect.player === info.player.id
        let clazz = new ClassFormatter('ui-player-card')
                        .and(!info.isDead && elementStatus.isSelectable, 'selectable') //can never select dead ppl
                        .and(elementStatus === ElementStatus.SELECTED, 'selected')
                        .and(isDamaged, 'damaged')
                        .and(inMyTurn, 'in-turn')
                        .done()
        //todo: highlight, click
        return <div className={clazz} ref={this.dom} onClick={this.onClick}>
            {info.draw()}
            
            <Mask isMasked={info.isDrunk} maskClass={'drunk'} />
            <Mask isMasked={info.isTurnedOver} maskClass={'turned-over'} />
            {info.isTurnedOver && <div className='occupy center'>翻面</div>}
            

            {dist && <div className='distance occupy'>{dist}</div>}

            {info.isDead || 
                <div>
                    <div className='hand'>{info.getCards(CardPos.HAND).length}</div>
                    <div className='player-hp'>
                        <UIHpCol current={info.hp} total={info.maxHp} />
                    </div>
                    <div className='equipments'>
                        <UIEquipGrid big={false} cards={info.getCards(CardPos.EQUIP)}/>
                    </div>
                    <div className='judge'>
                        <UIMarkRow marks={info.getJudgeCards()} />
                    </div>
                </div>
            }
            {inMyTurn && <StageDeclarer stage={effect.stage} className='left-btm-corner' />}
            {isDamaged && getDamageSpriteSheet()}
            {info.isDead && <img className='death' src='ui/dead.png'/>}
            <Mask isMasked={elementStatus === ElementStatus.DISABLED}/>
        </div>
    }
}