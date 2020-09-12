import * as React from 'react'
import { CardSelectionHint, CustomRequest, DisplayHint, DuoCardSelectionHint } from '../../common/ServerHint'
import CardSelection, { DuoCardSelection } from './CardSelection'
import { CustomUIData, customUIRegistry } from './CustomUIRegistry'
import DisplayPanel from './DisplayPanel'
import { GameStats } from '../../server/GameStatsCollector'
import GameResultPanel from './GameResultPanel'
import { FWCard } from '../../game-mode-faction/FactionWarCardSet'
import { CardSize, CardType } from '../../common/cards/Card'


type Prop = {
    customRequest: CustomRequest,
    commonUI: CustomUIData<any>,
    consumer: (res: any) => void
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
        let {customRequest, commonUI, consumer} = this.props
        console.log(commonUI, customRequest)
        return customUIRegistry.get(commonUI.type, commonUI.data, customRequest?.data, consumer)
    }

    // renderTest() {
    //     return customUIRegistry.get('card-fight', {
    //         cardLeft: new FWCard('club', CardSize.QUEEN, CardType.JIE_DAO),
    //         cardRight: new FWCard('club', CardSize.FOUR, CardType.JIE_DAO),
    //         title: '青青子吟 > 驱虎'
    //     }, true, what=>{})
    // }
    // renderTest() {
    //     return <DuoCardSelection {...{
    //         title: 'Test',
    //         titleLeft: '青青子吟',
    //         titleRight: '欧阳挠挠',
    //         rowsOfCard: {
    //             '试试看': [[
    //                 new FWCard('club', CardSize.THREE, CardType.JIE_DAO),
    //                 new FWCard('diamond', CardSize.THREE, CardType.JIE_DAO),
    //                 new FWCard('heart', CardSize.THREE, CardType.JIE_DAO),
    //                 new FWCard('club', CardSize.FOUR, CardType.JIE_DAO),
    //             ],[
    //                 new FWCard('club', CardSize.THREE, CardType.JIE_DAO),
    //                 new FWCard('diamond', CardSize.THREE, CardType.JIE_DAO),
    //             ]],
    //             '去你的': [[
    //             ],[
    //                 new FWCard('diamond', CardSize.THREE, CardType.JIE_DAO)
    //             ]],
    //         },
    //         mode: 'choose',
    //         chooseSize: 1,
    //         canCancel: true
    //     }} onSelectionDone={this.props.consumer} />
    // }


    render() {
        // return this.renderTest()
        let {customRequest, commonUI} = this.props
        if(!customRequest && (!commonUI || commonUI.type === CustomUIData.STOP)) {
            return null
        }
        return <div className='occupy ui-mounter center'>
            {
                commonUI && commonUI.type !== CustomUIData.STOP? this.renderCommonUI() : this.renderSelection()
            }
        </div>
    }
}