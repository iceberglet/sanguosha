import { SimpleConditionalSkill, EventRegistryForSkills, Skill, GeneralSkillStatusUpdate, HiddenType, SkillStatus } from "./Skill"
import GameManager from "../../server/GameManager"
import DamageOp, { DamageSource, DamageTimeline } from "../../server/engine/DamageOp"
import { StageStartFlow, StageEndFlow } from "../../server/engine/StageFlows"
import { Stage } from "../../common/Stage"
import { UIPosition, Button } from "../../common/PlayerAction"
import PlayerActionDriverDefiner from "../../client/player-actions/PlayerActionDriverDefiner"
import { HintType } from "../../common/ServerHint"
import { playerActionDriverProvider } from "../../client/player-actions/PlayerActionDriverProvider"
import { TextFlashEffect, PlaySound } from "../../common/transit/EffectTransit"
import { CardPos } from "../../common/transit/CardPos"
import { WINE_TAKEN } from "../../common/RoundStat"
import { CardType } from "../../common/cards/Card"
import { slashTargetFilter } from "../../client/player-actions/PlayerActionDrivers"
import WineOp from "../../server/engine/WineOp"
import PeachOp from "../../server/engine/PeachOp"
import PlaySlashOp, { SlashOP, AskForSlashOp, SlashDodgedEvent, SlashCompute, PlaySlashOpNoCards, SlashType } from "../../server/engine/SlashOp"
import { isSuitRed, isSuitBlack } from "../../common/cards/ICard"
import { CardBeingUsedEvent, CardBeingDroppedEvent } from "../../server/engine/Generic"
import TakeCardOp from "../../server/engine/TakeCardOp"
import PlayerAct from "../../server/context/PlayerAct"
import DodgeOp from "../../server/engine/DodgeOp"
import HealOp from "../../server/engine/HealOp"
import { Timeline } from "../../server/Operation"
import JudgeOp from "../../server/engine/JudgeOp"
import FactionPlayerInfo from "../FactionPlayerInfo"
import { Suits } from "../../common/util/Util"
import { PlayerInfo } from "../../common/PlayerInfo"
import { BlockedEquipment, BaGua } from "../../server/engine/Equipments"
import { HuoGong } from "../../server/engine/SingleRuseOp"
import { WuXieContext } from "../../server/engine/WuXieOp"
import { askAbandonBasicCard } from "./FactionWarUtil";

const REN_DE_SLASH = [SlashType.RED, SlashType.BLACK, SlashType.FIRE, SlashType.THUNDER]

export class Rende extends Skill {

