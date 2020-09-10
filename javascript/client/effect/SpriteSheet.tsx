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
        case '藤甲_好': return getSheet('teng_jia_good', 132, 137, 24, onLoopComplete, 20)
        case '藤甲_坏': return getSheet('teng_jia_bad', 155, 183, 24, onLoopComplete, 20)
        case '白银狮子': return getSheet('silver_lion', 215, 243, 24, onLoopComplete, 20)
        case '仁王盾': return getSheet('reng_wang', 198, 203, 24, onLoopComplete, 20)
        case '八卦阵': return getSheet('ba_gua', 240, 240, 24, onLoopComplete, 20)
        case '青龙偃月刀': return getSheet('qing_long', 240, 240, 23, onLoopComplete, 20)
        case '贯石斧': return getSheet('guan_shi', 229, 177, 26, onLoopComplete, 20)
        case '诸葛连弩': return getSheet('lian_nu', 240, 240, 24, onLoopComplete, 20)
        case '丈八蛇矛': return getSheet('zhang_ba', 240, 240, 24, onLoopComplete, 20)
        case '雌雄双股剑': return getSheet('ci_xiong', 214, 261, 25, onLoopComplete, 20)
        case '朱雀羽扇': return getSheet('zhu_que', 180, 222, 24, onLoopComplete, 20)
        case '古锭刀': return getSheet('gu_ding', 240, 192, 25, onLoopComplete, 20)
        case '方天画戟': return getSheet('fang_tian', 218, 190, 25, onLoopComplete, 20)
        case '寒冰剑': return getSheet('han_bing', 102, 213, 25, onLoopComplete, 20)
        case '麒麟弓': return getSheet('qi_lin', 327, 215, 26, onLoopComplete, 20)
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