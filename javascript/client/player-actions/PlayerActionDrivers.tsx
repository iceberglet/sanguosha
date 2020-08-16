import { CardType } from "../../common/cards/Card";
import GameClientContext from "../GameClientContext";
import { UIPosition, Button } from "../../common/PlayerAction";
import PlayerActionDriverDefiner from "./PlayerActionDriverDefiner";
import { playerActionDriverProvider } from "./PlayerActionDriverProvider";
import { CardPos } from "../../common/transit/CardPos";
import { HintType, forbids } from "../../common/ServerHint";
import FactionPlayerInfo from "../../game-mode-faction/FactionPlayerInfo";

let slashTargetFilter = (id: string, context: GameClientContext)=>{
    //todo: 诸葛亮空城?
    return id !== context.myself.player.id && 
        (context.getMyDistanceTo(id) <= (context.serverHint.hint.roundStat.slashReach || context.myself.getReach()))
}

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出杀')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return !forbids(hint, 'slash') && context.interpret(id).type.isSlash()
            })
            .expectChoose(UIPosition.PLAYER, 1, hint.roundStat.slashNumber, slashTargetFilter, ()=>`选择‘杀’的对象，可选${hint.roundStat.slashNumber}个`)
            .expectAnyButton('点击确定出杀')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出范围锦囊')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type.genre === 'group-ruse')
            .expectAnyButton('点击确定出此牌')
            .build(hint)
})


playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出乐不思蜀')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.LE_BU)
            //todo: 陆逊（谦逊）不能被乐
            .expectChoose(UIPosition.PLAYER, 1, 1, (id, context)=>id !== context.myself.player.id, ()=>`选择‘乐不思蜀’的对象`)
            .expectAnyButton('点击确定使用乐不思蜀')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出兵粮寸断')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.BING_LIANG)
            .expectChoose(UIPosition.PLAYER, 1, 1, 
                (id, context)=>id !== context.myself.player.id &&       //不能是自己
                                (context.getMyDistanceTo(id) <= (context.serverHint.hint.roundStat.ruseReach || 1)), //范围得是1
                ()=>`选择‘兵粮寸断’的对象`)
            .expectAnyButton('点击确定使用兵粮寸断')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出闪电')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.SHAN_DIAN)
            //todo: 贾诩不能被黑锦囊牌target
            .expectAnyButton('点击确定使用闪电')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出火攻')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.HUO_GONG)
            .expectChoose(UIPosition.PLAYER, 1, 1, 
                (id, context)=>context.getPlayer(id).getCards(CardPos.HAND).length > 0,   //必须对有手牌的人出
                ()=>`选择‘火攻’的对象`)
            .expectAnyButton('点击确定发动火攻')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出顺手牵羊')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.SHUN_SHOU)
            .expectChoose(UIPosition.PLAYER, 1, 1, 
                (id, context)=>{
                    return id !== context.myself.player.id &&   // 不能是自己
                    context.getPlayer(id).hasCards() &&         // 必须有牌能拿
                    (context.getMyDistanceTo(id) <= (context.serverHint.hint.roundStat.ruseReach || 1))
                },
                ()=>`选择‘顺手牵羊’的对象`)
            .expectAnyButton('点击确定发动顺手牵羊')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出过河拆桥')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.GUO_HE)
            .expectChoose(UIPosition.PLAYER, 1, 1, 
                (id, context)=>{
                    return id !== context.myself.player.id &&   // 不能是自己
                    context.getPlayer(id).hasCards()            // 必须有牌能拿
                }, 
                ()=>`选择‘过河拆桥’的对象`)
            .expectAnyButton('点击确定发动过河拆桥')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出决斗')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.JUE_DOU)
            .expectChoose(UIPosition.PLAYER, 1, 1, 
                //todo: 诸葛亮空城?
                (id, context)=>id !== context.myself.player.id,  // 不能是自己
                ()=>`选择‘决斗’的对象`)
            .expectAnyButton('点击确定发动决斗')
            .build(hint)
})


playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出知己知彼')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.ZHI_JI)
            .expectChoose(UIPosition.PLAYER, 1, 1, 
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

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出以逸待劳')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.YI_YI)
            .expectAnyButton('点击确定使用以逸待劳')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出远交近攻')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                if(!(context.myself as FactionPlayerInfo).isRevealed()) {
                    return false
                }
                return context.interpret(id).type === CardType.YUAN_JIAO
            })
            .expectChoose(UIPosition.PLAYER, 1, 1, 
                (id, context)=>{
                    let faction = context.getPlayer(id).getFaction()
                    return faction.name !== context.myself.getFaction().name && id !== context.myself.player.id
                },  // 不能是自己, 对象也不能是同势力
                ()=>`选择一个不同阵营的玩家作为‘远交近攻’的对象`)
            .expectAnyButton('点击确定使用远交近攻')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出铁索连环')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.TIE_SUO)
            .expectChoose(UIPosition.PLAYER, 1, 2, 
                (id, context)=>true,    //todo: 贾诩?
                ()=>`选择1到2个‘铁索连环’的对象`)
            .expectAnyButton('点击确定使用铁索连环')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段吃桃')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return context.myself.hp < context.myself.maxHp && context.interpret(id).type === CardType.PEACH
            })
            .expectAnyButton('点击确定吃桃')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段喝酒')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return !forbids(hint, 'wine') && context.interpret(id).type === CardType.PEACH
            })
            .expectAnyButton('点击确定喝酒')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段穿戴装备')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return context.myself.hp < context.myself.maxHp && context.interpret(id).type.isEquipment()
            })
            .expectAnyButton('点击确定穿戴装备')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段丈八出杀')
            .expectChoose(UIPosition.MY_EQUIP, 1, 1, (id, context)=>context.interpret(id).type === CardType.ZHANG_BA)
            .expectChoose(UIPosition.MY_HAND, 2, 2, (id)=>true, ()=>'请选择两张手牌')
            .expectChoose(UIPosition.PLAYER, 1, hint.roundStat.slashNumber, slashTargetFilter, ()=>`选择‘杀’的对象，可选${hint.roundStat.slashNumber}个`)
            .expectAnyButton('点击确定出杀')
            .build(hint)
})


playerActionDriverProvider.registerProvider(HintType.DROP_CARDS, (hint)=>{
    if(!hint.dropNumber) {
        throw `Drop Number not specified in hint: ${hint}`
    }
    return new PlayerActionDriverDefiner('弃牌阶段选择弃牌')
            .expectChoose(UIPosition.MY_HAND, hint.dropNumber, hint.dropNumber, ()=>true, ()=>hint.hintMsg)
            .expectAnyButton('点击确定弃牌')
            .build(hint, [Button.OK]) //cannot refuse to drop card!
})


playerActionDriverProvider.registerProvider(HintType.PEACH, (hint)=>{
    if(!hint.sourcePlayer) {
        throw `Source Player not specified in hint: ${hint}`
    }
    return new PlayerActionDriverDefiner('玩家濒死求桃' + hint.targetPlayers[0])
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return context.interpret(id).type === CardType.PEACH || 
                        (hint.sourcePlayer === context.myself.player.id && context.interpret(id).type === CardType.WINE)
            }, ()=>hint.hintMsg)
            .expectAnyButton('点击确定使用桃救该玩家')
            .build(hint) //cannot refuse to drop card!
})

// playerActionDriverProvider.registerProvider('dodge', (hint)=>{
//     return new PlayerActionDriverDefiner()
//                 .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.DODGE)
//                 .expectChoose(UIPosition.BUTTONS, 1, 1, (id, context)=>id === Button.OK.id || id === Button.CANCEL.id)
//                 .build()
// })