    id = '仁德'
    displayName = '仁德'
    description = '出牌阶段每名角色限一次，你可以将任意张手牌交给一名其他角色。当你给出第二张"仁德"牌时，你可以视为使用一张基本牌。'
    givenAmount = 0
    hiddenType = HiddenType.NONE
    
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
            return new PlayerActionDriverDefiner('仁德使用桃酒')
                    .expectChoose([UIPosition.BUTTONS], 1, 1, (id, context)=>id === CardType.WINE.id || id === CardType.PEACH.id)
                    .build(hint, [])
        })
        playerActionDriverProvider.registerSpecial(this.id, (hint)=>{
            let {slashMax, slashCount, slashNumber} = hint.roundStat
            return new PlayerActionDriverDefiner('仁德使用杀')                    
                    .expectChoose([UIPosition.PLAYER], 1, slashNumber, (id, context)=>{
                        return slashTargetFilter(id, context) && slashMax > slashCount
                    }, ()=>`选择‘杀’的对象，可选${slashNumber}个`)
                    .expectChoose([UIPosition.BUTTONS], 1, 1, (id, context)=>{
                        return !!REN_DE_SLASH.find(i => i.text === id)
                    }, ()=>'选择出何种杀牌')
                    .build(hint, [])
        })
    }

    async onPlayerAction(act: PlayerAct, ignore: void, manager: GameManager): Promise<void> {
        let hasGiven = manager.roundStats.customData[this.id] as Set<string>
        let target = act.targets[0]
        let me = manager.context.getPlayer(this.playerId)
        hasGiven.add(target.player.id)

        this.playSound(manager, 3)
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
            let slashButtons: Button[] = REN_DE_SLASH.map(s => new Button(s.text, s.text))
            let wineButton = new Button(CardType.WINE.id, '酒')
            let peachButton = new Button(CardType.PEACH.id, '桃')
            if(roundStat.customData[WINE_TAKEN]) {
                wineButton.disable()
            }
            slashButtons.forEach(b => {
                b.enabled = roundStat.slashMax > roundStat.slashCount
                b.isDirect = false
            })
            if(me.hp >= me.maxHp) {
                peachButton.disable()
            }
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.SPECIAL,
                specialId: this.id,
                hintMsg: '[仁德]先选择杀的对象再选杀的类型, 或直接使用桃/酒',
                extraButtons: [...slashButtons, peachButton, wineButton, Button.CANCEL]
            })
            if(resp.isCancel()) {
                console.log('[仁德] 放弃使用基本牌')
            } else {
                let choice = resp.button
                let targets = resp.targets
                console.log('[仁德] 选择使用', choice)
                switch(choice) {
                    case CardType.WINE.id: await new WineOp(resp.source).perform(manager); 
                        manager.playSound(me.getGender(), CardType.WINE.id)
                        break
                    case CardType.PEACH.id: await new PeachOp(resp.source).perform(manager); 
                        manager.playSound(me.getGender(), CardType.PEACH.id)
                        break
                    case SlashType.RED.text:
                        await PlaySlashOpNoCards(manager, me, targets, SlashType.RED);
                        break
                    case SlashType.BLACK.text:
                        await PlaySlashOpNoCards(manager, me, targets, SlashType.BLACK);
                        break
                    case SlashType.THUNDER.text:
                        await PlaySlashOpNoCards(manager, me, targets, SlashType.THUNDER);
                        break
                    case SlashType.FIRE.text:
                        await PlaySlashOpNoCards(manager, me, targets, SlashType.FIRE);
                        break
                    default:
                        throw '[仁德] Unknown Choice' + choice
                }
            }
        }
        this.givenAmount += cards.length
    }

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
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
    hiddenType = HiddenType.NONE

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
        this.playSound(manager, 2)
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
            await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, pos]], CardType.SLASH, true, false))
            manager.sendToWorkflow(act.source.player.id, pos, [card])
        }
    }
}


export class PaoXiao extends SimpleConditionalSkill<SlashOP> {

    id = '咆哮'
    displayName = '咆哮'
    description = '锁定技，你使用【杀】无次数限制。当你于当前回合使用第二张【杀】时，你摸一张牌。'
    hiddenType = HiddenType.REVEAL_IN_MY_USE_CARD
    isLocked = true
    slashNumber = 0

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashOP>(SlashOP, this)
        skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async (stage: StageStartFlow)=>{
            if(!this.isDisabled && this.isRevealed && stage.stage === Stage.ROUND_BEGIN) {
                console.log('[咆哮] 增加 900 出杀次数')
                manager.roundStats.slashMax += 900
                //回合开始的时候重置我们出杀的次数
                this.slashNumber = 0
            }
        })
    }
    public conditionFulfilled(event: SlashOP, manager: GameManager): boolean {
        if(event.source.player.id === this.playerId) {
            //出杀就咆哮
            this.playSound(manager, 2)
            this.slashNumber++
            return this.slashNumber === 2
        }
        return false
    }
    public async onStatusUpdated(manager: GameManager) {
        if(!this.isDisabled && this.isRevealed) {
            console.log('[咆哮] 增加 900 出杀次数')
            manager.roundStats.slashMax += 900
            //重置才能让效果发生
            manager.reissue()
        }
    }
    public invokeMsg() {
        return '(咆哮)摸牌'
    }
    public async doInvoke(event: SlashOP, manager: GameManager): Promise<void> {
        console.log('[咆哮] 玩家出了第二次杀, 摸牌')
        await new TakeCardOp(manager.context.getPlayer(this.playerId), 1).perform(manager)
    }
}

export class LongDan extends SimpleConditionalSkill<SlashDodgedEvent> {

