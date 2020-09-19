import { CardType } from "../../common/cards/Card";
import GameClientContext from "../GameClientContext";
import { UIPosition, Button } from "../../common/PlayerAction";
import PlayerActionDriverDefiner from "./PlayerActionDriverDefiner";
import { playerActionDriverProvider } from "./PlayerActionDriverProvider";
import { CardPos } from "../../common/transit/CardPos";
import { HintType, ServerHint } from "../../common/ServerHint";
import { WINE_TAKEN } from "../../common/RoundStat";

function isInReach(from: string, to: string, context: GameClientContext) {
    return context.computeDistance(from, to) <= context.getPlayer(from).getReach()
}

export const slashTargetFilter = (id: string, context: GameClientContext)=>{
    //1. 不能是自己
    //2. 不能是hint中已经指定的target
    //3. 必须在距离内
    return id !== context.myself.player.id && !context.serverHint.hint.targetPlayers?.find(p => p === id) &&
        (context.getMyDistanceTo(id) <= (context.serverHint.hint.roundStat.slashReach || context.myself.getReach()))
}

//---------------------- Slash Play ----------------------

export function registerSlashPlayingHand(slashPlayer: (definer: PlayerActionDriverDefiner, hint: ServerHint) => PlayerActionDriverDefiner) {
    playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
        let roundStat = hint.roundStat
        if(roundStat.slashMax <= roundStat.slashCount) {
            return null //do not allow this
        }
        return slashPlayer(new PlayerActionDriverDefiner('出牌阶段出杀'), hint)
                .expectChoose([UIPosition.PLAYER], 1, hint.roundStat.slashNumber, slashTargetFilter, ()=>`选择‘杀’的对象，可选${hint.roundStat.slashNumber}个`)
                .expectAnyButton('点击确定出杀')
                .build(hint)
    })
}

export function registerSlash(slashPlayer: (definer: PlayerActionDriverDefiner, hint: ServerHint) => PlayerActionDriverDefiner) {
    playerActionDriverProvider.registerProvider(HintType.SLASH, (hint)=>{
        return slashPlayer(new PlayerActionDriverDefiner(hint.hintMsg), hint)
                    .expectAnyButton('点击确定使用杀')
                    .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
    })
}

export function registerPlaySlash(slashPlayer: (definer: PlayerActionDriverDefiner, hint: ServerHint) => PlayerActionDriverDefiner) {
    playerActionDriverProvider.registerProvider(HintType.PLAY_SLASH, (hint)=>{
        let definer = slashPlayer(new PlayerActionDriverDefiner(hint.hintMsg), hint)
        if(hint.targetPlayers) {
            return definer.expectAnyButton(`点击确定对${hint.targetPlayers[0]}使用杀`)
                            .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
        } else {
            return definer.expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>{
                                //hacking, actually the opposite of forbidden
                                if(hint.forbidden) {
                                    return !!hint.forbidden.find(f => f === id)
                                } else {
                                    return id !== context.myself.player.id
                                }
                            }, ()=>'请选择出杀的目标')
                            .expectAnyButton(`点击确定使用杀`)
                            .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
        }
    })
}

/**
 * 出牌阶段出杀
 */
registerSlashPlayingHand((definer, hint)=>{
    return definer.expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type.isSlash(), ()=>hint.hintMsg)
})

/**
 * 被动被要求对指定目标出杀
 */
registerPlaySlash((definer, hint) => {
    return definer.expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type.isSlash(), ()=>hint.hintMsg)
})

/**
 * 被动出杀（决斗，南蛮）
 */
registerSlash((definer, hint) => {
    return definer.expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type.isSlash(), ()=>hint.hintMsg)
})

//------ 丈八 
function Zhangba(definer: PlayerActionDriverDefiner, hint: ServerHint): PlayerActionDriverDefiner {
    return definer.expectChoose([UIPosition.MY_EQUIP], 1, 1, (id, context)=>context.interpret(id).type === CardType.ZHANG_BA, ()=>hint.hintMsg)
                  .expectChoose([UIPosition.MY_HAND], 2, 2, (id)=>true, ()=>'请选择两张手牌')
}

registerSlashPlayingHand(Zhangba)

registerPlaySlash(Zhangba)

registerSlash(Zhangba)

//--------------------------------------------

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出酒')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>{
                return !hint.roundStat.customData[WINE_TAKEN] && context.interpret(id).type === CardType.WINE
            })
            .expectAnyButton('点击确定干了这碗酒')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出范围锦囊')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type.genre === 'group-ruse')
            .expectAnyButton('点击确定出此牌')
            .build(hint)
})


playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出乐不思蜀')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.LE_BU)
            .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>{
                return id !== context.myself.player.id &&       //不能是自己
                        !context.getPlayer(id).hasJudgeCard(CardType.LE_BU) //不能已经有乐不思蜀
            }, ()=>`选择‘乐不思蜀’的对象`)
            .expectAnyButton('点击确定使用乐不思蜀')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出兵粮寸断')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.BING_LIANG)
            .expectChoose([UIPosition.PLAYER], 1, 1, 
                (id, context)=>id !== context.myself.player.id &&       //不能是自己
                                (context.getMyDistanceTo(id) <= (context.serverHint.hint.roundStat.binLiangReach)) && //范围得是1
                                !context.getPlayer(id).hasJudgeCard(CardType.BING_LIANG), //不能已经有兵粮了
                ()=>`选择‘兵粮寸断’的对象`)
            .expectAnyButton('点击确定使用兵粮寸断')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出闪电')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.SHAN_DIAN)
            .expectAnyButton('点击确定使用闪电')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出火攻')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.HUO_GONG)
            .expectChoose([UIPosition.PLAYER], 1, 1, 
                (id, context)=>context.getPlayer(id).getCards(CardPos.HAND).length > 0,   //必须对有手牌的人出
                ()=>`选择‘火攻’的对象`)
            .expectAnyButton('点击确定发动火攻')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出无中生有')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.WU_ZHONG)
            .expectAnyButton('点击确定使用无中生有')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出顺手牵羊')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.SHUN_SHOU)
            .expectChoose([UIPosition.PLAYER], 1, 1, 
                (id, context)=>{
                    return id !== context.myself.player.id &&   // 不能是自己
                    context.getPlayer(id).hasCards() &&         // 必须有牌能拿
                    (context.getMyDistanceTo(id) <= (context.serverHint.hint.roundStat.shunshouReach))
                },
                ()=>`选择‘顺手牵羊’的对象`)
            .expectAnyButton('点击确定使用顺手牵羊')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出过河拆桥')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.GUO_HE)
            .expectChoose([UIPosition.PLAYER], 1, 1, 
                (id, context)=>{
                    return id !== context.myself.player.id &&   // 不能是自己
                    context.getPlayer(id).hasCards()            // 必须有牌能拿
                }, 
                ()=>`选择‘过河拆桥’的对象`)
            .expectAnyButton('点击确定使用过河拆桥')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出决斗')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.JUE_DOU)
            .expectChoose([UIPosition.PLAYER], 1, 1, 
                //todo: 诸葛亮空城?
                (id, context)=>id !== context.myself.player.id,  // 不能是自己
                ()=>`选择‘决斗’的对象`)
            .expectAnyButton('点击确定发动决斗')
            .build(hint)
})


playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出铁索连环')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.TIE_SUO)
            .expectChoose([UIPosition.PLAYER], 1, 2, 
                (id, context)=>true,
                ()=>`选择1到2个‘铁索连环’的对象, 或者直接重铸`)
            .expectAnyButton('点击确定使用铁索连环 或重铸')
            .build(hint, [Button.OK, Button.CANCEL, new Button('chong_zhu', '重铸')])
})

//todo
playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出借刀杀人')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.JIE_DAO)
            .expectChoose([UIPosition.PLAYER], 2, 2, 
                (id, context, chosenMap)=>{
                    let chosen = chosenMap.getArr(UIPosition.PLAYER)
                    if(chosen.length === 0) {
                        //not me, and has weapon!
                        return id !== context.myself.player.id && !!context.getPlayer(id).getCards(CardPos.EQUIP).find(c => c.type.genre === 'weapon')
                    } else if (chosen.length === 1) {
                        return isInReach(chosen[0], id, context)
                    }
                    return false
                },
                ()=>`先选择借刀之人, 再选要杀的目标`).noBacksie()
            .expectAnyButton('点击确定使用借刀杀人')
            .build(hint)
})

// playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
//     return new PlayerActionDriverDefiner('出牌阶段吃桃')
//             .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>{
//                 return context.myself.hp < context.myself.maxHp && context.interpret(id).type === CardType.PEACH
//             })
//             .expectAnyButton('点击确定吃桃')
//             .build(hint)
// })

registerPeachPlayHand((definer, hint)=>{
    return definer.expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.myself.hp < context.myself.maxHp && context.interpret(id).type === CardType.PEACH)
})

/**
 * 出牌阶段出桃回血
 */
export function registerPeachPlayHand(peachStepper: (definer: PlayerActionDriverDefiner, hint: ServerHint) => PlayerActionDriverDefiner) {
    playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
        return peachStepper(new PlayerActionDriverDefiner('出牌阶段吃桃'), hint)
                .expectAnyButton('点击确定使用此牌/标记回复1点体力')
                .build(hint)
    })
}

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段喝酒')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>{
                return hint.roundStat.customData[WINE_TAKEN] && context.interpret(id).type === CardType.WINE
            })
            .expectAnyButton('点击确定喝酒')
            .build(hint)
})

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段穿戴装备')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>{
                return context.myself.hp < context.myself.maxHp && context.interpret(id).type.isEquipment()
            })
            .expectAnyButton('点击确定穿戴装备')
            .build(hint)
})


