import { SimpleConditionalSkill, EventRegistryForSkills, Skill } from "./Skill"
import GameManager from "../../server/GameManager"
import DamageOp, { DamageType, DamageSource } from "../../server/engine/DamageOp"
import { StageStartFlow, StageEndFlow } from "../../server/engine/StageFlows"
import { Stage } from "../../common/Stage"
import { UIPosition, Button } from "../../common/PlayerAction"
import PlayerActionDriverDefiner from "../../client/player-actions/PlayerActionDriverDefiner"
import { HintType } from "../../common/ServerHint"
import { playerActionDriverProvider } from "../../client/player-actions/PlayerActionDriverProvider"
import { TextFlashEffect } from "../../common/transit/EffectTransit"
import { CardPos } from "../../common/transit/CardPos"
import { WINE_TAKEN } from "../../common/RoundStat"
import { CardType } from "../../common/cards/Card"
import { slashTargetFilter } from "../../client/player-actions/PlayerActionDrivers"
import WineOp from "../../server/engine/WineOp"
import PeachOp from "../../server/engine/PeachOp"
import PlaySlashOp, { SlashOP, AskForSlashOp, SlashDodgedEvent } from "../../server/engine/SlashOp"
import { isSuitRed } from "../../common/cards/ICard"
import { CardBeingPlayedEvent, CardBeingUsedEvent } from "../../server/engine/Generic"
import TakeCardOp from "../../server/engine/TakeCardOp"
import PlayerAct from "../../server/context/PlayerAct"
import DodgeOp from "../../server/engine/DodgeOp"
import HealOp from "../../server/engine/HealOp"

export class Rende extends Skill {

    id = '仁德'
    displayName = '仁德'
    description = '出牌阶段每名角色限一次，你可以将任意张手牌交给一名其他角色。当你给出第二张"仁德"牌时，你可以视为使用一张基本牌。'
    givenAmount = 0
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('仁德给牌')
                    .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                    .expectChoose([UIPosition.MY_HAND], 1, 999, (id, context)=>true, ()=>'选择任意张手牌交给另一名玩家')
                    .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>{
                        let played = hint.roundStat.customData[this.id] as Set<string>
                        return id !== this.playerId && (!played || !played.has(id))
                    }, ()=>'选择一名此回合尚未给过牌的其他玩家')
                    .expectAnyButton('点击确定使用仁德')
                    .build(hint)
        })
        //酒或桃
        //杀, 雷杀, 火杀
        playerActionDriverProvider.registerSpecial(this.id, (hint)=>{
            return new PlayerActionDriverDefiner('请选择仁德使用基本牌')
                    .expectChoose([UIPosition.BUTTONS], 1, 1, (id, context)=>id === CardType.WINE.id || id === CardType.PEACH.id)
                    .build(hint)
        })
        playerActionDriverProvider.registerSpecial(this.id, (hint)=>{
            return new PlayerActionDriverDefiner('请选择仁德使用基本牌')
                    .expectChoose([UIPosition.BUTTONS], 1, 1, (id, context)=>id === CardType.SLASH.id || 
                                    id === CardType.SLASH_FIRE.id || id === CardType.SLASH_THUNDER.id)
                    .expectChoose([UIPosition.PLAYER], 1, hint.roundStat.slashNumber, slashTargetFilter, ()=>`选择‘杀’的对象，可选${hint.roundStat.slashNumber}个`)
                    .build(hint, [])
        })
    }

    async onPlayerAction(act: PlayerAct, ignore: void, manager: GameManager): Promise<void> {
        let hasGiven = manager.roundStats.customData[this.id] as Set<string>
        let target = act.targets[0]
        let me = manager.context.getPlayer(this.playerId)
        hasGiven.add(target.player.id)

        this.playSound(manager, 1)
        manager.broadcast(new TextFlashEffect(this.playerId, [target.player.id], this.id))
        //assume he played it
        let cards = act.getCardsAtPos(CardPos.HAND)
        if(cards.length === 0) {
            throw `[仁德] 牌呢?? ${act.source.player.id} ${cards}`
        }
        await manager.transferCards(this.playerId, target.player.id, CardPos.HAND, CardPos.HAND, cards)
        if(this.givenAmount < 2 && this.givenAmount + cards.length >= 2) {
            //给出了仁德牌
            console.log('[仁德] 给出了第二张牌, 询问使用何种基本牌')
            //注意, 只有没喝过酒才能喝酒!
            let roundStat = manager.roundStats
            let slashButtons: Button[] = [new Button(CardType.SLASH.id, '普通杀'), new Button(CardType.SLASH_FIRE.id, '火杀'), 
                                            new Button(CardType.SLASH_THUNDER.id, '雷杀')]
            let wineButton = new Button(CardType.WINE.id, '酒')
            let peachButton = new Button(CardType.PEACH.id, '桃')
            if(roundStat.customData[WINE_TAKEN]) {
                wineButton.disable()
            }
            if(roundStat.slashMax > roundStat.slashCount) {
                slashButtons.forEach(b => b.disable())
            }
            if(me.hp >= me.maxHp) {
                peachButton.disable()
            }
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.MULTI_CHOICE,
                hintMsg: '请选择仁德要使用的基本牌',
                extraButtons: [...slashButtons, peachButton, wineButton, Button.CANCEL]
            })
            if(resp.isCancel()) {
                console.log('[仁德] 放弃使用基本牌')
            } else {
                let choice = resp.button
                let targets = resp.targets
                switch(choice) {
                    case CardType.WINE.id: await new WineOp(resp.source).perform(manager); break
                    case CardType.PEACH.id: await new PeachOp(resp.source).perform(manager); break
                    case CardType.SLASH.id:
                        await new SlashOP(me, targets, [], 1, DamageType.NORMAL, 'none').perform(manager)
                        break
                    case CardType.SLASH_FIRE.id:
                        await new SlashOP(me, targets, [], 1, DamageType.FIRE, 'none').perform(manager)
                        break
                    case CardType.SLASH_THUNDER.id:
                        await new SlashOP(me, targets, [], 1, DamageType.THUNDER, 'none').perform(manager)
                        break
                    default:
                        throw '[仁德] Unknown Choice' + choice
                }
            }
        }
        this.givenAmount += cards.length
    }

    public hookup(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async(stageStart: StageEndFlow)=>{
            if(stageStart.info.player.id === this.playerId && stageStart.stage === Stage.ROUND_BEGIN) {
                this.givenAmount = 0
                manager.roundStats.customData[this.id] = new Set<string>()
            }
        })
    }
}