    id = '龙胆'
    displayName = '龙胆'
    description = '你可以将【杀】当【闪】、【闪】当【杀】使用或打出。当你通过发动【龙胆】使用的【杀】被一名角色使用的【闪】抵消时，你可以对另一名角色造成1点伤害。'+
                    '当一名角色使用的【杀】被你通过发动【龙胆】使用的【闪】抵消时，你可以令另一名其他角色回复1点体力。'
    hiddenType = HiddenType.NONE

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
        this.playSound(manager, 2)
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
            await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, pos]], CardType.SLASH, true, false))
            manager.sendToWorkflow(act.source.player.id, pos, [card])
        } else if(event instanceof DodgeOp) {
            //玩家出闪
            card.as = CardType.DODGE
            card.description = this.id
            await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, pos]], CardType.DODGE, true, false))
            manager.sendToWorkflow(act.source.player.id, pos, [card])
        }
    }

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
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

export class TieQi extends SimpleConditionalSkill<SlashCompute> {
    
    id = '铁骑'
    displayName = '铁骑'
    description = '当你使用【杀】指定一个目标后，你可以进行判定。然后你选择其一张明置的武将牌，令此武将牌上的所有非锁定技于此回合内失效。最后除非该角色弃置与结果花色相同的一张牌，否则不能使用【闪】。'
    cache = new Set<GeneralSkillStatusUpdate>()

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashCompute>(SlashCompute, this)
        skillRegistry.onEvent<StageEndFlow>(StageEndFlow, this.playerId, async (flow: StageEndFlow)=>{
            if(flow.info.player.id === this.playerId && flow.stage === Stage.ROUND_END) {
                console.log('[铁骑] 恢复玩家技能', this.cache.size)
                for(let u of this.cache) {
                    u.enable = true
                    await manager.events.publish(u)
                }
                this.cache.clear()
            }
        })
    }
    public conditionFulfilled(event: SlashCompute, manager: GameManager): boolean {
        return event.source.player.id === this.playerId && event.timeline === Timeline.AFTER_CONFIRMING_TARGET
    }
    public async doInvoke(event: SlashCompute, manager: GameManager): Promise<void> {
        this.playSound(manager, 2)
        let judgeCard = await new JudgeOp('铁骑判定', this.playerId).perform(manager)
        console.log('[铁骑] 判定牌为', judgeCard.id)
        let target = event.target as FactionPlayerInfo
        if(target.isRevealed()) {
            console.log('[铁骑] 选择将要失效的武将牌')
            let choice: Button[] = []
            if(target.isGeneralRevealed) {
                choice.push(new Button(target.general.id, '封禁主将技能: ' + target.general.name))
            }
            if(target.isSubGeneralRevealed) {
                choice.push(new Button(target.subGeneral.id, '封禁副将技能: ' + target.subGeneral.name))
            }
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.MULTI_CHOICE,
                hintMsg: '请选择对 '+target+' 使用[铁骑]要封禁的武将牌',
                extraButtons: choice
            })
            //封禁技能??
            console.log('[铁骑] 封禁', target.player.id, resp.button)
            let u = new GeneralSkillStatusUpdate(this.id, target, target.general.id === resp.button, false)
            this.cache.add(u)
            await manager.events.publish(u)
        }
        let suit = manager.interpret(this.playerId, judgeCard.id).suit
        let ask = await manager.sendHint(target.player.id, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg: `请弃置一张花色为[${Suits[suit]}]的手牌, 否则不能出闪`,
            quantity: 1,
            positions: [UIPosition.MY_HAND, UIPosition.MY_EQUIP],
            extraButtons: [Button.CANCEL],
            suits: [suit]
        })
        if(ask.isCancel()) {
            console.log('[铁骑] 对方没有弃置同花色牌, 无法出闪')
            event.undodgeable = true
        } else {
            console.log('[铁骑] 对方弃置了牌以获得出闪的权利')
            let cardAndPos = ask.getSingleCardAndPos()
            manager.sendToWorkflow(target.player.id, cardAndPos[1], [cardAndPos[0]])
            await manager.events.publish(new CardBeingDroppedEvent(target.player.id, [cardAndPos]))
        }
    }
}

