import * as React from 'react'


export type Coor = {
    x: number
    y: number
}

export class ScreenPosObtainer {
    private getters = new Map<string, (item: string)=>Coor>()
    register(id: string, getter: (item: string)=>Coor) {
        this.getters.set(id, getter)
    }
    registerObtainer(id: string, ref: React.RefObject<any>) {
        this.getters.set(id, ()=>{
            let {top, bottom, left, right} = ref.current.getBoundingClientRect()
            return {
                // playerId: this.props.info.player.id,
                x: (left + right) / 2,
                y: (top + bottom) / 2
            }
        })
    }
    getPos(id: string, item: string = ''): Coor {
        let getter = this.getters.get(id)
        return getter(item)
    }
}