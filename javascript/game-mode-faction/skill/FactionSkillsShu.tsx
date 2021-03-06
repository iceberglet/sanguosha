import { SimpleConditionalSkill, EventRegistryForSkills, Skill, GeneralSkillStatusUpdate, HiddenType, SkillTrigger, SkillRepo, SkillPosition } from "../../common/Skill"
import GameManager from "../../server/GameManager"
import DamageOp, { DamageSource, DamageTimeline, DamageType } from "../../server/engine/DamageOp"
import { StageStartFlow, StageEndFlow } from "../../server/engine/StageFlows"
import { Stage } from "../../common/Stage"
import { UIPosition, Button } from "../../common/PlayerAction"
import PlayerActionDriverDefiner from "../../client/player-actions/PlayerActionDriverDefiner"
import { HintType, ServerHint } from "../../common/ServerHint"
import { playerActionDriverProvider } from "../../client/player-actions/PlayerActionDriverProvider"
import { TextFlashEffect, CardTransit } from "../../common/transit/EffectTransit"
import { CardMovementEvent, CardPos } from "../../common/transit/CardPos"
import { WINE_TAKEN } from "../../common/RoundStat"
import Card, { CardType } from "../../common/cards/Card"
import { slashTargetFilter, registerSlashPlayingHand, registerPlaySlash, registerSlash } from "../../client/player-actions/PlayerActionDrivers"
import WineOp from "../../server/engine/WineOp"
import PeachOp from "../../server/engine/PeachOp"
import PlaySlashOp, { SlashOP, AskForSlashOp, SlashDodgedEvent, PlaySlashOpNoCards, SlashType } from "../../server/engine/SlashOp"
import { isSuitRed, isSuitBlack } from "../../common/cards/ICard"
import { CardBeingUsedEvent, CardBeingDroppedEvent, CardAwayEvent, CardBeingTakenEvent } from "../../server/engine/Generic"
import TakeCardOp, { TakeCardStageOp } from "../../server/engine/TakeCardOp"
import PlayerAct from "../../server/context/PlayerAct"
import DodgeOp from "../../server/engine/DodgeOp"
import HealOp, { HealTimeline } from "../../server/engine/HealOp"
import { RuseOp, Timeline } from "../../server/Operation"
import JudgeOp from "../../server/engine/JudgeOp"
import FactionPlayerInfo from "../FactionPlayerInfo"
import { Suits, all, any } from "../../common/util/Util"
import { PlayerInfo } from "../../common/PlayerInfo"
import { BlockedEquipment, BaGua } from "../../server/engine/Equipments"
import { HuoGong, GrabCard, JueDou } from "../../server/engine/SingleRuseOp"
import { WuXieContext } from "../../server/engine/WuXieOp"
import { askAbandonBasicCard } from "../FactionWarUtil";
import { TieSuo, NanMan } from "../../server/engine/MultiRuseOp"
import AskSavingOp from "../../server/engine/AskSavingOp"
import CardFightOp, { canCardFight } from "../../server/engine/CardFightOp"
import { CustomUIData, GuanXingData } from "../../client/card-panel/CustomUIRegistry"
import { DropOthersCardRequest } from "../../server/engine/DropCardOp"
import { areInFormation } from "./FactionSkillsGeneric"
import GameContext from "../../common/GameContext"
import { RemoveGeneralEvent, RevealGeneralEvent } from "../FactionWarInitializer"

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
        manager.log(`${this.playerId} 发动了 ${this.displayName}`)
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
                        manager.log(`${this.playerId} ${this.displayName}视为使用酒`)
                        break
                    case CardType.PEACH.id: await new PeachOp(resp.source).perform(manager); 
                        manager.playSound(me.getGender(), CardType.PEACH.id)
                        manager.log(`${this.playerId} ${this.displayName}视为使用桃`)
                        break
                    case SlashType.RED.text:
                        await PlaySlashOpNoCards(manager, me, targets, SlashType.RED);
                        manager.log(`${this.playerId} ${this.displayName}视为对 ${targets} 使用红杀`)
                        break
                    case SlashType.BLACK.text:
                        await PlaySlashOpNoCards(manager, me, targets, SlashType.BLACK);
                        manager.log(`${this.playerId} ${this.displayName}视为对 ${targets} 使用黑杀`)
                        break
                    case SlashType.THUNDER.text:
                        await PlaySlashOpNoCards(manager, me, targets, SlashType.THUNDER);
                        manager.log(`${this.playerId} ${this.displayName}视为对 ${targets} 使用雷杀`)
                        break
                    case SlashType.FIRE.text:
                        await PlaySlashOpNoCards(manager, me, targets, SlashType.FIRE);
                        manager.log(`${this.playerId} ${this.displayName}视为对 ${targets} 使用火杀`)
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

    wusheng = (definer: PlayerActionDriverDefiner, hint: ServerHint): PlayerActionDriverDefiner => {
        return definer.expectChoose([UIPosition.MY_SKILL], 1, 1, (id)=>id === this.id) 
                        .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, 
                                        (id, context)=>isSuitRed(context.interpret(id).suit), ()=>'选择一张红色的手牌/装备牌当做杀打出')
    }

    bootstrapClient() {
        registerSlashPlayingHand(this.wusheng)
        registerPlaySlash(this.wusheng)
        registerSlash(this.wusheng)
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        if(event && !(event instanceof AskForSlashOp)) {
            throw '[武圣] 不会对此做出反应: ' + event
        }
        
        this.playSound(manager, 2)
        manager.log(`${this.playerId} 发动了 ${this.displayName}`)
        let posAndCard = act.getSingleCardAndPos()
        let card = posAndCard[0]
        card.description = this.id
        let pos = posAndCard[1]
        if(!event) {
            //玩家直接出杀了
            card.as = CardType.SLASH
            card.description = this.displayName
            let targetPs = act.targets
            manager.sendToWorkflow(act.source.player.id, pos, [card], true)
            await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, pos]], CardType.SLASH, true))
            await new PlaySlashOp(act.source, targetPs, [card]).perform(manager)

        } else if(event instanceof AskForSlashOp) {
            //被迫出的杀
            card.as = CardType.SLASH
            card.description = this.displayName
            manager.sendToWorkflow(act.source.player.id, pos, [card])
            await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, pos]], CardType.SLASH, true, false))
        }
    }
}