export class MaShu extends Skill {
    id = '马术'
    displayName = '马术'
    description = '出牌阶段，你可以明置此武将牌；你计算与其他角色的距离-1。'
    isApplied = false
    isLocked = true
    hiddenType = HiddenType.REVEAL_IN_MY_USE_CARD

    async onStatusUpdated(manager: GameManager) {
        if(!this.isApplied && !this.isDisabled && this.isRevealed) {
            console.log('[马术] 生效, 计算与他人距离时减1', this.playerId)
            manager.context.getPlayer(this.playerId).distanceModTargetingOthers -= 1
            manager.broadcast(manager.context.getPlayer(this.playerId), PlayerInfo.sanitize)
            this.isApplied = true
        }
        if(this.isApplied && this.isDisabled) {
            console.log('[马术] 失效, 计算与他人距离时不再减1', this.playerId)
            manager.context.getPlayer(this.playerId).distanceModTargetingOthers += 1
            manager.broadcast(manager.context.getPlayer(this.playerId), PlayerInfo.sanitize)
            this.isApplied = false
        }
    }
}

export class BaZhen extends SimpleConditionalSkill<DodgeOp> {
    id = '八阵'
    displayName = '八阵'
    description = '锁定技，若你的装备区里没有防具牌，你视为装备着【八卦阵】'//'出牌阶段，你可以明置此武将牌。'
    myBaGua: BaGua
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<DodgeOp>(DodgeOp, this)
        this.myBaGua = new BaGua(this.playerId, CardType.BA_GUA, manager)
    }

    public conditionFulfilled(event: DodgeOp, manager: GameManager): boolean {
        //我要出闪但没有防具
        return event.target.player.id === this.playerId && 
            !manager.context.getPlayer(this.playerId).getCards(CardPos.EQUIP).find(c => c.type.genre === 'shield') &&
            !BlockedEquipment.isBlocked(this.playerId)
    }

    public async doInvoke(event: DodgeOp, manager: GameManager): Promise<void> {
        this.playSound(manager, 2)
        await this.myBaGua.doEffect(event)
    }
}

export class HuoJi extends Skill {
    id = '火计'
    displayName = '火计'
    description = '你可以将一张红色手牌当【火攻】使用。'
    hiddenType = HiddenType.NONE
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('火计')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>isSuitRed(context.interpret(id).suit), ()=>'选择一张红色手牌')
                        .expectChoose([UIPosition.PLAYER], 1, 1, 
                            (id, context)=>context.getPlayer(id).getCards(CardPos.HAND).length > 0,   //必须对有手牌的人出
                            ()=>`选择‘火攻’的对象`)
                        .expectAnyButton('点击确定发动火攻')
                        .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        let cardAndPos = act.getSingleCardAndPos()
        this.playSound(manager, 2)
        cardAndPos[0].as = CardType.HUO_GONG
        
        manager.sendToWorkflow(act.source.player.id, CardPos.HAND, [cardAndPos[0]], true)
        await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [cardAndPos], cardAndPos[0].type, true))
        await new HuoGong(act.source, act.targets[0], [cardAndPos[0]]).perform(manager)
    }
}

export class KanPo extends Skill {
    id = '看破'
    displayName = '看破'
    description = '你可以将一张黑色手牌当【无懈可击】使用。'//'出牌阶段，你可以明置此武将牌。'
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.WU_XIE, (hint)=>{
            return new PlayerActionDriverDefiner('看破')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>isSuitBlack(context.interpret(id).suit), ()=>'选择一张黑色手牌')
                        .expectAnyButton('点击确定使用无懈可击')
                        .build(hint, [Button.OK])
        })
    }

    public respondToSkill = async (resp: PlayerAct, manager: GameManager) => {
        let card = resp.getSingleCardAndPos()[0]
        console.log(`[无懈的结算] (看破) 打出了${card.id}作为无懈`)
        card.description = `${resp.source.player.id} 看破`
        card.as = CardType.WU_XIE
        manager.sendToWorkflow(resp.source.player.id, CardPos.HAND, [card])
        this.playSound(manager, 2)
        await manager.events.publish(new CardBeingUsedEvent(resp.source.player.id, [[card, CardPos.HAND]], card.type, true))
    }

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.onEvent<WuXieContext>(WuXieContext, this.playerId, async (context: WuXieContext) => {
            if(this.isDisabled || (!this.isRevealed && !this.isForewarned)) {
                return
            }
            console.log('[看破] 预发动')
            //手上有黑牌
            if(manager.context.getPlayer(this.playerId)
                            .getCards(CardPos.HAND)
                            .filter(c => isSuitBlack(manager.interpret(this.playerId, c.id).suit))
                            .length > 0) {
                console.log('[看破] 添加技能处理')
                context.candidates.push(this.playerId)
                context.processors.set(this.playerId, this.respondToSkill)
            }
        })
    }

    public async onWuXieOp(context: WuXieContext) {
        if(this.isDisabled || (!this.isRevealed && !this.isForewarned)) {
            return
        }
        console.log('[看破] 添加技能处理')
        context.candidates.push(this.playerId)
        context.processors.set(this.playerId, this.respondToSkill)
    }
}

