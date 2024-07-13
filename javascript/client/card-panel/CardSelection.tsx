import * as React from 'react'
import UICard from '../ui/UICard'
import { ElementStatus } from '../ui/UIBoard'
import { CardSelectionHint, CardSelectionResult, DuoCardSelectionHint, DuoCardSelectionResult } from '../../common/ServerHint'
import './card-panel.scss'
import {Card} from '../../common/cards/Card'
import UIButton from '../ui/UIButton'


type Prop = CardSelectionHint & {
    onSelectionDone: (res: CardSelectionResult)=>void
}

/**
 * By Default, selects just one card from it
 */
export default function CardSelection (p: Prop) {

    let [chosen, setChosen] = React.useState<Array<[string, number]>>([])
    let [enabled, setEnabled] = React.useState(false)
    let finish = ()=>{
        console.log('Finishing', chosen)
        let res = chosen.map(s => {
            return {
                rowName: s[0],
                idx: Number(s[1])
            }
        })
        p.onSelectionDone(res)
    }

    return <div className='card-selection-container'>
        <div className='card-selection-hint center'>{p.title}</div>
        {Object.keys(p.rowsOfCard).map(rowName => {
            return <div className='card-selection-row' key={rowName}>
                <div className='row-name center'>{rowName}</div>
                <div className='row-of-cards'>
                {
                    p.rowsOfCard[rowName].map((c: Card, i: number) => {
                        let idx = chosen.findIndex(ri => ri[0]===rowName && ri[1]===i)
                        return <div className='card-wrapper' key={i}>
                            <UICard card={c} isShown={true} elementStatus={idx > -1? ElementStatus.SELECTED : ElementStatus.UNSELECTED} nodescript={true}
                                    onMouseClick={()=>setChosen(arr => {
                                        if(idx > -1) {
                                            arr.splice(idx, 1)
                                        } else {
                                            arr.push([rowName, i])
                                        }
                                        if(arr.length === p.chooseSize) {
                                            if(p.chooseSize === 1) {
                                                finish()
                                            } else {
                                                setEnabled(true)
                                            }
                                        } else {
                                            setEnabled(false)
                                        }
                                        return [...arr]
                                    })} />
                        </div>
                    })
                }
                </div>
            </div>
        })}
        { p.chooseSize > 1 && <div className='button-container'>
                <UIButton display={'确定'} disabled={!enabled} onClick={finish}/>
            </div>
        }
    </div>
}

type DuoProp = DuoCardSelectionHint & {
    onSelectionDone: (res: DuoCardSelectionResult)=>void
}

export function DuoCardSelection(p: DuoProp) {
    
    //row & idx & isLeft
    let [chosen, setChosen] = React.useState<Array<[string, number, boolean]>>([])
    let [enabled, setEnabled] = React.useState(false)
    let finish = ()=>{
        console.log('Finishing', chosen)
        let res = chosen.map(s => {
            return {
                rowName: s[0],
                idx: Number(s[1]),
                isLeft: s[2]
            }
        })
        p.onSelectionDone(res)
    }

    const mapper = (isLeft: boolean, rowName: string) => (c: Card, i: number) => {
        let idx = chosen.findIndex(ri => ri[0] === rowName && ri[1]===i)
        let status = c.description? ElementStatus.DISABLED : (idx > -1? ElementStatus.SELECTED : ElementStatus.UNSELECTED)
        return <UICard card={c} isShown={true} key={i} elementStatus={status} 
                    onMouseClick={()=>!c.description && setChosen(arr => {
                        if(idx > -1) {
                            arr.splice(idx, 1)
                        } else {
                            arr.push([rowName, i, isLeft])
                        }
                        if(arr.length === p.chooseSize) {
                            if(p.chooseSize === 1) {
                                finish()
                            } else {
                                setEnabled(true)
                            }
                        } else {
                            setEnabled(false)
                        }
                        return [...arr]
                    })} />
    }

    return <div className='duo-card-selection-container'>
        <div className='duo-card-selection-hint center'>{p.title}</div>
        {/* <div className='subtitles'>
            <div className='title center'>{p.titleLeft}</div>
            <div className='title center'>{p.titleRight}</div>
        </div> */}
        <table>
            <tbody>
                <tr>
                    <td></td>
                    <td className='title'>{p.titleLeft}</td>
                    <td className='title'>{p.titleRight}</td>
                </tr>
                {Object.keys(p.rowsOfCard).map(rowName => {
                    return <tr key={rowName}>
                        <td className='row-name'>{rowName}</td>
                        <td>
                            <div className='row-of-cards'>
                                {p.rowsOfCard[rowName][0].map(mapper(true, rowName))}
                            </div>
                        </td>
                        <td>
                            <div className='row-of-cards'>
                                {p.rowsOfCard[rowName][1].map(mapper(false, rowName))}
                            </div>
                        </td>
                    </tr>
                })}
            </tbody>
        </table>
        { <div className='button-container'>
                {p.chooseSize > 1 && <UIButton display={'确定'} disabled={!enabled} onClick={finish}/>}
                {p.canCancel && <UIButton display={'取消'} disabled={false} onClick={finish}/>}
            </div>
        }
    </div>
}