export class PaoXiao extends SimpleConditionalSkill<SlashOP> {

    id = '咆哮'
    displayName = '咆哮'
    description = '锁定技，你使用【杀】无次数限制。当你于当前回合使用第二张【杀】时，你摸一张牌。'
    hiddenType = HiddenType.REVEAL_IN_MY_USE_CARD
    needRepeatedCheck = false
    isLocked = true
    slashNumber = 0

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashOP>(SlashOP, this)
        skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async (stage: StageStartFlow)=>{
            if(!this.isInactive() && stage.stage === Stage.ROUND_BEGIN && this.playerId === stage.info.player.id) {
                console.log('[咆哮] 增加 900 出杀次数')
                manager.roundStats.slashMax += 900
                //回合开始的时候重置我们出杀的次数
                this.slashNumber = 0
            }
        })
    }
    public conditionFulfilled(event: SlashOP, manager: GameManager): boolean {
        if(event.source.player.id === this.playerId && event.timeline === Timeline.CHOOSING_TARGET) {
            if(manager.roundStats.slashCount > 1) {
                //出多次杀就咆哮
                this.playSound(manager, 2)
            }
            this.slashNumber++
            return this.slashNumber === 2
        }
        return false
    }
    public async onStatusUpdated(manager: GameManager) {
        if(!this.isInactive() && manager.currPlayer().player.id === this.playerId) {
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

    
    longdan = (definer: PlayerActionDriverDefiner, hint: ServerHint): PlayerActionDriverDefiner => {
        return definer.expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id, ()=>hint.hintMsg)
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).type === CardType.DODGE, 
                                    ()=>'选择一张闪当杀打出')
    }


    bootstrapClient() {
        registerSlashPlayingHand(this.longdan)
        registerPlaySlash(this.longdan)
        registerSlash(this.longdan)
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
        
        let posAndCard = act.getSingleCardAndPos()
        let card = posAndCard[0]
        let pos = posAndCard[1]
        if(!event) {
            //玩家直接出杀了
            card.as = CardType.SLASH
            card.description = this.id
            let targetPs = act.targets
            this.invokeEffects(manager, act.targets.map(t => t.player.id))
            manager.sendToWorkflow(act.source.player.id, pos, [card], true)
            await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, pos]], CardType.SLASH, true))
            await new PlaySlashOp(act.source, targetPs, [card]).perform(manager)
        } else if(event instanceof AskForSlashOp) {
            //被迫出的杀
            card.as = CardType.SLASH
            card.description = this.id
            this.invokeEffects(manager, act.targets.map(t => t.player.id))
            manager.sendToWorkflow(act.source.player.id, pos, [card])
            await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, pos]], CardType.SLASH, true, false))
        } else if(event instanceof DodgeOp) {
            //玩家出闪
            card.as = CardType.DODGE
            card.description = this.id
            this.invokeEffects(manager, act.targets.map(t => t.player.id))
            manager.sendToWorkflow(act.source.player.id, pos, [card])
            await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, pos]], CardType.DODGE, true, false))
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

    //我出的杀, 杀用的是龙胆
    private isLongDanSlash(event: SlashDodgedEvent) {
        if(event.slashOp.source.player.id !== this.playerId) {
            return false
        }
        let {source, cards} = event.slashOp
        return source.player.id === this.playerId && cards && cards.length === 1 && cards[0].description === this.id
    }
    
    //我出的闪, 闪用的是龙胆
    private isLongDanDodge(event: SlashDodgedEvent) {
        if(event.slashOp.target.player.id !== this.playerId) {
            return false
        }
        let {target, dodgeResp} = event.dodgeOp
        //如果八卦之类的发动了, 是不会有dodge resp的
        if(!dodgeResp) {
            return false
        }
        let cards = dodgeResp.getCardsAtPos(CardPos.HAND)
        return target.player.id === this.playerId && cards && cards.length === 1 && cards[0].description === this.id
    }

}

export class TieQi extends SimpleConditionalSkill<SlashOP> {
    
