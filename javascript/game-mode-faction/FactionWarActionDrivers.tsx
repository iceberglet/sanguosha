import { playerActionDriverProvider } from "../client/player-actions/PlayerActionDriverProvider"
import { HintType } from "../common/ServerHint"
import PlayerActionDriverDefiner from "../client/player-actions/PlayerActionDriverDefiner"
import { UIPosition } from "../common/PlayerAction"
import FactionPlayerInfo from "./FactionPlayerInfo"
import { CardPos } from "../common/transit/CardPos"
import { CardType } from "../common/cards/Card"

//todo: 如何让这个file被import到??
//todo: 需要势力确认才能用这些牌!

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
            .build(hint)
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
                    let faction = context.getPlayer(id).getFaction()
                    return faction.name !== context.myself.getFaction().name && id !== context.myself.player.id
                },  // 不能是自己, 对象也不能是同势力
                ()=>`选择一个不同阵营的玩家作为‘远交近攻’的对象`)
            .expectAnyButton('点击确定使用远交近攻')
            .build(hint)
})