import * as React from 'react'

import './ui-board.scss'
import { UIMyPlayerCard, SkillButtonProp } from './UIMyPlayerCard'
import UIButton from './UIButton'
import UIPlayGround from './UIPlayGround' 
import GameClientContext from '../GameClientContext'
import { UIPosition } from '../../common/PlayerAction'
import { Clickability } from '../player-actions/PlayerActionDriver'
import Pubsub from '../../common/util/PubSub'
import { ServerHintTransit, Rescind, HintType, CustomRequest } from '../../common/ServerHint'
import EffectProducer from '../effect/EffectProducer'
import { TextFlashEffect, CardTransit, CurrentPlayerEffect } from '../../common/transit/EffectTransit'
import FactionPlayerInfo from '../../game-mode-faction/FactionPlayerInfo'
import IdentityWarPlayerInfo from '../../game-mode-identity/IdentityWarPlayerInfo'
import { ScreenPosObtainer } from './ScreenPosObtainer'
import UIMounter from '../card-panel/UIMounter'
import { PlayerInfo } from '../../common/PlayerInfo'
import CardTransitManager from './CardTransitManager'
import UIMyCards from './UIMyCards'
import { CustomUIData } from '../card-panel/CustomUIRegistry'
import { GameMode } from '../../common/GameMode'
import { SkillStatus } from '../../game-mode-faction/skill/Skill'
import { UIRollingLogger, UILogger } from './UILogger'
import { audioManager } from '../audio-manager/AudioManager'
import RuleModal from './UIRuleModal'
import { CardPos, CardRearrangeRequest } from '../../common/transit/CardPos'

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
    signsChecker: Checker,
    onGeneralChecker: Checker,
    onSubGeneralChecker: Checker,
    skillButtons: SkillButtonProp[],
    uiRequest?: CustomRequest,
    uiData?: CustomUIData<any>,
    others: PlayerInfo[],
    cardTransitManager: CardTransitManager,
    audioPlaying: boolean
}

export default class UIBoard extends React.Component<UIBoardProp, State> {

    effectProducer: EffectProducer
    dom: React.RefObject<any>