    id = '铁骑'
    displayName = '铁骑'
    description = '当你使用【杀】指定一个目标后，你可以进行判定。然后你选择其一张明置的武将牌，令此武将牌上的所有非锁定技于此回合内失效。最后除非该角色弃置与结果花色相同的一张牌，否则不能使用【闪】。'
    cache = new Set<GeneralSkillStatusUpdate>()

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashOP>(SlashOP, this)
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
    public conditionFulfilled(event: SlashOP, manager: GameManager): boolean {
        return event.source.player.id === this.playerId && event.timeline === Timeline.AFTER_CONFIRMING_TARGET
    }
    public async doInvoke(event: SlashOP, manager: GameManager): Promise<void> {
        for(let t of event.targets) {
            this.invokeEffects(manager, [t.player.id])
            let judgeCard = await new JudgeOp('铁骑判定', this.playerId).perform(manager)
            console.log('[铁骑] 判定牌为', judgeCard.id)
            let target = t as FactionPlayerInfo
            if(target.isRevealed()) {
                console.log('[铁骑] 选择将要失效的武将牌')
                let choice: Button[] = []
                if(target.isGeneralRevealed) {
                    choice.push(new Button('main', '封禁主将技能: ' + target.general.name))
                }
                if(target.isSubGeneralRevealed) {
                    choice.push(new Button('sub', '封禁副将技能: ' + target.subGeneral.name))
                }
                let resp = await manager.sendHint(this.playerId, {
                    hintType: HintType.MULTI_CHOICE,
                    hintMsg: '请选择对 '+target+' 使用[铁骑]要封禁的武将牌',
                    extraButtons: choice
                })
                //封禁技能??
                console.log('[铁骑] 封禁', target.player.id, resp.button)
                manager.log(`${this.playerId} ${this.displayName}封禁了 ${target} 的 ${resp.button === 'main'? '主将' : '副将'} 的非锁定技`)
                let u = new GeneralSkillStatusUpdate(this.id, target, resp.button as SkillPosition, false)
                this.cache.add(u)
                await manager.events.publish(u)
            }
            let suit = manager.interpret(this.playerId, judgeCard).suit
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
                event.undodegables.add(target.player.id)
            } else {
                console.log('[铁骑] 对方弃置了牌以获得出闪的权利')
                let cardAndPos = ask.getSingleCardAndPos()
                manager.sendToWorkflow(target.player.id, cardAndPos[1], [cardAndPos[0]])
                await manager.events.publish(new CardBeingDroppedEvent(target.player.id, [cardAndPos]))
            }
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

    onRemoval(context: GameContext) {
        if(this.isApplied) {
            let me = context.getPlayer(this.playerId)
            this.isApplied = false
            console.log(`[${this.id}] Remove, 失效, 计算与他人距离时不再减1`, this.playerId)
            me.distanceModTargetingOthers += 1
        }
    }

    async onStatusUpdated(manager: GameManager) {
        let me = manager.context.getPlayer(this.playerId)
        if(!this.isApplied && !this.isInactive()) {
            console.log(`[${this.id}] 生效, 计算与他人距离时减1`, this.playerId)
            me.distanceModTargetingOthers -= 1
            manager.broadcast(me, PlayerInfo.sanitize)
            this.isApplied = true
        }
        if(this.isApplied && this.isInactive()) {
            console.log(`[${this.id}] 失效, 计算与他人距离时不再减1`, this.playerId)
            me.distanceModTargetingOthers += 1
            manager.broadcast(me, PlayerInfo.sanitize)
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
            !manager.context.getPlayer(this.playerId).findCardAt(CardPos.EQUIP, 'shield') &&
            !BlockedEquipment.isBlocked(this.playerId)
    }

    public async doInvoke(event: DodgeOp, manager: GameManager): Promise<void> {
        this.invokeEffects(manager)
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
        this.invokeEffects(manager)
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
    // hiddenType = HiddenType.FOREWARNABLE
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.WU_XIE, (hint)=>{
            return new PlayerActionDriverDefiner('看破')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>isSuitBlack(context.interpret(id).suit), ()=>'选择一张黑色手牌')
                        .expectAnyButton('点击确定使用无懈可击')
                        .build(hint, [Button.OK])
        })
    }

    public canStillProcess = (manager: GameManager): boolean => {
        return manager.context.getPlayer(this.playerId)
                            .getCards(CardPos.HAND)
                            .filter(c => isSuitBlack(manager.interpret(this.playerId, c).suit))
                            .length > 0
    }

    public doProcess = async (resp: PlayerAct, manager: GameManager) => {
        await this.revealMySelfIfNeeded(manager)
        let card = resp.getSingleCardAndPos()[0]
        console.log(`[无懈的结算] (看破) 打出了${card.id}作为无懈`)
        card.description = `${resp.source.player.id} 看破`
        card.as = CardType.WU_XIE
        manager.sendToWorkflow(resp.source.player.id, CardPos.HAND, [card])
        this.invokeEffects(manager)
        await manager.events.publish(new CardBeingUsedEvent(resp.source.player.id, [[card, CardPos.HAND]], card.type, true))
    }

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.onEvent<WuXieContext>(WuXieContext, this.playerId, async (context: WuXieContext) => {
            if(this.isDisabled || this.isGone || (!this.isRevealed && !this.isForewarned)) {
                return
            }
            console.log('[看破] 预发动')
            //手上有黑牌
            if(manager.context.getPlayer(this.playerId)
                            .getCards(CardPos.HAND)
                            .filter(c => isSuitBlack(manager.interpret(this.playerId, c).suit))
                            .length > 0) {
                console.log('[看破] 添加技能处理')
                context.candidates.add(this.playerId)
                context.processors.set(this.playerId, this)
            }
        })
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
        return event.isFrom(this.playerId) && event.timeline === DamageTimeline.DID_DAMAGE && 
                manager.context.computeDistance(this.playerId, event.target.player.id) <= 1 &&
                event.source.hp < event.source.maxHp
    }
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        let me = event.source
        this.invokeEffects(manager, [event.target.player.id])
        console.log('[狂骨] 发动, 回血', event.amount)
        await new HealOp(me, me, event.amount).perform(manager)
    }
}

export class LieGong extends SimpleConditionalSkill<SlashOP> {
    id = '烈弓'
    displayName = '烈弓'
    description = '当你于出牌阶段内使用【杀】指定一个目标后，若该角色的手牌数不小于你的体力值或不大于你的攻击范围，则你可以令其不能使用【闪】响应此【杀】。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashOP>(SlashOP, this)
    }
    public conditionFulfilled(event: SlashOP, manager: GameManager): boolean {
        return event.source.player.id === this.playerId && event.timeline === Timeline.AFTER_CONFIRMING_TARGET &&
            (event.getTarget().getCards(CardPos.HAND).length >= event.source.hp || event.getTarget().getCards(CardPos.HAND).length <= event.source.getReach())
    }
    public async doInvoke(event: SlashOP, manager: GameManager): Promise<void> {
        console.log('[烈弓] 发动, 不能闪')
        this.invokeEffects(manager, [event.getTarget().player.id])
        event.undodegables.add(event.getTarget().player.id)
    }
}

