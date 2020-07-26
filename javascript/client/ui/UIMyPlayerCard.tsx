import * as React from 'react'
import { getOffset } from './UIOffset'
import UIHpCol from './UIHpCol'
import { PlayerInfo } from '../../common/PlayerInfo'
import './ui-my-player-card.scss'

type CardProp = {
    info: PlayerInfo
    onUseSkill: (s: string)=>void
}

export class UIMyPlayerCard extends React.Component<CardProp, object> {

    render() {
        let {info} = this.props
        return <div className='ui-player-card ui-my-player-card'>
            <div className='occupy overflow-hidden'>
                <div className='card-avatar' 
                    style={{backgroundImage: `url('generals/${info.general.id}.png')`, ...getOffset(info.general.id)}} />
            </div>
            <div className='player-name'>{info.player.name}</div>
            <div className='general-name'>{info.general.name}</div>
            <div className='faction' style={{backgroundImage: `url('icons/${info.general.faction.image}.png')`}} />
            <div className='identity' style={{backgroundImage: `url('icons/${info.identity.id}.png')`}}/>
            <div className='player-hp'>
                <UIHpCol current={info.hp} total={info.maxHp} />
            </div>
        </div>
    }
}