    constructor(p: UIBoardProp) {
        super(p)
        let {myId, context} = p
        let screenPosObtainer = new ScreenPosObtainer()
        let skillChecker = new CheckerImpl(UIPosition.MY_SKILL, context, this.refresh)
        this.state = {
            hideCards: false,
            showDistance: false,
            screenPosObtainer: screenPosObtainer,
            playerChecker: new CheckerImpl(UIPosition.PLAYER, context, this.refresh),
            cardsChecker: new CheckerImpl(UIPosition.MY_HAND, context, this.refresh),
            buttonChecker: new CheckerImpl(UIPosition.BUTTONS, context, this.refresh),
            equipChecker: new CheckerImpl(UIPosition.MY_EQUIP, context, this.refresh),
            signsChecker: new CheckerImpl(UIPosition.SIGNS, context, this.refresh),
            onGeneralChecker: new CheckerImpl(UIPosition.ON_MY_GENERAL, context, this.refresh),
            onSubGeneralChecker: new CheckerImpl(UIPosition.ON_MY_SUB_GENERAL, context, this.refresh),
            cardTransitManager: new CardTransitManager(context.cardManager),
            uiRequest: null,
            uiData: null,
            skillButtons: [],
            others: context.getRingFromPerspective(myId, false, true),
            audioPlaying: true
        }
        audioManager.play('/audio/music-in-game.mp3', true)

        p.pubsub.on(SkillStatus, (s: SkillStatus)=>{
            // console.log('Received Skill Status', s)
            this.setState(state => {
                let match = state.skillButtons.find(prop => {
                    return prop.skill.id === s.id && prop.skill.playerId === s.playerId
                })
                if(!match) {
                    console.info('Received a new skill!', s)
                    let skill = GameMode.get(context.gameMode).skillProvider(s.id, myId)
                    skill.isMain = s.isMain
                    skill.bootstrapClient(context, context.getPlayer(myId))
                    state.skillButtons.push({
                        skill,
                        skillChecker, statusUpdater:(s)=>{
                            context.sendToServer(s)
                        }
                    })
                } else {
                    Object.assign(match.skill, s)
                    console.log('Updated skill', match.skill.isRevealed, s, match.skill)
                }
                return state
            })
        })
        //need to forceupdate to register new changes
        p.pubsub.on(ServerHintTransit, (con: ServerHintTransit)=>{
            context.setHint(con)
            if(con.hint.hintType === HintType.UI_PANEL) {
                //hijack
                console.log('Received Special Panel Request. Not sending to context')
                this.setState({uiRequest: con.hint.customRequest})
            } else {
                this.refresh()
            }
        })
        p.pubsub.on(CustomUIData, (uiData: CustomUIData<any>)=>{
            this.setState({uiData})
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
        p.pubsub.on(CardTransit, (effect: CardTransit)=>{
            this.state.cardTransitManager.onCardTransfer(effect)
        })
        p.pubsub.on(FactionPlayerInfo, (info: FactionPlayerInfo)=>{
            // console.log('Before update player', info, context.getPlayer(info.player.id).getAllCards())
            delete info.cards
            Object.assign(context.getPlayer(info.player.id), info)
            // console.log('After update player', info, context.getPlayer(info.player.id).getAllCards())
            this.refresh()
        })
        p.pubsub.on(CurrentPlayerEffect, (currentPlayerEffect: CurrentPlayerEffect)=>{
            context.curr = currentPlayerEffect.player
        })
        p.pubsub.on(IdentityWarPlayerInfo, (info: IdentityWarPlayerInfo)=>{
            // console.log('Received updated player info ', info)
            delete info.cards
            Object.assign(context.getPlayer(info.player.id), info)
            this.refresh()
        })
        this.dom = React.createRef()
        screenPosObtainer.registerObtainer(myId, this.dom)
    }

    componentWillUnmount() {
        audioManager.stop('/audio/music-in-game.mp3')
    }

    toggleMusic=()=>{
        this.setState({audioPlaying: !this.state.audioPlaying}, ()=>{
            if(this.state.audioPlaying) {
                audioManager.play('/audio/music-in-game.mp3', true)
            } else {
                audioManager.pause('/audio/music-in-game.mp3')
            }
        })
    }

    refresh=()=>{
        // console.log('Force Refreshing UIBoard')
        this.forceUpdate()
    }

    render() {
        let {myId, context, pubsub} = this.props
        let {showDistance, hideCards, screenPosObtainer, others, skillButtons, signsChecker, onGeneralChecker, onSubGeneralChecker,
            playerChecker, cardsChecker, buttonChecker, equipChecker, cardTransitManager} = this.state
        let playerInfo = context.getPlayer(myId)
        let mode = GameMode.get(context.gameMode)
        // console.log(context.playerInfos, myId, playerInfo)

        return <div className='board occupy noselect' style={{}}>
            <div className='top'>
                <div className='playground'>
                    <UIPlayGround players={others} distanceComputer={context.getMyDistanceTo} pubsub={pubsub}
                                    screenPosObtainer={screenPosObtainer} showDist={showDistance} cardTransitManager={cardTransitManager}
                                    checker={playerChecker} cardManager={context.cardManager}/>
                                    
                    <UIMounter customRequest={this.state.uiRequest} 
                        commonUI={this.state.uiData}
                        context={context}
                        onGeneralChecker={onGeneralChecker}
                        onSubGeneralChecker={onSubGeneralChecker}
                        consumer={res => {context.submitAction({
                            actionData: null,
                            actionSource: myId,
                            serverHint: null,
                            customData: res
                        })
                        this.setState({uiRequest: null})
                    }}/>

                    <UIRollingLogger pubsub={pubsub} />
                </div>
                <div className='chat-logger'>
                    <UILogger pubsub={pubsub} />
                </div>
                <div className='system-buttons'>
                    <RuleModal ruleName={mode.name + '规则'} rules={mode.manual()}/>
                    <i className={'fa fa-music icon ' + (this.state.audioPlaying? 'flashing-red' : '')} onClick={this.toggleMusic}/>
                </div>
            </div>
            <div className='btm' ref={this.dom}>
                {/* 状态 */}
                <UIMyPlayerCard info={playerInfo} elementStatus={playerChecker.getStatus(myId)} 
                                onSelect={(s)=>playerChecker.onClicked(s)} pubsub={pubsub} skillButtons={skillButtons}/>
                <UIMyCards info={playerInfo} equipChecker={equipChecker} cardsChecker={cardsChecker} signsChecker={signsChecker}
                            hideCards={hideCards} cardTransitManager={cardTransitManager} onCardsShifted={shift => {
                                this.props.context.sendToServer(shift)
                            }}/>
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
            </div>
            <EffectProducer screenPosObtainer={screenPosObtainer} ref={effectProducer=>this.effectProducer = effectProducer} />
        </div>
    }
}