export class JiLi extends SimpleConditionalSkill<CardBeingUsedEvent> {
    id = '蒺藜'
    displayName = '蒺藜'
    description = '当你于一回合内使用或打出第X张牌时，你可以摸X张牌（X为你的攻击范围）'
    playedInThisRound = 0
    //否则可能反复发动计算
    needRepeatedCheck = false

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
            let wasPlayed = this.playedInThisRound
            this.playedInThisRound += event.cards.length
            let currentReach = manager.context.getPlayer(this.playerId).getReach()
            console.log('[蒺藜] 使用牌数为', wasPlayed, this.playedInThisRound, currentReach)
            if(wasPlayed < currentReach && this.playedInThisRound >= currentReach) {
                return true
            }
            return false 
        }
        return false
    }
    public async doInvoke(event: CardBeingUsedEvent, manager: GameManager): Promise<void> {
        let me = manager.context.getPlayer(this.playerId)
        console.log('[蒺藜] 发动蒺藜拿牌', me.getReach())
        this.invokeEffects(manager)
        await new TakeCardOp(me, me.getReach()).perform(manager)
    }
}

export class XiangLe extends SimpleConditionalSkill<SlashOP> {
    id = '享乐'
    displayName = '享乐'
    description = '锁定技，当你成为一名角色使用【杀】的目标后，除非该角色弃置一张基本牌，否则此【杀】对你无效。'
    isLocked = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashOP>(SlashOP, this)
    }
    public conditionFulfilled(event: SlashOP, manager: GameManager): boolean {
        return event.hasTarget(this.playerId) && event.timeline === Timeline.AFTER_BECOMING_TARGET
    }
    public async doInvoke(event: SlashOP, manager: GameManager): Promise<void> {
        console.log('[享乐] 发动')
        this.invokeEffects(manager, [event.source.player.id])
        let abandonned = await askAbandonBasicCard(manager, event.source, '请弃置一张基本牌否则你的杀无效', true)
        if(abandonned) {
            console.log('[享乐] 弃置了基本牌, 杀继续生效')
        } else {
            console.log('[享乐] 使杀无效化')
            event.removeTarget(this.playerId)
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

                    this.invokeEffects(manager, [target.player.id])
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
        this.invokeEffects(manager)
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
                console.log('[奇才] 改变锦囊距离限制', this.playerId)
                manager.roundStats.binLiangReach = 99
                manager.roundStats.shunshouReach = 99
            }
        })
    }

    public async onStatusUpdated(manager: GameManager): Promise<void> {
        if(!this.isInactive()) {
            console.log('[奇才] 生效', this.playerId)
            this.isWorking = true
            if(manager.currPlayer().player.id === this.playerId) {
                manager.roundStats.binLiangReach = 99
                manager.roundStats.shunshouReach = 99
                manager.reissue()
            }
        } else {
            console.log('[奇才] 失效', this.playerId)
            this.isWorking = false
            if(manager.currPlayer().player.id === this.playerId) {
                manager.roundStats.binLiangReach = 1
                manager.roundStats.shunshouReach = 1
                manager.reissue()
            }
        }
    }
}

export class LianHuan extends Skill {
    id = '连环'
    displayName = '连环'
    description = '你可以将一张梅花手牌当【铁索连环】使用或重铸。'
    hiddenType = HiddenType.NONE
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('连环')
                    .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                    .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).suit === 'club', ()=>'选择一张梅花手牌')
                    .expectChoose([UIPosition.PLAYER], 1, 2, 
                        (id, context)=>true,
                        ()=>`选择1到2个‘铁索连环’的对象, 或者直接重铸`)
                    .expectAnyButton('点击确定使用铁索连环 或重铸')
                    .build(hint, [Button.OK, Button.CANCEL, new Button('chong_zhu', '重铸')])
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        
        this.playSound(manager, 2)
        manager.log(`${this.playerId} 发动了 ${this.displayName}`)
        let cardAndPos = act.getSingleCardAndPos()
        cardAndPos[0].as = CardType.TIE_SUO
        cardAndPos[0].description = '连环'
        if(act.targets.length === 0 || act.button === 'chong_zhu') {
            //铁索重铸算作弃置
            await act.dropCardsFromSource('重铸')
            await new TieSuo(act.source, act.targets, true, [cardAndPos[0]]).perform(manager)
        } else {
            manager.sendToWorkflow(act.source.player.id, cardAndPos[1], [cardAndPos[0]], true)
            await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [cardAndPos], CardType.TIE_SUO, true, true))
            await new TieSuo(act.source, act.targets, false, [cardAndPos[0]]).perform(manager)
        }
    }
}

export class NiePan extends SimpleConditionalSkill<AskSavingOp> {
    id = '涅槃'
    displayName = '涅槃'
    description = '限定技，当你处于濒死状态时，你可以弃置所有牌，然后复原你的武将牌，摸三张牌，将体力回复至3点。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        manager.context.getPlayer(this.playerId).signs['涅'] = {
            enabled: true,
            type: 'limit-skill',
            displayName: this.displayName,
            owner: this.position
        }
        skillRegistry.on<AskSavingOp>(AskSavingOp, this)
    }
    public conditionFulfilled(event: AskSavingOp, manager: GameManager): boolean {
        return event.deadman.player.id === this.playerId && event.goodman.player.id === this.playerId
    }
    public async doInvoke(event: AskSavingOp, manager: GameManager): Promise<void> {
        let me = manager.context.getPlayer(this.playerId)

        let cardsAndPos = me.getAllCards()
        for(let cardAndPos of cardsAndPos) {
            cardAndPos[0].description = `${me} 涅槃弃牌`
            manager.sendToWorkflow(me.player.id, cardAndPos[1], [cardAndPos[0]])
        }
        await manager.events.publish(new CardBeingDroppedEvent(me.player.id, cardsAndPos))
        me.signs['涅'].enabled = false
        me.isDrunk = false
        me.isChained = false
        me.isTurnedOver = false
        me.hp = 0
        await new HealOp(me, me, 3).perform(manager)
        manager.broadcast(me, PlayerInfo.sanitize)
        this.invokeEffects(manager)
        
        await new TakeCardOp(manager.context.getPlayer(this.playerId), 3).perform(manager)
    }
}