export class WuSheng extends Skill {

    id = '武圣'
    displayName = '武圣'
    description = '你可以将一张红色牌当【杀】使用或打出。'

    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('武圣出杀')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, (id, context)=>{
                            let roundStat = context.serverHint.hint.roundStat
                            return isSuitRed(context.interpret(id).suit) && roundStat.slashMax > roundStat.slashCount
                        }, ()=>'选择一张红色的手牌/装备牌')
                        .expectChoose([UIPosition.PLAYER], 1, hint.roundStat.slashNumber, slashTargetFilter, ()=>`选择‘杀’的对象，可选${hint.roundStat.slashNumber}个`)
                        .expectAnyButton('点击确定出杀')
                        .build(hint)
        })
        playerActionDriverProvider.registerProvider(HintType.SLASH, (hint)=>{
            return new PlayerActionDriverDefiner('武圣出杀')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, 
                            (id, context)=>isSuitRed(context.interpret(id).suit), ()=>'选择一张红色的手牌/装备牌当做杀打出')
                        .expectAnyButton('点击确定使用杀')
                        .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
        })
        playerActionDriverProvider.registerProvider(HintType.PLAY_SLASH, (hint)=>{
            return new PlayerActionDriverDefiner('武圣出杀')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, 
                            (id, context)=>isSuitRed(context.interpret(id).suit), ()=>'选择一张红色的手牌/装备牌当做杀打出')
                        .expectAnyButton('点击确定使用杀')
                        .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        if(event && !(event instanceof AskForSlashOp)) {
            throw '[武圣] 不会对此做出反应: ' + event
        }
        this.playSound(manager, 1)
        let posAndCard = act.getSingleCardAndPos()
        let card = posAndCard[0]
        card.description = this.id
        let pos = posAndCard[1]
        if(!event) {
            //玩家直接出杀了
            card.as = CardType.SLASH
            let targetPs = act.targets
            manager.sendToWorkflow(act.source.player.id, pos, [card], true)
            await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, pos]], CardType.SLASH, true))
            await new PlaySlashOp(act.source, targetPs, [card]).perform(manager)

        } else if(event instanceof AskForSlashOp) {
            //被迫出的杀
            card.as = CardType.SLASH
            await manager.events.publish(new CardBeingPlayedEvent(act.source.player.id, [[card, pos]], CardType.SLASH, true))
            manager.sendToWorkflow(act.source.player.id, pos, [card])
        }
    }
}


export class PaoXiao extends SimpleConditionalSkill<SlashOP> {

    id = '咆哮'
    displayName = '咆哮'
    description = '锁定技，你使用【杀】无次数限制。当你于当前回合使用第二张【杀】时，你摸一张牌。'
    isLocked = true
    slashNumber = 0

