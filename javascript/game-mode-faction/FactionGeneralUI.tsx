import * as React from 'react'
import FactionWarGeneral from './FactionWarGenerals'
import { toFactionWarCardStyle } from './FactionWarGeneralUiOffset'


type Prop = {
    general: FactionWarGeneral
}

export default function FactionGeneralUI(p: Prop) {

    let yy = Math.floor(p.general.hp)
    let hasHalf = Math.round((p.general.hp - yy)*2) === 1
    
    return <div className='faction-general' >
        <div style={toFactionWarCardStyle(p.general.id)} />
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