export class KuangGu extends SimpleConditionalSkill<DamageOp> {
    id = '狂骨'
    displayName = '狂骨'
    description = '锁定技，当你对距离1以内的一名角色造成1点伤害后，你回复1点体力。'

    isLocked = true
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
    }
    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        return event.source && event.source.player.id === this.playerId && event.timeline === DamageTimeline.DID_DAMAGE && 
                manager.context.computeDistance(this.playerId, event.target.player.id) <= 1
    }
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        let me = event.source
        this.playSound(manager, 2)
        console.log('[狂骨] 发动, 回血', event.amount)
        await new HealOp(me, me, event.amount).perform(manager)
    }
}

export class LieGong extends SimpleConditionalSkill<SlashCompute> {
    id = '烈弓'
    displayName = '烈弓'
    description = '当你于出牌阶段内使用【杀】指定一个目标后，若该角色的手牌数不小于你的体力值或不大于你的攻击范围，则你可以令其不能使用【闪】响应此【杀】。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashCompute>(SlashCompute, this)
    }
    public conditionFulfilled(event: SlashCompute, manager: GameManager): boolean {
        return event.source.player.id === this.playerId && event.timeline === Timeline.AFTER_CONFIRMING_TARGET &&
            (event.target.getCards(CardPos.HAND).length >= event.source.hp || event.target.getCards(CardPos.HAND).length <= event.source.getReach())
    }
    public async doInvoke(event: SlashCompute, manager: GameManager): Promise<void> {
        console.log('[烈弓] 发动, 不能闪')
        this.playSound(manager, 2)
        event.undodgeable = true
    }
}

export class JiLi extends SimpleConditionalSkill<CardBeingUsedEvent> {
    id = '蒺藜'
    displayName = '蒺藜'
    description = '当你于一回合内使用或打出第X张牌时，你可以摸X张牌（X为你的攻击范围）'
    playedInThisRound = 0

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<CardBeingUsedEvent>(CardBeingUsedEvent, this)
        skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async (s) => {
            if(s.stage === Stage.ROUND_BEGIN) {
                console.log('[蒺藜] 使用牌数清零')
                this.playedInThisRound = 0
            }
        })
    }
    public conditionFulfilled(event: CardBeingUsedEvent, manager: GameManager): boolean {
        if(event.player === this.playerId) {
            this.playedInThisRound++
            console.log('[蒺藜] 使用牌数为', this.playedInThisRound)
            if(this.playedInThisRound === manager.context.getPlayer(this.playerId).getReach()) {
                return true
            }
        }
        return false 
    }
    public async doInvoke(event: CardBeingUsedEvent, manager: GameManager): Promise<void> {
        this.playSound(manager, 2)
        let me = manager.context.getPlayer(this.playerId)
        console.log('[蒺藜] 发动蒺藜拿牌', me.getReach())
        await new TakeCardOp(me, me.getReach()).perform(manager)
    }
}

