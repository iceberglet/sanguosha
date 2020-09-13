
import { Skill, HiddenType } from "./Skill"
import { HintType } from "../../common/ServerHint"
import PlayerActionDriverDefiner from "../../client/player-actions/PlayerActionDriverDefiner"
import { playerActionDriverProvider } from "../../client/player-actions/PlayerActionDriverProvider"
import { UIPosition } from "../../common/PlayerAction"
import PlayerAct from "../../server/context/PlayerAct"
import GameManager from "../../server/GameManager"
import { TextFlashEffect } from "../../common/transit/EffectTransit"
import { CardPos } from "../../common/transit/CardPos"
import { CardBeingDroppedEvent, CardBeingUsedEvent } from "../../server/engine/Generic"
import Card, { CardType } from "../../common/cards/Card"
import TakeCardOp from "../../server/engine/TakeCardOp"
import { isSuitBlack } from "../../common/cards/ICard"
import { GuoHe } from "../../server/engine/SingleRuseOp"

export class ZhiHeng extends Skill {
    id = '制衡'
    displayName = '制衡'
    description = '出牌阶段限一次，你可以弃置至多X张牌（X为你的体力上限），然后摸等量的牌。'
    hiddenType = HiddenType.NONE

    public bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint, context)=>{
            let max = context.getPlayer(this.playerId).maxHp
            return new PlayerActionDriverDefiner('制衡')
                    .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>!hint.roundStat.customData[this.id] && id === this.id)
                    .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, max, (id, context)=>true, ()=>`请弃置至多${max}张牌`)
                    .expectAnyButton('点击确定发动制衡')
                    .build(hint)
        })
    }

    async onPlayerAction(act: PlayerAct, ignore: any, manager: GameManager): Promise<void> {
        if(act.isCancel()) {
            console.error('[制衡] 怎么可能cancel??')
            return
        }
        this.playSound(manager, 2)
        manager.broadcast(new TextFlashEffect(this.playerId, [], this.id))
        manager.roundStats.customData[this.id] = true
        
        let me = act.source
        let amount = act.cardsAndPos.length
        await act.dropCardsFromSource('制衡')
        console.log('[制衡] 一共弃置牌数', amount)
        await new TakeCardOp(me, amount).perform(manager)
    }
}


export class QiXi extends Skill {
    id = '奇袭'
    displayName = '奇袭'
    description = '你可以将一张黑色牌当【过河拆桥】使用。'
    hiddenType = HiddenType.NONE
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('奇袭')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, (id, context)=>isSuitBlack(context.interpret(id).suit), ()=>'选择一张黑色牌')
                        .expectChoose([UIPosition.PLAYER], 1, 1, 
                            (id, context)=>{
                                return id !== context.myself.player.id &&   // 不能是自己
                                context.getPlayer(id).hasCards()            // 必须有牌能拿
                            }, 
                            ()=>`选择‘奇袭’的对象`)
                        .expectAnyButton('点击确定发动奇袭(过河拆桥)')
                        .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        let cardAndPos = act.getSingleCardAndPos()
        this.playSound(manager, 2)
        cardAndPos[0].as = CardType.GUO_HE
        
        manager.sendToWorkflow(act.source.player.id, CardPos.HAND, [cardAndPos[0]], true)
        await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [cardAndPos], cardAndPos[0].type, true))
        await new GuoHe(act.source, act.targets[0], [cardAndPos[0]]).perform(manager)
    }
}

// 克己 锁定技，弃牌阶段开始时，若你未于出牌阶段内使用过颜色不同的牌或出牌阶段被跳过，你的手牌上限于此回合内+4。
// 谋断 结束阶段开始时，若你于出牌阶段内使用过四种花色或三种类别的牌，则你可以移动场上的一张牌。	

// 苦肉 出牌阶段限一次，你可以弃一张牌。若如此做，你失去1点体力，然后摸三张牌，此阶段你使用【杀】的次数上限+1。
// 英姿 锁定技，摸牌阶段，你多摸一张牌；你的手牌上限等于X（X为你的体力上限）。
// 反间 出牌阶段限一次，你可以展示一张手牌并交给一名其他角色，其选择一项：1.展示所有手牌，弃置与此牌同花色的牌；2.失去1点体力。

