import * as React from 'react'
import { CardSelectionHint, CustomRequest } from '../../common/ServerHint'
import CardSelection from './CardSelection'
import { CustomUIData, customUIRegistry } from './CustomUIRegistry'


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
            default: throw 'Unknown...' + hint.mode
        }
    }
    
    renderCommonUI() {
        let {customRequest, commonUI, consumer} = this.props
        return customUIRegistry.get(commonUI.type, commonUI.data, customRequest?.data, consumer)
    }

    render() {
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