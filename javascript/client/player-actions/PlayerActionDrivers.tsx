import { CardType } from "../../common/cards/Card";
import GameClientContext from "../GameClientContext";
import { UIPosition, Button, Marker } from "../../common/PlayerAction";
import PlayerActionDriverDefiner from "./PlayerActionDriverDefiner";
import { playerActionDriverProvider } from "./PlayerActionDriverProvider";
import { CardPos } from "../../common/transit/CardPos";
import { HintType, forbids } from "../../common/ServerHint";
import FactionPlayerInfo from "../../game-mode-faction/FactionPlayerInfo";
import { WuXieContext } from "../../server/flows/WuXieOp";

let slashTargetFilter = (id: string, context: GameClientContext)=>{
    //todo: 诸葛亮空城?
    return id !== context.myself.player.id &&
        (context.getMyDistanceTo(id) <= (context.serverHint.hint.roundStat.slashReach || context.myself.getReach()))
}

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出杀')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return context.serverHint.hint.roundStat.slashCount > 0 && context.interpret(id).type.isSlash() && context.serverHint.hint.roundStat.slashCount > 0
            })
            .expectChoose(UIPosition.PLAYER, 1, hint.roundStat.slashNumber, slashTargetFilter, ()=>`选择‘杀’的对象，可选${hint.roundStat.slashNumber}个`)
            .expectAnyButton('点击确定出杀')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出酒')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>!forbids(hint, 'wine') && context.interpret(id).type === CardType.WINE)
            .whichIs(Marker.USE)
            .expectAnyButton('点击确定干了这碗酒')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出范围锦囊')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type.genre === 'group-ruse')
            .whichIs(Marker.USE)
            .expectAnyButton('点击确定出此牌')
            .build(hint)
})


playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出乐不思蜀')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.LE_BU)
            .whichIs(Marker.USE)
            //todo: 陆逊（谦逊）不能被乐
            .expectChoose(UIPosition.PLAYER, 1, 1, (id, context)=>id !== context.myself.player.id, ()=>`选择‘乐不思蜀’的对象`)
            .expectAnyButton('点击确定使用乐不思蜀')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出兵粮寸断')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.BING_LIANG)
            .whichIs(Marker.USE)
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
            .whichIs(Marker.USE)
            //todo: 贾诩不能被黑锦囊牌target
            .expectAnyButton('点击确定使用闪电')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出火攻')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.HUO_GONG)
            .whichIs(Marker.USE)
            .expectChoose(UIPosition.PLAYER, 1, 1, 
                (id, context)=>context.getPlayer(id).getCards(CardPos.HAND).length > 0,   //必须对有手牌的人出
                ()=>`选择‘火攻’的对象`)
            .expectAnyButton('点击确定发动火攻')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出顺手牵羊')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.SHUN_SHOU)
            .whichIs(Marker.USE)
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
            .whichIs(Marker.USE)
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
            .whichIs(Marker.USE)
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
            .whichIs(Marker.USE)
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

// 已经有范围锦囊了
// playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
//     return new PlayerActionDriverDefiner('出牌阶段出以逸待劳')
//             .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.YI_YI)
//             .whichIs(Marker.USE)
//             .expectAnyButton('点击确定使用以逸待劳')
//             .build(hint)
// })

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出远交近攻')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                if(!(context.myself as FactionPlayerInfo).isRevealed()) {
                    return false
                }
                return context.interpret(id).type === CardType.YUAN_JIAO
            })
            .whichIs(Marker.USE)
            .expectChoose(UIPosition.PLAYER, 1, 1, 
                (id, context)=>{
                    let faction = context.getPlayer(id).getFaction()
                    return faction.name !== context.myself.getFaction().name && id !== context.myself.player.id
                },  // 不能是自己, 对象也不能是同势力
                ()=>`选择一个不同阵营的玩家作为‘远交近攻’的对象`)
            .expectAnyButton('点击确定使用远交近攻')
            .build(hint)
})

//todo: 重铸????
playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出铁索连环')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.TIE_SUO)
            .whichIs(Marker.USE)
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
            .whichIs(Marker.USE)
            .expectAnyButton('点击确定吃桃')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段喝酒')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return !forbids(hint, 'wine') && context.interpret(id).type === CardType.WINE
            })
            .whichIs(Marker.USE)
            .expectAnyButton('点击确定喝酒')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段穿戴装备')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return context.myself.hp < context.myself.maxHp && context.interpret(id).type.isEquipment()
            })
            .whichIs(Marker.USE)
            .expectAnyButton('点击确定穿戴装备')
            .build(hint)
})


/////////////////////////////// 被动, 回合外的动作 /////////////////////////////////

playerActionDriverProvider.registerProvider(HintType.DROP_CARDS, (hint)=>{
    if(!hint.dropNumber) {
        throw `Drop Number not specified in hint: ${hint}`
    }
    return new PlayerActionDriverDefiner('弃牌阶段选择弃牌')
            .expectChoose(UIPosition.MY_HAND, hint.dropNumber, hint.dropNumber, ()=>true, ()=>hint.hintMsg).whichIs(Marker.DROP)
            .expectAnyButton('点击确定弃牌')
            .build(hint, [Button.OK]) //cannot refuse to drop card!
})


playerActionDriverProvider.registerProvider(HintType.PEACH, (hint)=>{
    if(!hint.sourcePlayer) {
        throw `Source Player not specified in hint: ${hint}`
    }
    return new PlayerActionDriverDefiner('玩家濒死求桃')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return context.interpret(id).type === CardType.PEACH || 
                        (hint.sourcePlayer === context.myself.player.id && context.interpret(id).type === CardType.WINE)
            }, ()=>hint.hintMsg)
            .whichIs(Marker.USE)
            .expectAnyButton('点击确定使用桃')
            .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
})

playerActionDriverProvider.registerProvider(HintType.DODGE, (hint)=>{
    return new PlayerActionDriverDefiner(hint.hintMsg)
                .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type === CardType.DODGE, ()=>hint.hintMsg)
                .whichIs(Marker.USE)
                .expectAnyButton('点击确定使用闪')
                .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
})

playerActionDriverProvider.registerProvider(HintType.SLASH, (hint)=>{
    return new PlayerActionDriverDefiner(hint.hintMsg)
                .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type.isSlash(), ()=>hint.hintMsg)
                .whichIs(Marker.USE)
                .expectAnyButton('点击确定使用杀')
                .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
})



//todo: put this in equipement section

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段装备东西')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>context.interpret(id).type.isEquipment())
            .whichIs(Marker.USE)
            .expectAnyButton('点击确定装备此牌')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段丈八出杀')
            .expectChoose(UIPosition.MY_EQUIP, 1, 1, (id, context)=>context.interpret(id).type === CardType.ZHANG_BA)
            .expectChoose(UIPosition.MY_HAND, 2, 2, (id)=>true, ()=>'请选择两张手牌')
            .whichIs(Marker.USE)
            .expectChoose(UIPosition.PLAYER, 1, hint.roundStat.slashNumber, slashTargetFilter, ()=>`选择‘杀’的对象，可选${hint.roundStat.slashNumber}个`)
            .expectAnyButton('点击确定出杀')
            .build(hint)
})