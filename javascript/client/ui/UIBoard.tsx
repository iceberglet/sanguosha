import * as React from 'react'
import GameContext, { PlayerInfo } from '../../common/GameContext'
import UIHpCol from './UIHpCol'
import UICardRow from './UICardRow'

import './ui-board.scss'
import UIEquipGrid from './UIEquipGrid'
import { getOffset } from './UIOffset'

type UIBoardProp = {
    myId: string
    context: GameContext
}

export default class UIBoard extends React.Component<UIBoardProp, object> {

    getOthers(): PlayerInfo[] {
        let {myId, context} = this.props
        let idx = context.playerInfos.findIndex(p => p.player.id === myId)
        return [...context.playerInfos.slice(idx + 1), ...context.playerInfos.slice(0, idx)]
    }

    render() {
        let {myId, context} = this.props
        let playerInfo = context.getPlayer(myId)
        
        console.log(context.playerInfos.map(p => p.general.name))
        console.log(this.getOthers().map(p => p.general.name))

        return <div className='board occupy' style={{}}>
            <div className='top'>
                <UIPlayGround players={this.getOthers()}/>
                <div className='chat-logger'>
                    {/* <img className='occupy' src={'ui/container-horizontal.png'}/> */}
                </div>
            </div>
            <div className='btm'>
                {/* 状态 */}
                <div className='my-status'>
                    <div className='avatar' style={{backgroundImage: `url('generals/${playerInfo.general.id}.png')`}}></div>
                    {/* <img className='avatar' src={`generals/${playerInfo.general.id}.png`} alt={playerInfo.general.id}/> */}
                    <div className='hp-container'>
                        <UIHpCol current={playerInfo.hp} total={playerInfo.maxHp} />
                    </div>
                    <div className='skills-container'>

                    </div>
                </div>
                {/* 装备牌 */}
                <div className='my-equip'>
                    <UIEquipGrid cards={playerInfo.cards.get('equip')}/>
                </div>
                {/* 手牌 */}
                <div className='my-cards'>
                    <UICardRow cards={playerInfo.cards.get('hand')} isShown={true}/>
                </div>
                {/* 判定牌 */}
                <div className='my-judge'></div>
            </div>
        </div>
    }
}

type PlayGroundProp = {
    players: PlayerInfo[]
}

class UIPlayGround extends React.Component<PlayGroundProp, object> {

    render() {
        let {players} = this.props
        let number = players.length
        let rows = 3
        if(number <= 2) {
            rows = 1
        } else if (number <= 5) {
            rows = 2
        }

        return <div className='playground'>
            {/* render top row, row-reverse */}
            <div className='top-row'>
            {
                players.filter((p, i) => i >= rows - 1 && i <= players.length - rows)
                    .map((p, i) => <UIPlayerCard key={i} info={p}/>)
            }
            </div>
            <div className='secondary-row go-up'>
            {
                rows > 2 && players.filter((p, i) => i === 1 || i === players.length - 2)
                    .map((p, i) => <UIPlayerCard key={i} info={p}/>)
            }
            </div>
            <div className='secondary-row'>
            {
                rows > 1 && players.filter((p, i) => i === 0 || i === players.length - 1)
                    .map((p, i) => <UIPlayerCard key={i} info={p}/>)
            }
            </div>
            {/* render any cards on the table */}
            {/* render any effects */}
        </div>
    }

}

type CardProp = {
    info: PlayerInfo
}

export class UIPlayerCard extends React.Component<CardProp, object> {

    render() {
        let {info} = this.props
        return <div className='ui-player-card'>
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
            <div className='equipments'>
                <UIEquipGrid cards={info.cards.get('equip') || []}/>
            </div>
        </div>
    }
}