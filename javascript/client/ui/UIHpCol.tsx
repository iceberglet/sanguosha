import * as React from 'react'

type Prop = {
    total: number
    current: number
}

export default function UIHpCol(p: Prop){
    let ratio = p.current / p.total
    let color = 'green'
    if(p.total === 1 || ratio < 0.3) {
        color = 'red'
    } else if (ratio < 0.6) {
        color = 'orange'
    } else if (p.current < p.total) {
        color = 'lime'
    }

    // console.log(p.current, p.total, color)
    if(p.total > 5) {
        return <div className='hp-col'>
                <div className='hp' style={{color}}>{p.current}</div>
                <div className='hp' style={{color}}>/</div>
                <div className='hp' style={{color}}>{p.total}</div>
                <img className='hp' src={`icons/hp_${color}.png`} />
        </div>
    }

    return <div className='hp-col'>
        {
            Array(p.total).fill(0).map((v, i)=>{
                return i < p.current? <img key={i} className='hp' src={`icons/hp_${color}.png`} /> : 
                <img key={i} className='hp' src={`icons/hp_none.png`} />
            })
        }
    </div>
}