    public hookup(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashOP>(SlashOP, this)
        skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async (stage: StageStartFlow)=>{
            if(!this.isDisabled && stage.stage === Stage.ROUND_BEGIN) {
                console.log('[咆哮] 增加 900 出杀次数')
                manager.roundStats.slashMax += 900
                this.slashNumber = 0
            }
        })
    }
    public conditionFulfilled(event: SlashOP, manager: GameManager): boolean {
        return event.source.player.id === this.playerId
    }
    public async doInvoke(event: SlashOP, manager: GameManager): Promise<void> {
        this.slashNumber++
        this.playSound(manager, 2)
        if(this.slashNumber === 2) {
            console.log('[咆哮] 玩家出了第二次杀, 摸牌')
            await new TakeCardOp(manager.context.getPlayer(this.playerId), 1).perform(manager)
        }
    }
}

export class LongDan extends SimpleConditionalSkill<SlashDodgedEvent> {

    id = '龙胆'
    displayName = '龙胆'
    description = '你可以将【杀】当【闪】、【闪】当【杀】使用或打出。当你通过发动【龙胆】使用的【杀】被一名角色使用的【闪】抵消时，你可以对另一名角色造成1点伤害。'+
                    '当一名角色使用的【杀】被你通过发动【龙胆】使用的【闪】抵消时，你可以令另一名其他角色回复1点体力。'

    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('龙胆出杀')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.DODGE, 
                                        ()=>'选择一张闪当杀打出')
                        .expectChoose([UIPosition.PLAYER], 1, hint.roundStat.slashNumber, slashTargetFilter, ()=>`选择‘杀’的对象，可选${hint.roundStat.slashNumber}个`)
                        .expectAnyButton('点击确定出杀')
                        .build(hint)
        })
        playerActionDriverProvider.registerProvider(HintType.SLASH, (hint)=>{
            return new PlayerActionDriverDefiner('龙胆出杀')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.DODGE, 
                                        ()=>'选择一张闪当杀打出')
                        .expectAnyButton('点击确定使用杀')
                        .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
        })
        playerActionDriverProvider.registerProvider(HintType.PLAY_SLASH, (hint)=>{
            return new PlayerActionDriverDefiner('龙胆出杀')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.DODGE, 
                                        ()=>'选择一张闪当杀打出')
                        .expectAnyButton('点击确定使用杀')
                        .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
        })
        playerActionDriverProvider.registerProvider(HintType.DODGE, (hint)=>{
            return new PlayerActionDriverDefiner('龙胆出闪')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type.isSlash(), 
                                        ()=>'选择一张杀当闪打出')
                        .expectAnyButton('点击确定使用闪')
                        .build(hint, [Button.OK]) //refusal is provided by serverHint.extraButtons
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        this.playSound(manager, 1)
        let posAndCard = act.getSingleCardAndPos()
        let card = posAndCard[0]
        let pos = posAndCard[1]
        if(!event) {
            //玩家直接出杀了
            card.as = CardType.SLASH
            card.description = this.id
            let targetPs = act.targets
            manager.sendToWorkflow(act.source.player.id, pos, [card], true)
            await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, pos]], CardType.SLASH, true))
            await new PlaySlashOp(act.source, targetPs, [card]).perform(manager)
        } else if(event instanceof AskForSlashOp) {
            //被迫出的杀
            card.as = CardType.SLASH
            card.description = this.id
            await manager.events.publish(new CardBeingPlayedEvent(act.source.player.id, [[card, pos]], CardType.SLASH, true))
            manager.sendToWorkflow(act.source.player.id, pos, [card])
        } else if(event instanceof DodgeOp) {
            //玩家出闪
            card.as = CardType.DODGE
            card.description = this.id
            await manager.events.publish(new CardBeingPlayedEvent(act.source.player.id, [[card, pos]], CardType.DODGE, true))
            manager.sendToWorkflow(act.source.player.id, pos, [card])
        }
    }

    public hookup(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashDodgedEvent>(SlashDodgedEvent, this)
    }
    public conditionFulfilled(event: SlashDodgedEvent, manager: GameManager): boolean {
        return this.isLongDanSlash(event) || this.isLongDanDodge(event)
    }
    public async doInvoke(event: SlashDodgedEvent, manager: GameManager): Promise<void> {
        //如果是我用龙胆发动的杀被闪了
        if(this.isLongDanSlash(event)) {
            console.log('[龙胆] 发动的杀被抵消, 可令一人掉血')
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.CHOOSE_PLAYER,
                hintMsg: '[龙胆] 请选择一名玩家受到你的伤害',
                minQuantity: 1, quantity: 1,
                forbidden: [event.slashOp.target.player.id],
                extraButtons: [Button.CANCEL]
            })
            if(!resp.isCancel()) {
                let target = resp.targets[0]
                console.log('[龙胆] 造成伤害', target.player.id)
                await new DamageOp(event.slashOp.source, target, 1, [], DamageSource.SKILL).perform(manager)
            }
        }
        if(this.isLongDanDodge(event)) {
            console.log('[龙胆] 发动的闪被抵消了杀, 可令一人回血')
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.CHOOSE_PLAYER,
                hintMsg: '[龙胆] 请选择一名玩家回复一点体力',
                minQuantity: 1, quantity: 1,
                forbidden: [event.slashOp.source.player.id, this.playerId],
                extraButtons: [Button.CANCEL]
            })
            if(!resp.isCancel()) {
                let target = resp.targets[0]
                if(target.hp >= target.maxHp) {
                    console.log('[龙胆] 无法回复体力,已是满体力', target.player.id)
                    return
                }
                console.log('[龙胆] 回复体力', target.player.id)
                await new HealOp(event.slashOp.target, target, 1).perform(manager)
            }
        }
    }
    private isLongDanSlash(event: SlashDodgedEvent) {
        let {source, cards} = event.slashOp
        return source.player.id === this.playerId && cards && cards.length === 1 && cards[0].description === this.id
    }
    private isLongDanDodge(event: SlashDodgedEvent) {
        let {target, dodgeResp} = event.dodgeOp
        let cards = dodgeResp.getCardsAtPos(CardPos.HAND)
        return target.player.id === this.playerId && cards && cards.length === 1 && cards[0].description === this.id
    }

}
// 观星 准备阶段，你可以观看牌堆顶的X张牌（X为存活角色数且最多为5），然后以任意顺序放回牌堆顶或牌堆底。
// 空城 锁定技，当你成为【杀】或【决斗】的目标时，若你没有手牌，你取消此目标。你回合外其他角色交给你的牌正面朝上放置于你的武将牌上，摸牌阶段开始时，你获得武将牌上的这些牌。

