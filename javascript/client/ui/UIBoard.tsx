import * as React from 'react'
import GameContext from '../../common/GameContext'
import UIHpCol from './UIHpCol'
import UICardRow, { UIMarkRow } from './UICardRow'

import './ui-board.scss'
import UIEquipGrid from './UIEquipGrid'
import { getOffset } from './UIOffset'
import { PlayerInfo } from '../../common/PlayerInfo'
import { UIMyPlayerCard } from './UIMyPlayerCard'
import UIButton from './UIButton'

type UIBoardProp = {
    myId: string
    context: GameContext
}

type Pos = {
    playerId: string,
    x: number,
    y: number
}

class ScreenPosObtainer {
    getters = new Map<string, ()=>Pos>()
    registerObtainer(id: string, getter: ()=>Pos) {
        this.getters.set(id, getter)
    }
    getPos(id: string): Pos {
        return this.getters.get(id)()
    }
}

export default class UIBoard extends React.Component<UIBoardProp, object> {

    screenPosObtainer: ScreenPosObtainer

    state = {
        hideCards: false,
        showDistance: false
    }

    constructor(p: UIBoardProp) {
        super(p)
        this.screenPosObtainer = new ScreenPosObtainer()
    }

    getOthers(): PlayerInfo[] {
        let {myId, context} = this.props
        let idx = context.playerInfos.findIndex(p => p.player.id === myId)
        return [...context.playerInfos.slice(idx + 1), ...context.playerInfos.slice(0, idx)]
    }

    computeDist = (otherPlayer: string): number => {
        let {myId, context} = this.props
        return context.computeDistance(myId, otherPlayer)
    }

    render() {
        let {myId, context} = this.props
        let {showDistance, hideCards} = this.state
        let playerInfo = context.getPlayer(myId)

        return <div className='board occupy' style={{}}>
            <div className='top'>
                <UIPlayGround players={this.getOthers()} distanceComputer={this.computeDist} 
                                screenPosObtainer={this.screenPosObtainer} showDist={showDistance}/>)
                <div className='chat-logger'>
                    {/* <img className='occupy' src={'ui/container-horizontal.png'}/> */}
                </div>
            </div>
            <div className='btm'>
                {/* 状态 */}
                <UIMyPlayerCard info={playerInfo} onUseSkill={(s)=>{}}/>
                <div className='mid'>
                    {/* 判定牌 */}
                    <div className='my-judge'>
                        <UIMarkRow marks={playerInfo.getJudgeCards()} />
                    </div>
                    {/* 装备牌 */}
                    <div className='my-equip'>
                        <UIEquipGrid cards={playerInfo.getCards('equip')}/>
                    </div>
                </div>
                {/* 手牌 */}
                <div className='my-cards'>
                    <UICardRow cards={playerInfo.getCards('hand')} isShown={!hideCards}/>
                </div>
                <div className='buttons'>
                    <UIButton display={showDistance? '隐藏距离' : '显示距离'} 
                            onClick={()=>{this.setState({showDistance: !showDistance})}} 
                            disabled={false} />
                    <UIButton display={hideCards? '拿起牌' : '扣牌'} 
                            onClick={()=>{this.setState({hideCards: !hideCards})}} 
                            disabled={false} />
                </div>
            </div>
        </div>
    }
}

type PlayGroundProp = {
    players: PlayerInfo[],
    distanceComputer: (s: string)=>number,
    screenPosObtainer: ScreenPosObtainer,
    showDist: boolean
}

class UIPlayGround extends React.Component<PlayGroundProp, object> {

    render() {
        let {players, screenPosObtainer, showDist, distanceComputer} = this.props
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
                    .map((p, i) => <UIPlayerCard key={i} info={p} dist={showDist && distanceComputer(p.player.id)} screenPosObtainer={screenPosObtainer}/>)
            }
            </div>
            <div className='secondary-row go-up'>
            {
                rows > 2 && players.filter((p, i) => i === 1 || i === players.length - 2)
                    .map((p, i) => <UIPlayerCard key={i} info={p} dist={showDist && distanceComputer(p.player.id)} screenPosObtainer={screenPosObtainer}/>)
            }
            </div>
            <div className='secondary-row'>
            {
                rows > 1 && players.filter((p, i) => i === 0 || i === players.length - 1)
                    .map((p, i) => <UIPlayerCard key={i} info={p} dist={showDist && distanceComputer(p.player.id)} screenPosObtainer={screenPosObtainer}/>)
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
    dist?: number
}

export class UIPlayerCard extends React.Component<CardProp, object> {

    dom: React.RefObject<any>

    constructor(p: CardProp) {
        super(p)
        this.dom = React.createRef()
    }

    componentDidMount() {
        this.props.screenPosObtainer.registerObtainer(this.props.info.player.id, 
            ()=>{
                let {top, bottom, left, right} = this.dom.current.getBoundingClientRect()
                return {
                    playerId: this.props.info.player.id,
                    x: (left + right) / 2,
                    y: (top + bottom) / 2
                }
            })
    }

    render() {
        let {info, dist} = this.props
        return <div className='ui-player-card' ref={this.dom}>
            <div className='occupy overflow-hidden'>
                <div className='card-avatar' 
                    style={{backgroundImage: `url('generals/${info.general.id}.png')`, ...getOffset(info.general.id)}} />
            </div>
            <div className='player-name'>{info.player.name}</div>
            <div className='general-name'>{info.general.name}</div>
            <div className='faction' style={{backgroundImage: `url('icons/${info.general.faction.image}.png')`}} />
            <div className='identity' style={{backgroundImage: `url('icons/${info.identity.id}.png')`}}/>

            {dist && <div className='distance occupy'>{dist}</div>}

            {info.isDead || 
                <div>
                    <div className='hand'>{info.getCards('hand').length}</div>
                    <div className='player-hp'>
                        <UIHpCol current={info.hp} total={info.maxHp} />
                    </div>
                    <div className='equipments'>
                        <UIEquipGrid cards={info.getCards('equip')}/>
                    </div>
                    <div className='judge'>
                        <UIMarkRow marks={info.getJudgeCards()} />
                    </div>
                </div>
            }
            
        </div>
    }
}