import * as React from 'react'
import { General, toGeneralCardStyle } from '../../common/General'
import './general-ui.scss'

type Prop = {
    general: General
}

export default function GeneralUI(p: Prop) {

    if(!p.general) {
        return <div className='faction-general'></div>
    }

    let yy = Math.floor(p.general.hp)
    let hasHalf = Math.round((p.general.hp - yy)*2) === 1
    
    return <div className='faction-general noselect'>
        <div className='avatar'>
            <div style={toGeneralCardStyle(p.general.id)} />
        </div>
        <div className={'frame occupy ' + p.general.faction.image} />
        <div className='general-name'>{p.general.name}</div>
        <div className='hp-container'>
            {new Array(yy).fill(1).map((v: any, i: any)=>{
                return <img key={i} className='hp' src='icons/yy_green.png' />
            })}
            {hasHalf && <img className='hp' src='icons/yy_green_half.png'/>}
        </div>
    </div>
}