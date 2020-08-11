import { cardManager, CardType } from "../../common/cards/Card";
import GameClientContext from "./GameClientContext";
import { UIPosition, Button } from "../../common/PlayerAction";
import PlayerActionDriverDefiner from "./PlayerActionDriverDefiner";
import { playerActionDriverProvider } from "./PlayerActionDriverProvider";
import { CardPos } from "../../common/transit/ContextTransit";
import { HintType, forbids } from "../../common/ServerHint";

let slashTargetFilter = (id: string, context: GameClientContext)=>{
    //todo: 诸葛亮空城?
    return id !== context.myself.player.id && 
        (context.getMyDistanceTo(id) <= (context.serverHint.hint.slashReach || context.myself.getReach()))
}

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出杀')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return !forbids(hint, 'slash') && context.myself.cardInterpreter(cardManager.getCard(id)).type.isSlash()
            })
            .expectChoose(UIPosition.PLAYER, 1, hint.slashNumber, slashTargetFilter, ()=>`选择‘杀’的对象，可选${hint.slashNumber}个`)
            .expectAnyButton('点击确定出杀')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出范围锦囊')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.myself.cardInterpreter(cardManager.getCard(id)).type.genre === 'group-ruse')
            .expectAnyButton('点击确定出此牌')
            .build(hint)
})


playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出乐不思蜀')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.LE_BU)
            //todo: 陆逊（谦逊）不能被乐
            .expectChoose(UIPosition.PLAYER, 1, 1, (id, context)=>id !== context.myself.player.id, ()=>`选择‘乐不思蜀’的对象`)
            .expectAnyButton('点击确定使用乐不思蜀')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出兵粮寸断')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.BING_LIANG)
            .expectChoose(UIPosition.PLAYER, 1, 1, 
                (id, context)=>id !== context.myself.player.id &&       //不能是自己
                                (context.getMyDistanceTo(id) <= (context.serverHint.hint.ruseReach || 1)), //范围得是1
                ()=>`选择‘兵粮寸断’的对象`)
            .expectAnyButton('点击确定使用兵粮寸断')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出闪电')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.SHAN_DIAN)
            //todo: 贾诩不能被黑锦囊牌target
            .expectAnyButton('点击确定使用闪电')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出火攻')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.HUO_GONG)
            .expectChoose(UIPosition.PLAYER, 1, 1, 
                (id, context)=>context.getPlayer(id).getCards(CardPos.HAND).length > 0,   //必须对有手牌的人出
                ()=>`选择‘火攻’的对象`)
            .expectAnyButton('点击确定发动火攻')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出顺手牵羊')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.SHUN_SHOU)
            .expectChoose(UIPosition.PLAYER, 1, 1, 
                (id, context)=>{
                    return id !== context.myself.player.id &&   // 不能是自己
                    context.getPlayer(id).hasCards() &&         // 必须有牌能拿
                    (context.getMyDistanceTo(id) <= (context.serverHint.hint.ruseReach || 1))
                },
                ()=>`选择‘顺手牵羊’的对象`)
            .expectAnyButton('点击确定发动顺手牵羊')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出过河拆桥')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.GUO_HE)
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
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.JUE_DOU)
            .expectChoose(UIPosition.PLAYER, 1, 1, 
                //todo: 诸葛亮空城?
                (id, context)=>id !== context.myself.player.id,  // 不能是自己
                ()=>`选择‘决斗’的对象`)
            .expectAnyButton('点击确定发动决斗')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出铁索连环')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.TIE_SUO)
            .expectChoose(UIPosition.PLAYER, 1, 2, 
                (id, context)=>true,    //todo: 贾诩?
                ()=>`选择1到2个‘铁索连环’的对象`)
            .expectAnyButton('点击确定使用铁索连环')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段吃桃')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return context.myself.hp < context.myself.maxHp && context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.PEACH
            })
            .expectAnyButton('点击确定吃桃')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段喝酒')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return !forbids(hint, 'wine') && context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.PEACH
            })
            .expectAnyButton('点击确定喝酒')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段穿戴装备')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return context.myself.hp < context.myself.maxHp && context.myself.cardInterpreter(cardManager.getCard(id)).type.isEquipment()
            })
            .expectAnyButton('点击确定穿戴装备')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段丈八出杀')
            .expectChoose(UIPosition.MY_EQUIP, 1, 1, (id, context)=>context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.ZHANG_BA)
            .expectChoose(UIPosition.MY_HAND, 2, 2, (id)=>true)
            .expectChoose(UIPosition.PLAYER, 1, hint.slashNumber, slashTargetFilter)
            .expectAnyButton('点击确定出杀')
            .build(hint)
})


playerActionDriverProvider.registerProvider(HintType.DROP_CARDS, (hint)=>{
    if(!hint.dropNumber) {
        throw `Drop Number not specified in hint: ${hint}`
    }
    return new PlayerActionDriverDefiner('弃牌阶段选择弃牌')
            .expectChoose(UIPosition.MY_HAND, hint.dropNumber, hint.dropNumber, ()=>true)
            .expectAnyButton('点击确定弃牌')
            .build(hint, [Button.OK]) //cannot refuse to drop card!
})


playerActionDriverProvider.registerProvider(HintType.PEACH, (hint)=>{
    if(!hint.sourcePlayer) {
        throw `Source Player not specified in hint: ${hint}`
    }
    return new PlayerActionDriverDefiner(hint.hintMsg)
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.PEACH || 
                        (hint.sourcePlayer === context.myself.player.id && context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.WINE)
            })
            .expectAnyButton('点击确定使用')
            .build(hint, [Button.OK]) //cannot refuse to drop card!
})

// playerActionDriverProvider.registerProvider('dodge', (hint)=>{
//     return new PlayerActionDriverDefiner()
//                 .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.myself.cardInterpreter(cardManager.getCard(id)).type === CardType.DODGE)
//                 .expectChoose(UIPosition.BUTTONS, 1, 1, (id, context)=>id === Button.OK.id || id === Button.CANCEL.id)
//                 .build()
// })
