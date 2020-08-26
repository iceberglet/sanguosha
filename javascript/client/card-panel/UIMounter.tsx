import * as React from 'react'
import { CardSelectionHint, CustomRequest } from '../../common/ServerHint'
import CardSelection from './CardSelection'

type Prop = {
    customRequest: CustomRequest,
    consumer: (res: any) => void
}

export default class UIMounter extends React.Component<Prop, any> {

    renderSelection() {
        let hint = this.props.customRequest
        switch(hint.mode) {
            case 'choose': return <CardSelection {...hint.data as CardSelectionHint} onSelectionDone={this.props.consumer} />
        }
        throw 'Unknown...' + hint.mode
    }
    

    render() {
        if(!this.props.customRequest) {
            return null
        }
        return <div className='occupy ui-mounter center'>
            {
                this.renderSelection()
            }
            {/* <CardSelection rowsOfCard={{
                    '手牌': [
                        new FWCard('spade', CardSize.SEVEN, CardType.SLASH),
                        new FWCard('spade', CardSize.EIGHT, CardType.SLASH),
                        new FWCard('spade', CardSize.EIGHT, CardType.SLASH),
                        new FWCard('spade', CardSize.NINE, CardType.SLASH),
                        new FWCard('spade', CardSize.NINE, CardType.WINE),
                        new FWCard('spade', CardSize.TEN, CardType.BING_LIANG),
                        new FWCard('spade', CardSize.TEN, CardType.SLASH),
                        new FWCard('spade', CardSize.JACK, CardType.WU_XIE),
                        new FWCard('spade', CardSize.JACK, CardType.SLASH),
                        new FWCard('spade', CardSize.QUEEN, CardType.ZHANG_BA)
                    ],
                    '装备': [
                        new FWCard('diamond', CardSize.ACE, CardType.LIAN_NU)
                    ],
                    '判定区': [
                        {as: CardType.LE_BU, card: new FWCard('diamond', CardSize.THREE, CardType.DODGE)},
                        {as: CardType.BING_LIANG, card: new FWCard('diamond', CardSize.THREE, CardType.SHUN_SHOU)}
                    ]
                }} title = {'请选择过河拆桥的牌'}
                onSelectionDone={(r, i)=>{console.log('Selected', r, i)}}
                /> */}
        </div>
    }
}