export class HuoShou extends SimpleConditionalSkill<NanMan> {
    id = '祸首'
    displayName = '祸首'
    description = '锁定技，【南蛮入侵】对你无效；当其他角色使用【南蛮入侵】指定目标后，你代替其成为此牌造成的伤害的来源。'
    isLocked = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<NanMan>(NanMan, this)
    }
    public conditionFulfilled(event: NanMan, manager: GameManager): boolean {
        return !!event.targets.find(t => t.player.id === this.playerId) && event.timeline === Timeline.BECOME_TARGET
    }
    public async doInvoke(event: NanMan, manager: GameManager): Promise<void> {
        this.invokeEffects(manager)

        //remove myself from target
        event.targets.splice(event.targets.findIndex(t => t.player.id === this.playerId), 1)
        //add to source
        event.damageDealer = manager.context.getPlayer(this.playerId)
    }
}

export class ZaiQi extends SimpleConditionalSkill<TakeCardStageOp> {
    id = '再起'
    displayName = '再起'
    description = '摸牌阶段，你可以改为亮出牌堆顶的X张牌（X为你已损失的体力值），然后回复等同于其中红桃牌数量的体力，并获得其余的牌。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<TakeCardStageOp>(TakeCardStageOp, this)
    }
    public conditionFulfilled(event: TakeCardStageOp, manager: GameManager): boolean {
        let me = manager.context.getPlayer(this.playerId)
        return event.player === me && me.hp < me.maxHp
    }
    public async doInvoke(event: TakeCardStageOp, manager: GameManager): Promise<void> {
        this.playSound(manager, 2)
        manager.broadcast(new TextFlashEffect(this.playerId, [], this.id))
        event.amount = -999

        // 亮出X张
        let me = manager.context.getPlayer(this.playerId)
        let x = me.maxHp - me.hp
        let zaiQiCards = manager.context.deck.getCardsFromTop(x).map(c => {
            c.description = this.displayName
            return c
        })
        let transit = CardTransit.deckToWorkflow(zaiQiCards)
        transit.specialEffect = 'flip'
        manager.broadcast(transit)

        let collect: Card[] = []
        zaiQiCards.forEach(c => {
            manager.context.workflowCards.add(c)
            if(manager.interpret(this.playerId, c).suit !== 'heart') {
                collect.push(c)
            }
        })

        let recover = zaiQiCards.length - collect.length
        let msg = `${this.playerId} 发动了 ${this.displayName}`
        if(recover > 0) {
            msg += ` 回复了${recover}点体力`
        }
        if(collect.length > 0) {
            msg += ` 并获得了${collect}`
        }
        manager.log(msg)
        await new HealOp(me, me, recover).perform(manager)
        await manager.takeFromWorkflow(this.playerId, CardPos.HAND, collect)
    }
}

export class JuXiang extends SimpleConditionalSkill<NanMan> {
    id = '巨象'
    displayName = '巨象'
    description = '锁定技，【南蛮入侵】对你无效；当其他角色使用的【南蛮入侵】结算结束后，你获得之。'
    isLocked = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<NanMan>(NanMan, this)
    }
    public conditionFulfilled(event: NanMan, manager: GameManager): boolean {
        //目标中有我的南蛮入侵， 并且在确认目标阶段
        //或者南蛮已经结算完毕，且是其他角色使用的
        return (!!event.targets.find(t => t.player.id === this.playerId) && event.timeline === Timeline.BECOME_TARGET) || 
                (event.source.player.id !== this.playerId && event.timeline === Timeline.COMPUTE_FINISH)
    }
    public async doInvoke(event: NanMan, manager: GameManager): Promise<void> {
        if(event.timeline === Timeline.BECOME_TARGET) {
            this.invokeEffects(manager)
            //remove myself from target
            event.targets.splice(event.targets.findIndex(t => t.player.id === this.playerId), 1)
        }
        if(event.timeline === Timeline.COMPUTE_FINISH) {
            console.log('[巨象] 南蛮结算完毕', event.cards.map(c => c.id), all(event.cards, c => manager.stillInWorkflow(c)))
            if(event.cards.length > 0 && all(event.cards, c => manager.stillInWorkflow(c))) {
                this.playSound(manager, 2)
                manager.broadcast(new TextFlashEffect(this.playerId, [], this.id))
                manager.log(`${this.playerId} 获得南蛮入侵牌 ${event.cards}`)
                await manager.takeFromWorkflow(this.playerId, CardPos.HAND, event.cards)
            }
        }
    }
}

export class LieRen extends SimpleConditionalSkill<DamageOp> {
    id = '烈刃'
    displayName = '烈刃'
    description = '当你使用【杀】对目标角色造成伤害后，你可以与其拼点，若你赢，你获得其一张牌。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
    }
    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        if(event.isFrom(this.playerId) && event.timeline === DamageTimeline.DID_DAMAGE 
            && event.damageSource === DamageSource.SLASH && event.target.player.id !== this.playerId) {
            return canCardFight(this.playerId, event.target.player.id, manager)
        }
        return false
    }
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        this.invokeEffects(manager, [event.target.player.id])

        let success = await new CardFightOp(event.source, event.target, this.displayName).perform(manager)
        if(success) {
            await GrabCard(event.source, event.target, '烈刃拼点成功获得对方一张牌', manager, [CardPos.HAND, CardPos.EQUIP])
        }
    }
}