/////////////////////////////// 被动, 回合外的动作 /////////////////////////////////

//弃牌, 火攻, 等等
playerActionDriverProvider.registerProvider(HintType.CHOOSE_CARD, (hint)=>{
    if(!hint.quantity || !hint.positions) {
        throw `Card Number / Positions not specified in hint: ${hint}`
    }
    return new PlayerActionDriverDefiner('令玩家选择牌')
            .expectChoose(hint.positions, hint.quantity, hint.quantity, (id, context)=>{
                if(hint.suits) {
                    let cardSuit = context.interpret(id, context.myself).suit
                    return !!hint.suits.find(s => s === cardSuit)
                }
                if(hint.forbidden) {
                    return !hint.forbidden.find(f => f === id) //must not be forbidden
                }
                return true
            }, ()=>hint.hintMsg)
            .expectAnyButton('点击确定完成操作')
            .build(hint, [Button.OK]) //cannot refuse unless server allows you
})

registerPeach((definer, hint)=>{
    return definer.expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>{
        return context.interpret(id).type === CardType.PEACH || 
                    (hint.sourcePlayer === context.myself.player.id && context.interpret(id).type === CardType.WINE)
    })
})

/**
 * 濒死求桃时使用桃
 */
export function registerPeach(peachStepper: (definer: PlayerActionDriverDefiner, hint: ServerHint) => PlayerActionDriverDefiner) {
    playerActionDriverProvider.registerProvider(HintType.PEACH, (hint)=>{
        if(!hint.sourcePlayer) {
            throw `Source Player not specified in hint: ${hint}`
        }
        return peachStepper(new PlayerActionDriverDefiner('玩家濒死求桃'), hint)
                .expectAnyButton('点击确定使用桃/酒')
                .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
    })
}

playerActionDriverProvider.registerProvider(HintType.DODGE, (hint)=>{
    return new PlayerActionDriverDefiner(hint.hintMsg)
                .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.DODGE, ()=>hint.hintMsg)
                .expectAnyButton('点击确定使用闪')
                .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
})


playerActionDriverProvider.registerProvider(HintType.WU_XIE, (hint)=>{
    return new PlayerActionDriverDefiner(hint.hintMsg)
                .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type.isWuxie(), ()=>hint.hintMsg)
                .expectAnyButton('点击确定使用无懈可击')
                .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
})

playerActionDriverProvider.registerProvider(HintType.MULTI_CHOICE, (hint)=>{
    return new PlayerActionDriverDefiner(hint.hintMsg)
                .expectAnyButton(hint.hintMsg)
                .build(hint, []) //all buttons are provided by server
})

playerActionDriverProvider.registerProvider(HintType.CHOOSE_PLAYER, (hint)=>{
    return new PlayerActionDriverDefiner(hint.hintMsg)
                .expectChoose([UIPosition.PLAYER], hint.minQuantity, hint.quantity, 
                    (id, context)=>{
                        if(hint.forbidden) {
                            return !hint.forbidden.find(f => f === id)
                        }
                        return true
                    },
                    ()=>hint.hintMsg)
                .expectAnyButton(hint.hintMsg)
                .build(hint, [Button.OK]) //cancel button is provided by server
})


//todo: put this in equipement section

playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段装备东西')
            .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type.isEquipment())
            .expectAnyButton('点击确定装备此牌')
            .build(hint)
})

// playerActionDriverProvider.registerProvider(HintType.PLAY_SLASH, (hint)=>{
//     return new PlayerActionDriverDefiner('被动方天画戟')
//             .expectChoose([UIPosition.MY_EQUIP], 1, 1, (id, context) => context.interpret(id).type === CardType.FANG_TIAN && 
//                                                                     context.myself.getCards(CardPos.HAND).length === 1) //最后一张手牌了...
//             .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context) => context.interpret(id).type.isSlash() , ()=>'请选择杀')
//             .expectChoose([UIPosition.PLAYER], 1, 2, slashTargetFilter, ()=>`选择‘杀’的对象，可额外选2个`)
//             .expectAnyButton('点击确定出杀')
//             .build(hint)
// })

playerActionDriverProvider.registerSpecial(CardType.SAN_JIAN.name, (hint)=>{
    let source = hint.sourcePlayer
    return new PlayerActionDriverDefiner(hint.hintMsg)
        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context) => true, ()=>'选择一张手牌弃置')
        .expectChoose([UIPosition.PLAYER], 1, 1, (id: string, context: GameClientContext)=>{
                        //3. 必须在target距离1以内
                        return id !== source && context.computeDistance(source, id) === 1
                    }, ()=>`选择距离${source}为1的另一名玩家`)
        .expectAnyButton('点击确定对其造成伤害')
        .build(hint, [Button.OK]) //cancel button is provided by server
})
