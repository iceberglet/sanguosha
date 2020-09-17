import * as React from 'react'
import { Player } from '../../common/Player'
import UIButton from './UIButton'
import { v4 as uuidv4 } from 'uuid';
import './ui-login.scss'

type Prop = {
    myself: Player
    onDone: (p: Player)=>void
    error: string
}

export default function UILogin(p: Prop) {

    if(p.error) {
        return <div className='login-panel'>
            <div className='prompt'>{'登录失败...' + p.error}</div>
        </div>
    }
    
    if(p.myself.id) {
        return <div className='login-panel'>
            <div className='prompt'>欢迎登录, {p.myself.id}, 为您连接中...</div>
        </div>
    }

    let [name, setName] = React.useState<string>('')

    return <div className='login-panel'>
        <div className='prompt'>初次见面, 大侠请留下姓名</div>
        <input className='name-input' onChange={(e)=>setName(e.target.value)}></input>
        <UIButton display={'此乃吾名'} disabled={false} onClick={()=>p.onDone({id: name})}/>
    </div>
}