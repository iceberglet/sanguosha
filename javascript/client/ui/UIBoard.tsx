import * as React from 'react'
import UICardRow, { UIMarkRow } from './UICardRow'

import './ui-board.scss'
import UIEquipGrid from './UIEquipGrid'
import { UIMyPlayerCard } from './UIMyPlayerCard'
import UIButton from './UIButton'
import UIPlayGround from './UIPlayGround' 
import GameClientContext from '../GameClientContext'
import { UIPosition } from '../../common/PlayerAction'
import { Clickability } from '../player-actions/PlayerActionDriver'
import Pubsub from '../../common/util/PubSub'
import { ServerHintTransit, Rescind, HintType, CardSelectionHint } from '../../common/ServerHint'
import EffectProducer from '../effect/EffectProducer'
import { TextFlashEffect, TransferCardEffect } from '../../common/transit/EffectTransit'
import { CardPos } from '../../common/transit/CardPos'
import FactionPlayerInfo from '../../game-mode-faction/FactionPlayerInfo'
import IdentityWarPlayerInfo from '../../game-mode-identity/IdentityWarPlayerInfo'
import { ScreenPosObtainer, Seeker } from './ScreenPosObtainer'
import UIMounter from '../card-panel/UIMounter'
import { PlayerInfo } from '../../common/PlayerInfo'

type UIBoardProp = {
    myId: string
    context: GameClientContext
    pubsub: Pubsub
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

export interface Checker {
    getStatus(itemId: string): ElementStatus
    onClicked(itemId: string): void
}

class CheckerImpl implements Checker {
    public constructor(private areaAction: UIPosition, 
        private context: GameClientContext,
        private callback: ()=>void){}

    getStatus = (itemId: string): ElementStatus => {
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
    onClicked = (itemId: string): void => {
        this.context.onClicked(this.areaAction, itemId)
        this.callback()
    }
}

type State = {
    hideCards: boolean,
    showDistance: boolean,
    screenPosObtainer: ScreenPosObtainer,
    playerChecker: Checker,
    cardsChecker: Checker,
    buttonChecker: Checker,
    equipChecker: Checker,
    seeker: Seeker,
    uiRequest?: CardSelectionHint,
    others: PlayerInfo[]
}

export default class UIBoard extends React.Component<UIBoardProp, State> {

    effectProducer: EffectProducer
    dom: React.RefObject<any>

    constructor(p: UIBoardProp) {
        super(p)
        let {myId, context} = p
        let screenPosObtainer = new ScreenPosObtainer()
        this.state = {
            hideCards: false,
            showDistance: false,
            screenPosObtainer: screenPosObtainer,
            playerChecker: new CheckerImpl(UIPosition.PLAYER, context, this.refresh),
            cardsChecker: new CheckerImpl(UIPosition.MY_HAND, context, this.refresh),
            buttonChecker: new CheckerImpl(UIPosition.BUTTONS, context, this.refresh),
            equipChecker: new CheckerImpl(UIPosition.MY_EQUIP, context, this.refresh),
            seeker: new Seeker(),
            uiRequest: null,
            others: context.getRingFromPerspective(myId, false, true)
        }
        //need to forceupdate to register new changes
        p.pubsub.on(ServerHintTransit, (con: ServerHintTransit)=>{
            context.setHint(con)
            if(con.hint.hintType === HintType.UI_PANEL) {
                //hijack
                console.log('Received Special Panel Request. Not sending to context')
                this.setState({uiRequest: con.hint.cardSelectHint})
            } else {
                this.refresh()
            }
        })

        //只有无懈可击之类的才会rescind之前的请求
        p.pubsub.on(Rescind, ()=>{
            context.setHint(null)
            this.refresh()
        })
        //the ref is not populated at construction time
        p.pubsub.on(TextFlashEffect, (effect: TextFlashEffect)=>{
            this.effectProducer.processEffect(effect)
        })
        p.pubsub.on(TransferCardEffect, (effect: TransferCardEffect)=>{
            this.effectProducer.transferCards(effect, context.getGameMode().cardManager)
        })
        p.pubsub.on(FactionPlayerInfo, (info: FactionPlayerInfo)=>{
            // console.log('Received updated player info ', info)
            Object.assign(context.getPlayer(info.player.id), info)
            this.refresh()
        })
        p.pubsub.on(IdentityWarPlayerInfo, (info: IdentityWarPlayerInfo)=>{
            // console.log('Received updated player info ', info)
            Object.assign(context.getPlayer(info.player.id), info)
            this.refresh()
        })
        this.dom = React.createRef()

        screenPosObtainer.register(myId, (item: string)=>{
            //is this my equipment? my judge card? my hand?
            let div = this.state.seeker.seek(item)
            console.log('Seeking', myId, item, div)
            if(!div) {
                div = this.dom.current
            }
            let {top, bottom, left, right} = div.getBoundingClientRect()
            return {
                // playerId: this.props.info.player.id,
                x: (left + right) / 2,
                y: (top + bottom) / 2
            }
        })
    }

    refresh=()=>{
        // console.log('Force Refreshing UIBoard')
        this.forceUpdate()
    }

    render() {
        let {myId, context, pubsub} = this.props
        let {showDistance, hideCards, screenPosObtainer, others, playerChecker, cardsChecker, buttonChecker, equipChecker, seeker} = this.state
        let playerInfo = context.getPlayer(myId)
        // console.log(context.playerInfos, myId, playerInfo)

        return <div className='board occupy noselect' style={{}}>
            <div className='top'>
                <div className='playground'>
                    <UIPlayGround players={others} distanceComputer={context.getMyDistanceTo} pubsub={pubsub}
                                    screenPosObtainer={screenPosObtainer} showDist={showDistance}
                                    checker={playerChecker} cardManager={context.getGameMode().cardManager}/>
                                    
                    <UIMounter selectHint={this.state.uiRequest} consumer={res => {
                        context.submitAction({
                            actionData: null,
                            actionSource: myId,
                            serverHint: null,
                            markers: null,
                            customData: res
                        })
                        this.setState({uiRequest: null})
                    }}/>
                </div>
                <div className='chat-logger'>
                    {/* <img className='occupy' src={'ui/container-horizontal.png'}/> */}
                </div>
            </div>
            <div className='btm' ref={this.dom}>
                {/* 状态 */}
                <UIMyPlayerCard info={playerInfo} onUseSkill={(s)=>{}} elementStatus={playerChecker.getStatus(myId)} 
                                onSelect={(s)=>playerChecker.onClicked(s)} pubsub={pubsub}/>
                <div className='mid'>
                    {/* 判定牌 */}
                    <div className='my-judge'>
                        <UIMarkRow marks={playerInfo.getJudgeCards()} seeker={seeker}/>
                    </div>
                    {/* 装备牌 */}
                    <div className='my-equip'>
                        <UIEquipGrid big={true} cards={playerInfo.getCards(CardPos.EQUIP)} checker={equipChecker} seeker={seeker}/>
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
                    <UICardRow cards={playerInfo.getCards(CardPos.HAND)} isShown={!hideCards} checker={cardsChecker} seeker={seeker}/>
                </div>
            </div>
            <EffectProducer screenPosObtainer={screenPosObtainer} ref={effectProducer=>this.effectProducer = effectProducer} />
        </div>
    }
}