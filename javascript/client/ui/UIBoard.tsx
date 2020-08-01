import * as React from 'react'
import UICardRow, { UIMarkRow } from './UICardRow'

import './ui-board.scss'
import UIEquipGrid from './UIEquipGrid'
import { UIMyPlayerCard } from './UIMyPlayerCard'
import UIButton from './UIButton'
import UIPlayGround, { ScreenPosObtainer } from './UIPlayGround' 
import GameClientContext from '../player-actions/GameClientContext'
import { UIPosition } from '../player-actions/PlayerUIAction'
import { Clickability } from '../player-actions/PlayerActionDriver'

type UIBoardProp = {
    myId: string
    context: GameClientContext
}

export class ElementStatus {
    public static SELECTED = new ElementStatus('selected', true)
    public static UNSELECTED = new ElementStatus('unselected', true)
    //cannot select, grayed out
    public static DISABLED = new ElementStatus('disabled', false)
    //cannot select but no visual cue
    public static NORMAL = new ElementStatus('normal', false)

    private constructor(public readonly name: string, public readonly isSelectable: boolean) {}
}

export class Checker {
    public constructor(private areaAction: UIPosition, 
        private context: GameClientContext,
        private callback: ()=>void){}

    getStatus(itemId: string): ElementStatus {
        // console.log(itemId, Clickability[this.context.canBeClicked(this.areaAction, itemId)])
        switch(this.context.canBeClicked(this.areaAction, itemId)) {
            case Clickability.CLICKABLE:
                if(this.context.isSelected(this.areaAction, itemId)) {
                    return ElementStatus.SELECTED
                } else {
                    return ElementStatus.UNSELECTED
                }
            case Clickability.NOT_CLICKABLE:
                return ElementStatus.NORMAL
            case Clickability.DISABLED:
                return ElementStatus.DISABLED
        }
    }
    onClicked(itemId: string): void {
        this.context.onClicked(this.areaAction, itemId)
        this.callback()
    }
}

export default class UIBoard extends React.Component<UIBoardProp, any> {

    constructor(p: UIBoardProp) {
        super(p)
        let {myId, context} = p
        this.state = {
            hideCards: false,
            showDistance: false,
            screenPosObtainer: new ScreenPosObtainer(),
            playerChecker: new Checker(UIPosition.PLAYER, context, ()=>this.forceUpdate()),
            cardsChecker: new Checker(UIPosition.MY_HAND, context, ()=>this.forceUpdate()),
            buttonChecker: new Checker(UIPosition.BUTTONS, context, ()=>this.forceUpdate()),
            others: context.getRingFromPerspective(myId)
        }
    }

    render() {
        let {myId, context} = this.props
        let {showDistance, hideCards, screenPosObtainer, others, playerChecker, cardsChecker, buttonChecker} = this.state
        let playerInfo = context.getPlayer(myId)

        return <div className='board occupy noselect' style={{}}>
            <div className='top'>
                <UIPlayGround players={others} distanceComputer={context.getMyDistanceTo} 
                                screenPosObtainer={screenPosObtainer} showDist={showDistance}
                                checker={playerChecker}/>)
                <div className='chat-logger'>
                    {/* <img className='occupy' src={'ui/container-horizontal.png'}/> */}
                </div>
            </div>
            <div className='btm'>
                {/* 状态 */}
                <UIMyPlayerCard info={playerInfo} onUseSkill={(s)=>{}} elementStatus={playerChecker.getStatus(myId)} 
                                onSelect={(s)=>playerChecker.onClicked(s)}/>
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
                <div className='player-buttons'>
                    <div className='server-hint-msg'>{context.getMsg()}</div>
                    {context.getButtons().map(b => {
                        return <UIButton key={b.id} display={b.display} onClick={()=>buttonChecker.onClicked(b.id)} 
                        disabled={!buttonChecker.getStatus(b.id).isSelectable} />
                    })}
                </div>
                <div className='buttons'>
                    <UIButton display={showDistance? '隐藏距离' : '显示距离'} 
                            onClick={()=>{this.setState({showDistance: !showDistance})}} 
                            disabled={false} />
                    <UIButton display={hideCards? '拿起牌' : '扣牌'} 
                            onClick={()=>{this.setState({hideCards: !hideCards})}} 
                            disabled={false} />
                </div>
                {/* 手牌 */}
                <div className='my-cards'>
                    <UICardRow cards={playerInfo.getCards('hand')} isShown={!hideCards} checker={cardsChecker}/>
                </div>
            </div>
        </div>
    }
}