import * as React from 'react'

import { PlayerInfo } from '../../common/PlayerInfo'
import { Checker, ElementStatus } from './UIBoard'
import Pubsub from '../../common/util/PubSub'
import { DamageEffect, CurrentPlayerEffect } from '../../common/transit/EffectTransit'
import { UIWorkflowCardRow } from './UIWorkflowRow'
import { CardManager } from '../../common/cards/Card'
import { ScreenPosObtainer } from './ScreenPosObtainer'
import { UIPlayerCard } from './UIPlayerCard'
import CardTransitManager, { DeckEndpoint } from './CardTransitManager'

const damageDuration = 2000

type PlayGroundProp = {
    players: PlayerInfo[],
    distanceComputer: (s: string)=>number,
    screenPosObtainer: ScreenPosObtainer,
    showDist: boolean,
    checker: Checker,
    pubsub: Pubsub,
    cardManager: CardManager,
    cardTransitManager: CardTransitManager
}

type State = {
    //players who are being damaged
    damageAnimation: Set<string>,
    currentPlayerEffect: CurrentPlayerEffect
}

export default class UIPlayGround extends React.Component<PlayGroundProp, State> {

    constructor(p: PlayGroundProp) {
        super(p)
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
        let {players, screenPosObtainer, showDist, distanceComputer, checker, cardManager, pubsub, cardTransitManager} = this.props
        let {damageAnimation, currentPlayerEffect} = this.state
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
                        effect={currentPlayerEffect} cardTransitManager={cardTransitManager}
                        onSelect={s=>checker.onClicked(s)}/>
        }

        return <div className='occupy'>
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
            <DeckEndpoint cardTransitManager={cardTransitManager}/>
            <UIWorkflowCardRow cardManager={cardManager} screenPosObtainer={screenPosObtainer} cardTransitManager={cardTransitManager}/>
        </div>
    }

}