// 国色 你可以将一张方块牌当【乐不思蜀】使用。
// 流离 当你成为【杀】的目标时，你可以弃置一张牌并将此【杀】转移给你攻击范围内的一名其他角色。

// 谦逊 锁定技，当你成为【顺手牵羊】或【乐不思蜀】的目标时，则取消之。
// 度势 出牌阶段限四次，你可以将一张红色手牌当【以逸待劳】使用。

// 结姻 出牌阶段限一次，你可以弃置两张手牌，令你和一名已受伤的男性角色各回复1点体力。
// 枭姬 当你失去装备区里的牌后，你可以摸两张牌。
// 英魂 准备阶段，若你已受伤，你可以选择一名其他角色并选择一项：1.令其摸X张牌，然后弃置一张牌；2.令其摸一张牌，然后弃置X张牌。（X为你已损失的体力值）
// 天香 当你受到伤害时，你可以弃置一张红桃手牌,防止此次伤害并选择一名其他角色，你选择一项：令其受到1点伤害，然后摸X张牌（X为其已损失体力值且至多为5）；令其失去1点体力，然后其获得你弃置的牌。
// 红颜 出牌阶段，你可明置此武将牌；你的黑桃牌视为红桃牌。

// 天义 出牌阶段限一次，你可以与一名角色拼点：若你赢，本回合你可以多使用一张【杀】、使用【杀】无距离限制且可以多选择一个目标；若你没赢，本回合你不能使用【杀】。
// 不屈 锁定技，当你处于濒死状态时，你将牌堆顶的一张牌置于你的武将牌上，称为"创"：若此牌点数与已有的"创"点数均不同，你将体力回复至1点；若点数相同，将此牌置入弃牌堆。
// 奋激 一名角色的结束阶段开始时，若其没有手牌，你可令其摸两张牌。若如此做，你失去1点体力。

// 好施 摸牌阶段，你可以多摸两张牌，然后若你的手牌数大于5，则你将一半的手牌交给手牌最少的一名其他角色。
// 缔盟 出牌阶段限一次，你可以选择两名其他角色并弃置X张牌（X为这两名角色手牌数的差），然后令这两名角色交换手牌。

// 直谏 出牌阶段，你可以将手牌中的一张装备牌置于其他角色的装备区里，然后摸一张牌。
// 固政 其他角色的弃牌阶段结束时，你可以将此阶段中的一张弃牌返还给该角色，然后你获得其余的弃牌。

// 短兵 你使用【杀】可以多选择一名距离为1的角色为目标。
// 奋迅 出牌阶段限一次，你可以弃置一张牌并选择一名其他角色，然后本回合你计算与其的距离视为1。

// 疑城 当与你势力相同的一名角色成为【杀】的目标后，你可以令该角色摸一张牌然后弃置一张牌。
// 尚义 出牌阶段限一次，你可以令一名其他角色观看你的手牌。若如此做，你选择一项：1.观看其手牌并可以弃置其中的一张黑色牌；2.观看其所有暗置的武将牌。
// 鸟翔 阵法技，在同一个围攻关系中，若你是围攻角色，则你或另一名围攻角色使用【杀】指定被围攻角色为目标后，你令该角色需依次使用两张【闪】才能抵消。


// 激昂 当你使用【决斗】或红色【杀】指定目标后，或成为【决斗】或红色【杀】的目标后，你可以摸一张牌。
// 鹰扬 当你拼点的牌亮出后，你可以令此牌的点数+3或-3。
// 魂殇 副将技，此武将牌减少半个阴阳鱼；准备阶段，若你的体力值不大于1，则你本回合获得“英姿”和“英魂”。

// 断绁 出牌阶段限一次，你可以令一名其他角色横置，然后你横置。
// 奋命 结束阶段，若你处于连环状态，则你可以弃置所有处于连环状态的角色的各一张牌。

// 调度 与你势力相同的角色使用装备牌时可以摸一张牌。出牌阶段开始时，你可以获得与你势力相同的一名角色装备区里的一张牌，然后可以将此牌交给另一名角色。
// 典财 其他角色的出牌阶段结束时，若你于此阶段失去了X张或更多的牌，则你可以将手牌摸至体力上限，然后你可以变更一次副将(X为你的体力值)。

