import * as React from 'react'
var SpriteSheet = require('react-responsive-spritesheet').default;

export function getDamageSpriteSheet() {
    let item = <SpriteSheet
        image={`animations/damage.png`}
        widthFrame={172}
        heightFrame={170}
        steps={5}
        fps={60}
        direction={'forward'}
    />
    return item
}