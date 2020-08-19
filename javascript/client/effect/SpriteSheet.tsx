import * as React from 'react'
var SpriteSheet = require('react-responsive-spritesheet').default;

export function getDamageSpriteSheet() {
    return <SpriteSheet
        image={`animations/damage.png`}
        widthFrame={172}
        heightFrame={170}
        steps={5}
        fps={60}
    />
}

export function getEffect(name: string, onLoopComplete: ()=>void) {
    switch(name) {
        case '酒': return getSheet('wine', 278, 273, 17, onLoopComplete)
        case '桃': return getSheet('peach', 330, 324, 17, onLoopComplete)
        case '闪': return getSheet('dodge', 138, 138, 13, onLoopComplete)
        case '杀': return getSheet('slash', 330, 268, 15, onLoopComplete)
        case '红杀': return getSheet('slash_red', 330, 330, 17, onLoopComplete)
        case '火杀': return getSheet('slash_fire', 330, 330, 16, onLoopComplete)
        case '雷杀': return getSheet('slash_thunder', 650, 416, 16, onLoopComplete)
    }
    return null
}

export function getSheet(name: string, width: number, height: number, frames: number, onLoopComplete: ()=>void, frameRate: number = 20) {
    let item = <SpriteSheet
        image={`animations/${name}.png`}
        widthFrame={width}
        heightFrame={height}
        steps={frames}
        fps={frameRate}
        loop={true}
        onLoopComplete={(sheet: any)=>{
            sheet.pause()
            onLoopComplete()
        }}
        
    />
    return item
}