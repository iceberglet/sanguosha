import * as React from 'react'
import './card-panel.scss'
import UIButton from '../ui/UIButton'
import { GameStats } from '../../server/GameStatsCollector'

type Prop = GameStats & {
    onSelectionDone: (res: any)=>void
}

/**
 * By Default, selects just one card from it
 */
export default function GameResultPanel (p: Prop) {

    return <div className='game-result'>
                <div className='title center'>牌局结束</div>
                <div className='results'>
                    <div key='heading' className='row heading'>
                        <div className='player-name'>玩家</div>
                        <div className='col-2'>胜利场数</div>
                        <div className='col'>击杀</div>
                        <div className='col'>伤害</div>
                        <div className='col'>治愈</div>
                    </div>
                    {
                        p.stats.map(stat => {
                            let clazz = p.winners.findIndex(w => w === stat.playerId) > -1? 'row winner' : 'row'
                            return <div className={clazz} key={stat.playerId}>
                                <div className='player-name'>{stat.playerId}</div>
                                <div className='col-2'>{stat.wins}</div>
                                <div className='col'>{stat.kill}({stat.thisRound.kill})</div>
                                <div className='col'>{stat.totalDamage}({stat.thisRound.totalDamage})</div>
                                <div className='col'>{stat.totalHeal}({stat.thisRound.totalHeal})</div>
                            </div>
                        })
                    }
                </div>
                <div className='button-container center'>
                    <UIButton display={'再来一局'} disabled={false} onClick={()=>p.onSelectionDone('ignored')}/>
                </div>
        </div>
}