//涅槃可以直接回很多点
export class ShuShen extends SimpleConditionalSkill<HealOp> {
    id = '淑慎'
    displayName = '淑慎'
    description = '当你回复1点体力后，你可以令一名其他角色摸一张牌。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<HealOp>(HealOp, this)
    }
    public conditionFulfilled(event: HealOp, manager: GameManager): boolean {
        return event.target.player.id === this.playerId && event.amount > 0 && event.timeline === HealTimeline.AFTER
    }
    public async doInvoke(event: HealOp, manager: GameManager): Promise<void> {
        let amount = event.amount
        while(amount > 0) {
            amount--
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.CHOOSE_PLAYER,
                hintMsg: '选择一名其他角色摸牌',
                forbidden: [this.playerId],
                minQuantity: 1,
                quantity: 1,
                extraButtons: [Button.CANCEL]
            })

            if(resp.isCancel()) {
                return
            } else {
                let lucky = resp.targets[0]
                this.invokeEffects(manager, [lucky.player.id])
                await new TakeCardOp(lucky, 1).perform(manager)
            }
        }
    }
}

export class ShenZhi extends SimpleConditionalSkill<StageStartFlow> {
    id = '神智'
    displayName = '神智'
    description = '准备阶段，你可以弃置所有手牌，若你以此法弃置的手牌数不小于你的体力值，你回复1点体力。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
    }
    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        let me = manager.context.getPlayer(this.playerId)
        return event.info.player.id === this.playerId && event.stage === Stage.ROUND_BEGIN && me.getCards(CardPos.HAND).length > 0
    }
    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        let me = manager.context.getPlayer(this.playerId)
        let cards = me.getCards(CardPos.HAND)
        this.invokeEffects(manager)

        let toDrop = cards.map(card => {
            delete card.as
            card.description = `${this.displayName} 弃置`
            return card
        })
        manager.sendToWorkflow(this.playerId, CardPos.HAND, toDrop, true)
        await manager.events.publish(new CardBeingDroppedEvent(this.playerId, toDrop.map(d => [d, CardPos.HAND])))
        if(toDrop.length >= me.hp && me.hp < me.maxHp) {
            await new HealOp(me, me, 1).perform(manager)
        }
    }
}


export class ShengXi extends SimpleConditionalSkill<StageStartFlow> {
    id = '生息'
    displayName = '生息'
    description = '弃牌阶段开始时，若你此回合内没有造成过伤害，你可以摸两张牌。'
    hasDealtDamage = false
    needRepeatedCheck = false

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
        skillRegistry.onEvent<DamageOp>(DamageOp, this.playerId, async(op)=>{
            if(op.isFrom(this.playerId) && op.type !== DamageType.ENERGY) {
                this.hasDealtDamage = true
            }
        })
    }
    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        //piggy back
        if(event.info.player.id === this.playerId) {
            if(event.stage === Stage.ROUND_BEGIN) {
                this.hasDealtDamage = false
            }
            if(event.stage === Stage.DROP_CARD && !this.hasDealtDamage) {
                return true
            }
        }
        return false
    }
    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        this.invokeEffects(manager)
        await new TakeCardOp(manager.context.getPlayer(this.playerId), 2).perform(manager)
    }
}

export class ShouCheng extends SimpleConditionalSkill<CardAwayEvent> {
    id = '守成'
    displayName = '守成'
    description = '当与你势力相同的一名角色于其回合外失去最后手牌时，你可以令其摸一张牌。'
    needRepeatedCheck = false

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<CardBeingDroppedEvent>(CardBeingDroppedEvent, this)
        skillRegistry.on<CardBeingTakenEvent>(CardBeingTakenEvent, this)
        skillRegistry.on<CardBeingUsedEvent>(CardBeingUsedEvent, this)
    }
    public conditionFulfilled(event: CardAwayEvent, manager: GameManager): boolean {
        let me = manager.context.getPlayer(this.playerId) as FactionPlayerInfo
        let theGuy = manager.context.getPlayer(event.player) as FactionPlayerInfo
        if(manager.currPlayer() === theGuy) {
            return false
        }
        if(FactionPlayerInfo.factionSame(me, theGuy) && theGuy.getCards(CardPos.HAND).length === 0) {
            if(any(event.cards, pair => pair[1] === CardPos.HAND)) {
                return true
            }
        }
        return false
    }
    public async doInvoke(event: CardAwayEvent, manager: GameManager): Promise<void> {
        this.invokeEffects(manager)
        await new TakeCardOp(manager.context.getPlayer(event.player), 1).perform(manager)
    }
}

export class GuanXing extends SimpleConditionalSkill<StageStartFlow> {
    id = '观星'
    displayName = '观星'
    description = '准备阶段，你可以观看牌堆顶的X张牌（X为存活角色数且最多为5），然后以任意顺序放回牌堆顶或牌堆底。'
    data: CustomUIData<GuanXingData>
    xDeterminer: (manager: GameManager)=>number = (manager)=>{
        return Math.min(5, manager.getSortedByCurr(true).length)
    }
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
    }
    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        return event.isFor(this.playerId, Stage.ROUND_BEGIN)
    }
    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        let x = this.xDeterminer(manager)
        let cards = manager.context.deck.getCardsFromTop(x)
        this.data = new CustomUIData<GuanXingData>('guanxing', {
            title: `${this.playerId} 观星`,
            size: x,
            isController: true,
            top: cards.map((c, i)=>['guanxing' + i, c]),
            btm: []
        })
        this.invokeEffects(manager)
        let {top, btm} = this.data.data

        //做好update hookup
        const onCardMoved=(event: CardMovementEvent)=>{
            event.applyToTopBtm(top, btm)
            manager.broadcast(event)
        }
        manager.pubsub().on<CardMovementEvent>(CardMovementEvent, onCardMoved)

        //发送观星的移动请求
        this.setBroadcast(manager)
        await manager.sendHint(this.playerId, {
            hintType: HintType.UI_PANEL,
            hintMsg: 'ignore',
            customRequest: {
                mode: 'choose',
                data: true
            }
        })

        //观星完毕
        manager.context.deck.placeCardsAtTop(top.map(item => item[1]))
        manager.context.deck.placeCardsAtBtm(btm.map(item => item[1]))
        manager.log(`${this.playerId} 将 ${top.length}张牌置于牌堆顶, ${btm.length}张牌置于牌堆底`)

        //扫尾
        manager.broadcast(new CustomUIData(CustomUIData.STOP, null))
        manager.pubsub().off<CardMovementEvent>(CardMovementEvent, onCardMoved)
        this.data = null
        manager.onReconnect = null
    }

    private setBroadcast(manager: GameManager) {
        manager.onReconnect = ()=>{
            manager.broadcast(this.data, (data, pId)=>{
                if(pId !== this.playerId) {
                    let copy = new CustomUIData<GuanXingData>('guanxing', {
                        title: `${this.playerId} 观星`,
                        size: this.data.data.size,
                        isController: false,
                        top: this.data.data.top.map(t => [t[0], Card.DUMMY]),
                        btm: this.data.data.btm.map(t => [t[0], Card.DUMMY])
                    })
                    return copy
                }
                return data
            })
        }
        manager.onReconnect()
    }
}