// 龙胆 
// 马术 出牌阶段，你可以明置此武将牌；你计算与其他角色的距离-1。
// 铁骑 当你使用【杀】指定一个目标后，你可以进行判定。然后你选择其一张明置的武将牌，令此武将牌上的所有非锁定技于此回合内失效。最后除非该角色弃置与结果花色相同的一张牌，否则不能使用【闪】。

// 集智 当你使用一张非转化的普通锦囊牌时，你可以摸一张牌。
// 奇才 出牌阶段，你可以明置此武将牌；你使用锦囊牌无距离限制。

// 烈弓 当你于出牌阶段内使用【杀】指定一个目标后，若该角色的手牌数不小于你的体力值或不大于你的攻击范围，则你可以令其不能使用【闪】响应此【杀】。
// 狂骨 锁定技，当你对距离1以内的一名角色造成1点伤害后，你回复1点体力。

// 连环 你可以将一张梅花手牌当【铁索连环】使用或重铸。
// 涅槃 限定技，当你处于濒死状态时，你可以弃置所有牌，然后复原你的武将牌，摸三张牌，将体力回复至3点。

// 八阵 锁定技，若你的装备区里没有防具牌，你视为装备着【八卦阵】；出牌阶段，你可以明置此武将牌。
// 火计 你可以将一张红色手牌当【火攻】使用。
// 看破 你可以将一张黑色手牌当【无懈可击】使用。

// 享乐 锁定技，当你成为一名角色使用【杀】的目标后，除非该角色弃置一张基本牌，否则此【杀】对你无效。
// 放权 你可以跳过出牌阶段，然后此回合结束时，你可以弃置一张手牌并令一名其他角色获得一个额外的回合。

// 祸首 锁定技，【南蛮入侵】对你无效；当其他角色使用【南蛮入侵】指定目标后，你代替其成为此牌造成的伤害的来源。
// 再起 摸牌阶段，你可以改为亮出牌堆顶的X张牌（X为你已损失的体力值），然后回复等同于其中红桃牌数量的体力，并获得其余的牌。

// 巨象 锁定技，【南蛮入侵】对你无效；当其他角色使用的【南蛮入侵】结算结束后，你获得之。
// 烈刃 当你使用【杀】对目标角色造成伤害后，你可以与其拼点，若你赢，你获得其一张牌。

// 淑慎 当你回复1点体力后，你可以令一名其他角色摸一张牌。
// 神智 准备阶段，你可以弃置所有手牌，若你以此法弃置的手牌数不小于你的体力值，你回复1点体力。

