import Pubsub from "../../common/util/PubSub";
import * as React from 'react'
import { LogTransit } from "../../common/transit/EffectTransit";
import './ui-logger.scss'

type LoggerProp = {
    pubsub: Pubsub
}

export function UILogger(p: LoggerProp) {

    let [logs, setLogs] = React.useState<string[]>([])

    React.useEffect(()=>{
        p.pubsub.on<LogTransit>(LogTransit, (log)=>{
            //add to front, first item at bottom
            logs.unshift(log.log)
            if(logs.length > 500) {
                logs.pop()
            }
            setLogs([...logs])
        })
    }, [])

    return <div className='occupy logger-container'>
        {logs.map((l, i)=>{
            return <div className='log-row' key={i}>{l}</div>
        })}
    </div>

}


export function UIRollingLogger(p: LoggerProp) {

    let [logs, setLogs] = React.useState<string[]>(['', '', ''])

    React.useEffect(()=>{
        p.pubsub.on<LogTransit>(LogTransit, (log)=>{
            //remove the first one
            logs.shift()
            //add to last
            logs.push(log.log)
            setLogs([...logs])
        })
    }, [])

    return <div className='logger-roller'>
        {logs.map((l, i)=>{
            return <div className='log-row' key={i}>{l}</div>
        })}
    </div>
}