export class KongChengCancellor<T extends (RuseOp<any> | SlashOP)> implements SkillTrigger<T> {

    needRepeatedCheck = false

    constructor(private skill: Skill) {}

    getSkill(): Skill {
        return this.skill
    }

    invokeMsg(event: T, manager: GameManager): string {
        return '发动' + this.skill.displayName
    }

    getSkillTriggerer(event: T, manager: GameManager): string {
        return this.skill.playerId
    }

    conditionFulfilled(event: T, manager: GameManager): boolean {
        if(manager.context.getPlayer(this.skill.playerId).getCards(CardPos.HAND).length === 0) {
            //todo: 和流离有冲突!! 如果先流离了空城可能不会被触发!
            if(event.timeline === Timeline.BECOME_TARGET && event.hasTarget(this.skill.playerId)) {
                if(event instanceof RuseOp && event.ruseType === CardType.JUE_DOU) {
                    return true
                }
                if(event instanceof SlashOP) {
                    return true
                }
            }
        }
        return false
    }

    async doInvoke(event: T, manager: GameManager): Promise<void> {
        this.skill.invokeEffects(manager)
        event.removeTarget(this.skill.playerId)
    }
}

export class KongCheng extends Skill {
    id = '空城'
    displayName = '空城'
    description = '锁定技，当你成为【杀】或【决斗】的目标时，若你没有手牌，你取消此目标。'
    needRepeatedCheck = false
    //你回合外其他角色交给你的牌正面朝上放置于你的武将牌上，摸牌阶段开始时，你获得武将牌上的这些牌。'
    isLocked = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashOP>(SlashOP, new KongChengCancellor(this))
        skillRegistry.on<JueDou>(JueDou, new KongChengCancellor(this))
        const onCardAway= async (away: CardAwayEvent)=>{
            if(!this.isInactive() && away.player === this.playerId && 
                manager.context.getPlayer(this.playerId).getCards(CardPos.HAND).length === 0) {
                this.invokeEffects(manager)
            }
        }
        skillRegistry.onEvent<CardBeingDroppedEvent>(CardBeingDroppedEvent, this.playerId, onCardAway)
        skillRegistry.onEvent<CardBeingTakenEvent>(CardBeingTakenEvent, this.playerId, onCardAway)
        skillRegistry.onEvent<CardBeingUsedEvent>(CardBeingUsedEvent, this.playerId, onCardAway)
    }
}

export class TiaoXin extends Skill {
    
    id = '挑衅'
    displayName = '挑衅'
    description = '出牌阶段限一次，你可以选择一名攻击范围内含有你的角色，然后除非该角色对你使用一张【杀】，否则你弃置其一张牌。'
    hiddenType = HiddenType.NONE
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('挑衅')
                    .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id && !hint.roundStat.customData[this.id])
                    .expectChoose([UIPosition.PLAYER], 1, 1, 
                        (id, context)=>{
                            return id !== this.playerId && context.computeDistance(id, this.playerId) <= context.getPlayer(id).getReach()
                        },
                        ()=>`选择一名攻击范围内含有你的角色`)
                    .expectAnyButton('点击确定发动挑衅')
                    .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        manager.roundStats.customData[this.id] = true
        let target = act.targets[0]
        this.invokeEffects(manager, [target.player.id])
        
        let resp = await manager.sendHint(target.player.id, {
            hintType: HintType.PLAY_SLASH,
            hintMsg: `${this.playerId} 发动 挑衅 令你对其出杀, 若你取消他将弃置你一张牌`,
            targetPlayers: [act.source.player.id],
            extraButtons: [new Button(Button.CANCEL.id, '放弃')]
        })

        if(resp.isCancel()) {
            console.log('玩家放弃出杀, 弃置其一张牌')
            await new DropOthersCardRequest().perform(manager, act.source, target, `(挑衅)弃置${target}一张牌`, [CardPos.HAND, CardPos.EQUIP])
        } else {
            console.log('玩家出杀, 开始结算吧')
            resp.targets.push(act.source)
            await manager.resolver.on(resp, manager)
        }
    }
}

export class GuanXingJiangWei extends GuanXing {
    id = '观星(姜维)'
}

export class YiZhi extends Skill {
    
    id = '遗志'
    displayName = '遗志'
    description = '副将技，此武将牌上单独的阴阳鱼个数-1。若你的主将拥有技能“观星”，则将其描述中的X改为5；若你的主将没有技能“观星”，则你拥有技能“观星”。'
    disabledForMain = true
    hiddenType = HiddenType.NONE