export class XiangLe extends SimpleConditionalSkill<SlashCompute> {
    id = '享乐'
    displayName = '享乐'
    description = '锁定技，当你成为一名角色使用【杀】的目标后，除非该角色弃置一张基本牌，否则此【杀】对你无效。'
    isLocked = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashCompute>(SlashCompute, this)
    }
    public conditionFulfilled(event: SlashCompute, manager: GameManager): boolean {
        return event.target.player.id === this.playerId && event.timeline === Timeline.AFTER_BECOMING_TARGET
    }
    public async doInvoke(event: SlashCompute, manager: GameManager): Promise<void> {
        console.log('[享乐] 发动')
        this.playSound(manager, 2)
        manager.broadcast(new TextFlashEffect(this.playerId, [event.source.player.id], this.id))
        let abandonned = await askAbandonBasicCard(manager, event.source, '请弃置一张基本牌否则你的杀无效', true)
        if(abandonned) {
            console.log('[享乐] 弃置了基本牌, 杀继续生效')
        } else {
            console.log('[享乐] 使杀无效化')
            event.abort = true
        }
    }
}

export class FangQuan extends SimpleConditionalSkill<StageStartFlow> {
    id = '放权'
    displayName = '放权'
    description = '你可以跳过出牌阶段，然后此回合结束时，你可以弃置一张手牌并令一名其他角色获得一个额外的回合。'
    invoked: boolean = false

    bootstrapClient() {
        playerActionDriverProvider.registerSpecial(this.id, (hint)=>{
            return new PlayerActionDriverDefiner('放权')
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>true,()=>'请弃置一张手牌')
                        .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>id !== context.myself.player.id, ()=>'请选择一名其他玩家放权')
                        .expectAnyButton('点击确定对其发动放权')
                        .build(hint)
        })
    }
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
        skillRegistry.onEvent<StageEndFlow>(StageEndFlow, this.playerId, async (event) => {
            if(event.isFor(this.playerId, Stage.ROUND_END) && this.invoked) {
                this.invoked = false
                console.log('[放权] 多出一回合')
                let resp = await manager.sendHint(this.playerId, {
                    hintType: HintType.SPECIAL,
                    specialId: this.id,
                    hintMsg: '放权'
                })
                if(!resp.isCancel()) {
                    let target = resp.targets[0]
                    console.log('[放权] 给了', target.player.id)
                    await resp.dropCardsFromSource(this.playerId + ' 放权')

                    manager.broadcast(new TextFlashEffect(this.playerId, [target.player.id], this.id))
                    this.playSound(manager, 2)
                    manager.cutQueue(target)
                }
            }
        })
    }
    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        return event.info.player.id === this.playerId && event.stage === Stage.USE_CARD
    }
    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        console.log('[放权] 发动, 跳过出牌阶段')
        this.invoked = true
        manager.roundStats.skipStages.set(Stage.USE_CARD, true)
    }
}

export class JiZhi extends SimpleConditionalSkill<CardBeingUsedEvent> {
    id = '集智'
    displayName = '集智'
    description = '当你使用一张非转化的普通锦囊牌时，你可以摸一张牌。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<CardBeingUsedEvent>(CardBeingUsedEvent, this)
    }
    public conditionFulfilled(event: CardBeingUsedEvent, manager: GameManager): boolean {
        return event.player === this.playerId && event.cards.length === 1 && 
                !event.cards[0][0].as && !event.isFromSkill && event.cards[0][0].type.isRuse()
    }
    public async doInvoke(event: CardBeingUsedEvent, manager: GameManager): Promise<void> {
        console.log('[集智] 发动, 摸一张牌')
        this.playSound(manager, 1)
        await new TakeCardOp(manager.context.getPlayer(this.playerId), 1).perform(manager)
    }
}

export class QiCai extends Skill {
    id = '奇才'
    displayName = '奇才'
    description = '出牌阶段，你可以明置此武将牌；你使用锦囊牌无距离限制。'
    isWorking = false
    hiddenType = HiddenType.REVEAL_IN_MY_USE_CARD

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async (event)=>{
            if(event.isFor(this.playerId, Stage.ROUND_BEGIN) && this.isWorking) {
                manager.roundStats.binLiangReach = 99
                manager.roundStats.shunshouReach = 99
            }
        })
    }

    public async onStatusUpdated(manager: GameManager): Promise<void> {
        if(!this.isDisabled && this.isRevealed) {
            this.isWorking = true
            if(manager.currPlayer().player.id === this.id) {
                manager.roundStats.binLiangReach = 99
                manager.roundStats.shunshouReach = 99
                manager.reissue()
            }
        }
        if(this.isDisabled) {
            this.isWorking = false
            if(manager.currPlayer().player.id === this.id) {
                manager.roundStats.binLiangReach = 1
                manager.roundStats.shunshouReach = 1
                manager.reissue()
            }
        }
    }
}

