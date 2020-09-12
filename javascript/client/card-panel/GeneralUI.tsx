import * as React from 'react'
import { General, toGeneralCardStyle } from '../../common/General'
import './general-ui.scss'
import { Tooltip, OverlayTrigger } from 'react-bootstrap'
import { describer } from '../../common/util/Describer'

type Prop = {
    general: General
}

export default function GeneralUI(p: Prop) {

    if(!p.general) {
        return <div className='general-ui'></div>
    }

    let yy = Math.floor(p.general.hp)
    let hasHalf = Math.round((p.general.hp - yy)*2) === 1
    
    return wrapGeneral(p.general, <div className='general-ui noselect'>
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
    </div>)
}

export function wrapGeneral (general: General, ele: React.ReactElement) {
    if(general) {
        let overlay = (props: any) => <Tooltip {...props}>
                <p>{'【'+general.name+'】'}</p>
                {general.abilities.map(skill=>{
                    return <p key={skill}>{'【'+ skill +'】 ' + describer.get(skill)}</p>
                })}
            </Tooltip>
        return <OverlayTrigger placement='auto' overlay={overlay} delay={{show: 1000, hide: 200}}>
            {ele}
        </OverlayTrigger>
    } else {
        return ele
    }
}