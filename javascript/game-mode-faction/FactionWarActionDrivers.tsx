import { playerActionDriverProvider } from "../client/player-actions/PlayerActionDriverProvider"
import { HintType } from "../common/ServerHint"
import PlayerActionDriverDefiner from "../client/player-actions/PlayerActionDriverDefiner"
import { UIPosition, Button } from "../common/PlayerAction"
import {FactionPlayerInfo}from "./FactionPlayerInfo"
import { CardPos } from "../common/transit/CardPos"
import { CardType } from "../common/cards/Card"
import { describer } from "../common/util/Describer"
import { registerPeach } from "../client/player-actions/PlayerActionDrivers"

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出知己知彼')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.ZHI_JI)
            .expectChoose([UIPosition.PLAYER], 1, 1, 
                (id, context)=>{
                    let target = context.getPlayer(id) as FactionPlayerInfo
                    if(target.isGeneralRevealed && target.isSubGeneralRevealed && target.getCards(CardPos.HAND).length === 0) {
                        return false //对方必须有手牌或者有未明置的武将牌
                    }
                    return id !== context.myself.player.id// 不能是自己
                },
                ()=>`选择‘知己知彼’的对象`)
            .expectAnyButton('点击确定使用知己知彼')
            .build(hint, [Button.OK, Button.CANCEL, new Button('chong_zhu', '重铸')])
})

// 已经有范围锦囊了
playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出以逸待劳')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.YI_YI)
            .expectAnyButton('点击确定使用以逸待劳')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出远交近攻')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>{
                if(!(context.myself as FactionPlayerInfo).isRevealed()) {
                    return false
                }
                return context.interpret(id).type === CardType.YUAN_JIAO
            })
            .expectChoose([UIPosition.PLAYER], 1, 1, 
                (id, context)=>{
                    let me = context.myself as FactionPlayerInfo
                    if(!me.isRevealed()) {
                        return false
                    }
                    let target = context.getPlayer(id) as FactionPlayerInfo
                    if(!target.isRevealed()) {
                        return false
                    }
                    return !FactionPlayerInfo.factionSame(me, target) && 
                            id !== context.myself.player.id
                },  // 不能是自己, 对象也不能是同势力
                ()=>`选择一个不同阵营的玩家作为‘远交近攻’的对象`)
            .expectAnyButton('点击确定使用远交近攻')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    let lookMain = new Button('main', '观看其主将牌').inDirect()
    let lookSub = new Button('sub', '观看其副将牌').inDirect()
    let noLook = new Button('noLook', '不观看').inDirect()
    return new PlayerActionDriverDefiner('出牌阶段弃置先驱标记')
            .expectChoose([UIPosition.SIGNS], 1, 1, (id, context)=>{
                return id === '先'
            })
            .expectChoose([UIPosition.PLAYER], 0, 1, 
                (id, context)=>{
                    if(id === context.myself.player.id) {
                        return false
                    }
                    console.trace(id)
                    let target = context.getPlayer(id) as FactionPlayerInfo
                    if(target.isGeneralRevealed && target.isSubGeneralRevealed) {
                        return false
                    }
                    return true
                },
                ()=>`选择一个有暗置武将牌的玩家观看其武将牌`)
            .expectChoose([UIPosition.BUTTONS], 1, 1, (id, context, chosen)=>{
                    if(id === 'noLook') {
                        return true
                    }
                    let choice = chosen.getArr(UIPosition.PLAYER)[0]
                    if(!choice) {
                        return false
                    }
                    let target = context.getPlayer(choice) as FactionPlayerInfo
                    if(target.isGeneralRevealed && id === 'main') {
                        return false
                    }
                    if(target.isSubGeneralRevealed && id === 'sub') {
                        return false
                    }
                    return true
                },()=>'选择弃置先驱标记要观看的武将牌')
            .build(hint, [lookMain, lookSub, noLook, Button.CANCEL])
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段弃置阴阳鱼标记')
            .expectChoose([UIPosition.SIGNS], 1, 1, (id, context)=>{
                return id === '鱼'
            })
            .expectAnyButton('点击确定弃置阴阳鱼')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    let regen = new Button('regen', '回复一点体力').inDirect()
    let card = new Button('card', '摸两张牌').inDirect()
    return new PlayerActionDriverDefiner('出牌阶段弃置珠联璧合标记')
            .expectChoose([UIPosition.SIGNS], 1, 1, (id, context)=>{
                return id === '珠'
            })
            .expectChoose([UIPosition.BUTTONS], 1, 1, (id, context)=>{
                if(id === 'regen') {
                    return context.myself.hp < context.myself.maxHp
                }
                return true
            }, ()=>'选择弃置珠联璧合标记的效果')
            .build(hint, [regen, card, Button.CANCEL])
})

registerPeach((definer, hint)=>{
    return definer.expectChoose([UIPosition.SIGNS], 1, 1, (id, context)=>{
        return id === '珠'
    })
})

describer.register('先驱', '出牌阶段时，你可以弃置标记，将手牌补至4张并观看一个暗置的武将牌。')
describer.register('阴阳鱼', '你可以：1.出牌阶段时，弃置标记摸一张牌。 2.弃牌阶段弃置标记令手牌上限+2。')
describer.register('珠联璧合', '你可以：1.出牌阶段或其他角色濒死时可以弃置此标记，视为使用一张桃 2.出牌阶段可以弃置此标记，摸2张牌。')