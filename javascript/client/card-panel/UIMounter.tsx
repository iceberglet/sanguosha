import * as React from 'react'
import { CardSelectionHint, CustomRequest, DisplayHint, DuoCardSelectionHint } from '../../common/ServerHint'
import CardSelection, { DuoCardSelection } from './CardSelection'
import { CustomUIData, customUIRegistry } from './CustomUIRegistry'
import DisplayPanel from './DisplayPanel'
import { GameStats } from '../../server/GameStatsCollector'
import GameResultPanel from './GameResultPanel'
import GameClientContext from '../GameClientContext'
import { CardPos } from '../../common/transit/CardPos'
import { UIPosition } from '../../common/PlayerAction'
import context from 'react-bootstrap/esm/AccordionContext'
import UICard from '../ui/UICard'
import { Checker } from '../ui/UIBoard'
import Pubsub from '../../common/util/PubSub'


type Prop = {
    onGeneralChecker: Checker,
    onSubGeneralChecker: Checker,
    customRequest: CustomRequest,
    commonUI: CustomUIData<any>,
    consumer: (res: any, intermittent?: boolean) => void,
    context: GameClientContext,
    pubsub: Pubsub
}

export default class UIMounter extends React.Component<Prop, any> {

    renderSelection() {
        let hint = this.props.customRequest
        switch(hint.mode) {
            case 'choose': return <CardSelection {...hint.data as CardSelectionHint} onSelectionDone={this.props.consumer} />
            case 'duo-choose': return <DuoCardSelection {...hint.data as DuoCardSelectionHint} onSelectionDone={this.props.consumer} />
            case 'display': return <DisplayPanel {...hint.data as DisplayHint} onSelectionDone={this.props.consumer} />
            case 'game-end': return <GameResultPanel {...hint.data as GameStats} onSelectionDone={this.props.consumer} />
            default: throw 'Unknown...' + hint.mode
        }
    }
    
    renderCommonUI() {
        let {customRequest, commonUI, consumer, pubsub} = this.props
        console.log(commonUI, customRequest)
        return customUIRegistry.get(commonUI.type, {
            commonUI: commonUI.data, 
            requestData: customRequest?.data, consumer,
            pubsub
        })
    }

    render() {
        let {customRequest, commonUI, context} = this.props

        //everyone can see such
        if(commonUI && commonUI.type !== CustomUIData.STOP) {
            return <div className='occupy ui-mounter center'>
                {this.renderCommonUI()}
            </div>
        }

        //custom requests
        if(customRequest) {
            return <div className='occupy ui-mounter center'>
                {this.renderSelection()}
            </div>
        }
        
        let driver = context.getCurrentDriver()
        if(driver.getAllAreas().has(UIPosition.ON_MY_GENERAL)) {
            return <div className='occupy ui-mounter center'>
                <OnGeneralCardSelector context={context} target={CardPos.ON_GENERAL} checker={this.props.onGeneralChecker}/>
            </div>
        }
        if(driver.getAllAreas().has(UIPosition.ON_MY_SUB_GENERAL)) {
            return <div className='occupy ui-mounter center'>
                <OnGeneralCardSelector context={context} target={CardPos.ON_SUB_GENERAL} checker={this.props.onSubGeneralChecker}/>
            </div>
        }
        return null
    }
}


type SelectorProp = {
    checker: Checker,
    context: GameClientContext,
    target: CardPos,
    // cardName: string, //田, 空城, 创, 等等
}

function OnGeneralCardSelector(p: SelectorProp) {
    
    return  <div className='card-selection-container'>
                <div className='card-selection-hint center'>{p.context.getCurrentDriver().getHintMsg(context)}</div>
                <div className='card-selection-row'>
                    {/* <div className='row-name center'>{p.cardName}</div> */}
                    <div className='row-of-cards'>
                    {p.context.myself.getCards(p.target).map(c => {
                        let s = p.checker.getStatus(c.id)
                        return <div className='card-wrapper' key={c.id}>
                            <UICard card={c} isShown={true} elementStatus={s} nodescript={true}
                                onMouseClick={()=>s.isSelectable && p.checker.onClicked(c.id)} />
                        </div>
                    })}
                    </div>
                </div>
            </div>
}