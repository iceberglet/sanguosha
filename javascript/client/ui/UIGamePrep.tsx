import * as React from 'react'
import { Player } from '../../common/Player'

type PrepProp = {
    seated: string[]
}

export default class UIGramePrep extends React.Component {


    render() {
        return <div className='game-prep'>
            <div className='seats'>

            </div>
            <div className='players'>

            </div>
            <div className='settings'>

            </div>
        </div>
    }
}

type SeatProp = {
    idx: number
    player: Player
    onClick: ()=>void
}

function Seat(prop: SeatProp) {
    if(prop.player) {
        return <div className='seat'>
            {prop.player.id}
        </div>
    } else {
        return <div className='seat empty' onClick={prop.onClick}>
            {'Sit Here'}
        </div>
    }
}