import * as React from 'react'
import UIHpCol from './UIHpCol'
import { UIMarkRow } from './UICardRow'
import UIEquipGrid from './UIEquipGrid'
import { Mask, toChinese } from '../../common/util/Util'
import { ClassFormatter } from '../../common/util/Togglable'
import { getDamageSpriteSheet } from '../effect/SpriteSheet'
import { CardPos } from '../../common/transit/CardPos'
import { StageDeclarer } from './UIMyPlayerCard'
import './ui-player-card.scss'
import { PlayerInfo } from '../../common/PlayerInfo'
import { ScreenPosObtainer } from './ScreenPosObtainer'
import { CurrentPlayerEffect } from '../../common/transit/EffectTransit'
import { ElementStatus } from './UIBoard'
import CardTransitManager, { DefaultCardEndpoint, CardEndpoint } from './CardTransitManager'

type CardProp = {
    info: PlayerInfo,
    screenPosObtainer: ScreenPosObtainer,
    dist?: number,
    effect: CurrentPlayerEffect,
    elementStatus: ElementStatus,
    isDamaged: boolean,
    onSelect: (s: string)=>void,
    cardTransitManager: CardTransitManager
}

export class UIPlayerCard extends React.Component<CardProp, object> {

    dom: React.RefObject<HTMLDivElement>

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

    doRegister=(e: CardEndpoint)=>{
        this.props.cardTransitManager.register(e, this.props.info.player.id)
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
                        <UIMarkRow marks={info.getCards(CardPos.JUDGE)} />
                    </div>
                </div>
            }
            {inMyTurn && <StageDeclarer stage={effect.stage} className='left-btm-corner' />}
            {isDamaged && <div className='occupy'>{getDamageSpriteSheet()}</div>}
            {info.isDead && <img className='death' src='ui/dead.png'/>}
            <Mask isMasked={elementStatus === ElementStatus.DISABLED}/>
            <div className='seat-number'>{toChinese(info.idx)}</div>
            <DefaultCardEndpoint info={info} callback={()=>this.forceUpdate()} ref={this.doRegister}/>
        </div>
    }
}