// 放权 你可以跳过出牌阶段，然后此回合结束时，你可以弃置一张手牌并令一名其他角色获得一个额外的回合。

// 观星 准备阶段，你可以观看牌堆顶的X张牌（X为存活角色数且最多为5），然后以任意顺序放回牌堆顶或牌堆底。
// 空城 锁定技，当你成为【杀】或【决斗】的目标时，若你没有手牌，你取消此目标。你回合外其他角色交给你的牌正面朝上放置于你的武将牌上，摸牌阶段开始时，你获得武将牌上的这些牌。


// 连环 你可以将一张梅花手牌当【铁索连环】使用或重铸。
// 涅槃 限定技，当你处于濒死状态时，你可以弃置所有牌，然后复原你的武将牌，摸三张牌，将体力回复至3点。


// 祸首 锁定技，【南蛮入侵】对你无效；当其他角色使用【南蛮入侵】指定目标后，你代替其成为此牌造成的伤害的来源。
// 再起 摸牌阶段，你可以改为亮出牌堆顶的X张牌（X为你已损失的体力值），然后回复等同于其中红桃牌数量的体力，并获得其余的牌。

// 巨象 锁定技，【南蛮入侵】对你无效；当其他角色使用的【南蛮入侵】结算结束后，你获得之。
// 烈刃 当你使用【杀】对目标角色造成伤害后，你可以与其拼点，若你赢，你获得其一张牌。

// 淑慎 当你回复1点体力后，你可以令一名其他角色摸一张牌。
// 神智 准备阶段，你可以弃置所有手牌，若你以此法弃置的手牌数不小于你的体力值，你回复1点体力。

// 生息 弃牌阶段开始时，若你此回合内没有造成过伤害，你可以摸两张牌。
// 守成 当与你势力相同的一名角色于其回合外失去最后手牌时，你可以令其摸一张牌。

// 挑衅 出牌阶段限一次，你可以选择一名攻击范围内含有你的角色，然后除非该角色对你使用一张【杀】，否则你弃置其一张牌。
// 遗志 副将技，此武将牌上单独的阴阳鱼个数-1。若你的主将拥有技能“观星”，则将其描述中的X改为5；若你的主将没有技能“观星”，则你拥有技能“观星”。
// 天覆 主将技，阵法技，若当前回合角色与你处于同一队列，你拥有技能“看破”。

// 潜袭 准备阶段，你可以进行判定，然后你选择距离为1的一名角色，直到回合结束，该角色不能使用或打出与结果颜色相同的手牌。
// 闺秀 当你明置此武将牌时，你可以摸两张牌；当你移除此武将牌时，你可以回复1点体力。
// 存嗣 出牌阶段，你可以移除此武将牌并选择一名角色，然后其获得技能“勇决”（若与你势力相同的一名角色于其回合内使用的第一张牌为【杀】，则该角色可以在此【杀】结算完成后获得之），若你没有获得“勇决”，则获得“勇决”的角色摸两张牌。
// 勇决 若与你势力相同的一名角色于其回合内使用的第一张牌为【杀】，则该角色可以在此【杀】结算完成后获得之
// 蒺藜 当你于一回合内使用或打出第X张牌时，你可以摸X张牌（X为你的攻击范围）

// 眩惑 与你势力相同的其他角色的出牌阶段限一次，该角色可以交给你一张手牌并弃置一张牌，然后其选择并获得以下技能之一直到回合结束：“武圣”、“咆哮”、“龙胆”、“铁骑”、“烈弓”、“狂骨”（场上已有的技能无法选择）。
// 恩怨 锁定技，当其他角色对你使用【桃】时，该角色摸一张牌；当你受到伤害后，伤害来源需交给你一张手牌，否则失去1点体力。