    async onStatusUpdated(manager: GameManager, repo: SkillRepo) {
        if(!this.isInactive()) {
            this.isGone = true

            try {
                let teacher = repo.getSkill(this.playerId, '观星')
                if(teacher.position === 'main') {
                    console.log(`[${this.id}] 生效改变观星描述为5`);
                    (teacher as GuanXing).xDeterminer = ()=>5
                } else {
                    console.error('发现观星技能但不是主将技??!!', teacher.playerId, teacher.id)
                }
            } catch (ignore) {
                console.log(`[${this.id}] 生效增加姜维的观星技能`)
                let myNew = new GuanXingJiangWei(this.playerId)
                myNew.isRevealed = true
                repo.addSkill(this.playerId, myNew)
                manager.send(this.playerId, myNew.toStatus())
            }

            manager.send(this.playerId, this.toStatus())
        }
    }
}

export class KanPoJiangWei extends KanPo {
    id = '看破(姜维)'
}

export class TianFu extends Skill {
    
    id = '天覆'
    displayName = '天覆'
    description = '主将技，阵法技，若当前回合角色与你处于同一队列，你拥有技能“看破”。'
    disabledForSub = true
    hiddenType = HiddenType.NONE
    myKanPo: KanPoJiangWei

    async onStatusUpdated(manager: GameManager, repo: SkillRepo) {
        if(!this.isInactive()) {
            this.isGone = true

            console.log(`[${this.id}] 生效增加姜维的看破技能`)
            this.myKanPo = new KanPoJiangWei(this.playerId)
            this.myKanPo.isRevealed = true
            this.myKanPo.position = 'main'
            repo.addSkill(this.playerId, this.myKanPo)

            //check disabled ness
            if(areInFormation(manager.currPlayer().player.id, this.playerId, manager.context)) {
                console.log(`${this.displayName} 使看破生效`)
                this.myKanPo.isDisabled = false
            } else {
                console.log(`${this.displayName} 使看破禁用`)
                this.myKanPo.isDisabled = true
            }

            manager.send(this.playerId, this.myKanPo.toStatus())

            manager.send(this.playerId, this.toStatus())
        }
    }

    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager, repo: SkillRepo): void {
        skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async(event)=>{
            if(!this.myKanPo) {
                return
            }
            if(areInFormation(this.playerId, event.info.player.id, manager.context) && manager.getSortedByCurr(true).length >= 4) {
                if(this.myKanPo.isDisabled) {
                    console.log(`${this.displayName} 使看破生效`)
                    await repo.changeSkillDisabledness(this.myKanPo, false, this.displayName, null)
                }
            } else {
                if(!this.myKanPo.isDisabled) {
                    console.log(`${this.displayName} 使看破禁用`)
                    await repo.changeSkillDisabledness(this.myKanPo, true, this.displayName, null)
                }
            }
        })
    }
}


export class GuiXiu extends SimpleConditionalSkill<RevealGeneralEvent> {
    
    id = '闺秀'
    displayName = '闺秀'
    description = '当你明置此武将牌时，你可以摸两张牌；当你移除此武将牌时，你可以回复1点体力。'
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<RevealGeneralEvent>(RevealGeneralEvent, this)
        skillRegistry.onEvent<RemoveGeneralEvent>(RemoveGeneralEvent, this.playerId, async(event: RemoveGeneralEvent)=>{
            if(event.playerId === this.playerId) {
                if(event.isMain === (this.position === 'sub')) {
                    let me = manager.context.getPlayer(this.playerId)
                    await new HealOp(me, me, 1).perform(manager)
                }
            }
        })
    }
    public conditionFulfilled(event: RevealGeneralEvent, manager: GameManager): boolean {
        return event.playerId === this.playerId && ((event.mainReveal && this.position === 'main') || (event.subReveal && this.position === 'sub'))
    }
    public async doInvoke(event: RevealGeneralEvent, manager: GameManager): Promise<void> {
        this.invokeEffects(manager)
        await new TakeCardOp(manager.context.getPlayer(this.playerId), 2).perform(manager)
    }

}

export class CunSi extends Skill {
    
    id = '存嗣'
    displayName = '存嗣'
    description = '出牌阶段，你可以移除此武将牌并选择一名角色，然后其获得技能“勇决”（若与你势力相同的一名角色于其回合内使用的第一张牌为【杀】，则该角色可以在此【杀】结算完成后获得之），若你没有获得“勇决”，则获得“勇决”的角色摸两张牌。'
    

}

export class YongJue extends Skill {
    
    id = '勇决'
    displayName = '勇决'
    description = '若与你势力相同的一名角色于其回合内使用的第一张牌为【杀】，则此【杀】结算后进入弃牌堆时，该角色可以在此【杀】结算完成后获得之'
    


}

// 潜袭 准备阶段，你可以进行判定，然后你选择距离为1的一名角色，直到回合结束，该角色不能使用或打出与结果颜色相同的手牌。
// 闺秀 当你明置此武将牌时，你可以摸两张牌；当你移除此武将牌时，你可以回复1点体力。
// 存嗣 出牌阶段，你可以移除此武将牌并选择一名角色，然后其获得技能“勇决”（若与你势力相同的一名角色于其回合内使用的第一张牌为【杀】，则该角色可以在此【杀】结算完成后获得之），若你没有获得“勇决”，则获得“勇决”的角色摸两张牌。
// 勇决 若与你势力相同的一名角色于其回合内使用的第一张牌为【杀】，则该角色可以在此【杀】结算完成后获得之

// 眩惑 与你势力相同的其他角色的出牌阶段限一次，该角色可以交给你一张手牌并弃置一张牌，然后其选择并获得以下技能之一直到回合结束：“武圣”、“咆哮”、“龙胆”、“铁骑”、“烈弓”、“狂骨”（场上已有的技能无法选择）。
// 恩怨 锁定技，当其他角色对你使用【桃】时，该角色摸一张牌；当你受到伤害后，伤害来源需交给你一张手牌，否则失去1点体力。