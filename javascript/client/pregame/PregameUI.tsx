import { Circus, PlayerPrepChoice } from "../../game-mode-faction/FactionWarGameHoster";
import FactionWarGeneral, { generalPairs } from "../../game-mode-faction/FactionWarGenerals";
import Pubsub from "../../common/util/PubSub";
import * as React from 'react'
import { ServerHintTransit, GeneralSelectionHint, HintType } from "../../common/ServerHint";
import GeneralUI from "../card-panel/GeneralUI";
import { General } from "../../common/General";
import { PlayerActionTransit } from "../../common/PlayerAction";
import UIButton from "../ui/UIButton";
import { Serde } from "../../common/util/Serializer";
import { ClassFormatter } from "../../common/util/Togglable";
import './pregame-ui.scss'
import { audioManager } from "../audio-manager/AudioManager";
import FactionWarRuleBook from "../../game-mode-faction/FactionWarRuleBook";
import UIRuleModal from '../ui/UIRuleModal'
import { toChinese } from "../../common/util/Util";

type Prop = {
    circus: Circus,
    myId: string,
    pubsub: Pubsub,
    socket: WebSocket
}

export default function PregameUI(p: Prop) {

    let [hint, setHint] = React.useState<ServerHintTransit>(null)
    let [main, setMain] = React.useState<General>(null)
    let [sub, setSub] = React.useState<General>(null)

    React.useEffect(()=>{

        p.pubsub.on(ServerHintTransit, (hintTransit: ServerHintTransit)=>{
            if(hintTransit.hint.hintType !== HintType.UI_PANEL || hintTransit.hint.customRequest.mode !== 'choose') {
                throw 'Invalid hint! ' + hintTransit
            }
            console.log('Game Hint', hintTransit)
            setHint(hintTransit)
        })
        console.log('Subscribed to server hint')

        // return ()=>{
        //     p.pubsub.off(PlayerPrepChoice, func)
        // }
    }, [])

    // React.useEffect(()=>{
    //     audioManager.play('/audio/music-pre-game.mp3', true)

    //     return ()=>{
    //         audioManager.stop('/audio/music-pre-game.mp3')
    //     }
    // }, [])

    let me = p.circus.statuses.find(s => s.player.id === p.myId)

    let generals: Array<General> = []
    let seating = -1
    if(hint) {
        let hintData = hint.hint.customRequest.data as GeneralSelectionHint
        generals = hintData.generals
        seating = hintData.yourIdx
    }
    /**
     * invalid if:
     * - single general in that faction
     * - *if main chosen* faction different from main, or is main
     * - *if main & sub chosen* -> everything
     */
    let selector = new FactionSelector(generals, main, sub)

    return <div className='general-selection-container'>
        <div className='player-statuses'>
            <div className='overall center'>玩家数: {p.circus.statuses.length + '/' + p.circus.playerNo}</div>
            <div className='player-status heading' key={'title'}>
                <div className='player-name'>玩家名</div>
                <div className='seating'>顺位</div>
                <div className={'status'}>状态</div>
            </div>
            {p.circus.statuses.sort((a, b)=>a.seating - b.seating).map(player => {
                let ready = player.chosenGeneral && player.chosenSubGeneral
                return <div className={'player-status ' + (player.player.id === p.myId? 'is-myself' : '')} key={player.player.id}>
                    <div className='player-name'>{player.player.id}</div>
                    <div className='seating'>{toChinese(player.seating)}</div>
                    <div className={'status ' + (ready && 'chosen')}>{ready? '选好了' : '选将中'}</div>
                </div>
            })}
        </div>
        {me.chosenGeneral? <div className='my-choices'>
            <UIRuleModal ruleName={'国战规则'} rules={<FactionWarRuleBook />}/>
            <div className='title center'>等待其他玩家加入/完成选将</div>
            <div className='chosen center'>
                <div className='place-holder general-wrapper'>
                    <GeneralUI general={me.chosenGeneral} />
                </div>
                <div className='place-holder general-wrapper'>
                    <GeneralUI general={me.chosenSubGeneral} />
                </div>
            </div>
        </div> : 

        <div className='my-choices'>
            <UIRuleModal ruleName={'国战规则'} rules={<FactionWarRuleBook />}/>
            <div className='title center'>{main? (sub? '点击确定选将' : '请选择副将') : '请选择主将'} {`(你是${toChinese(seating)}号位)`}</div>
            <div className='available'>
                {generals.map(g => {
                    let disabled = selector.disabled.has(g)
                    let clazz = new ClassFormatter('general-wrapper')
                                            .and(disabled, 'disabled')
                                            .and(selector.highlighted.has(g), 'highlighted')
                                            .done()
                    return <div className={clazz} key={g.id} onClick={()=>{
                                if(disabled) {
                                    return
                                }
                                if(main) {
                                    setSub(g)
                                } else {
                                    setMain(g)
                                }
                            }}>
                        <GeneralUI general={g}/>
                    </div>
                })}
            </div>
            <div className='chosen center'>
                <div className='place-holder general-wrapper' onClick={()=>{setMain(null); setSub(null)}}>
                    <GeneralUI general={main} />
                </div>
                <div className='place-holder general-wrapper' onClick={()=>{setSub(null)}}>
                    <GeneralUI general={sub} />
                </div>
            </div>
            <div className='button-container center'>
                <UIButton disabled={!main || !sub} display={'确认选将'} onClick={()=>{
                    p.socket.send(Serde.serialize(new PlayerActionTransit(hint.hintId, {
                        actionData: null,
                        actionSource: hint.toPlayer,
                        serverHint: hint.hint,
                        customData: [main.id, sub.id]
                    })))
                }}/>
            </div>
        </div>}
    </div>
}

class FactionSelector {

    public disabled = new Set<General>()
    public highlighted = new Set<General>()

    constructor(gs: General[], main: General, sub: General) {
        if(main && sub) {
            this.disabled = new Set<General>(gs)
            return
        }
        if(main) {
            this.disabled = new Set<General>(gs.filter(g => g.faction.name !== main.faction.name || g.id === main.id))
            this.highlighted = new Set<General>(gs.filter(g => generalPairs.isPaired(main.name, g.name)))
            return
        }
        gs.forEach(g => {
            if(gs.filter(gg => gg.faction.name === g.faction.name).length === 1) {
                console.log('disabled', g)
                this.disabled.add(g)
            }
        })

    }

}