
import { Skill, SkillTrigger, HiddenType, SimpleConditionalSkill, EventRegistryForSkills } from "./Skill"
import { HintType, CardSelectionResult } from "../../common/ServerHint"
import PlayerActionDriverDefiner from "../../client/player-actions/PlayerActionDriverDefiner"
import { playerActionDriverProvider } from "../../client/player-actions/PlayerActionDriverProvider"
import { UIPosition, Button } from "../../common/PlayerAction"
import PlayerAct from "../../server/context/PlayerAct"
import GameManager from "../../server/GameManager"
import { TextFlashEffect, CardTransit } from "../../common/transit/EffectTransit"
import { CardPos } from "../../common/transit/CardPos"
import { CardBeingDroppedEvent, CardBeingUsedEvent, CardAwayEvent, CardBeingTakenEvent, CardObtainedEvent } from "../../server/engine/Generic"
import Card, { CardType, Suit, Color, SuperGenre } from "../../common/cards/Card"
import TakeCardOp, { TakeCardStageOp } from "../../server/engine/TakeCardOp"
import { isSuitBlack, isSuitRed, ICard, mimicCard, deriveColor } from "../../common/cards/ICard"
import { GuoHe, ShunShou } from "../../server/engine/SingleRuseOp"
import DamageOp, { DamageSource, DamageType, DamageTimeline } from "../../server/engine/DamageOp"
import { StageStartFlow, StageEndFlow } from "../../server/engine/StageFlows"
import DropCardOp, { DropCardRequest, DropTimeline, DropOthersCardRequest } from "../../server/engine/DropCardOp"
import { Suits, any, toChinese } from "../../common/util/Util"
import { UseDelayedRuseOp } from "../../server/engine/DelayedRuseOp"
import { SlashCompute } from "../../server/engine/SlashOp"
import { Timeline, RuseOp } from "../../server/Operation"
import { YiYiDaiLao } from '../FactionWarActionResolver'
import HealOp from "../../server/engine/HealOp"
import { Stage } from "../../common/Stage"
import CardFightOp from "../../server/engine/CardFightOp"
import { EquipOp } from "../../server/engine/EquipOp"
import GameClientContext from "../../client/GameClientContext"
import FactionPlayerInfo from "../FactionPlayerInfo"
import { MoveCardOnField } from "../../server/engine/MoveCardOp"
import { DoTieSuo } from "../../server/engine/MultiRuseOp"

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

    public async onPlayerAction(act: PlayerAct, ignore: any, manager: GameManager): Promise<void> {
        if(act.isCancel()) {
            console.error('[制衡] 怎么可能cancel??')
            return
        }
        this.playSound(manager, 2)
        manager.log(`${this.playerId} 发动了 ${this.displayName}`)
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
                        .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, (id, context)=>isSuitBlack(context.interpret(id).suit), ()=>'(奇袭)选择一张黑色牌')
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
        manager.log(`${this.playerId} 使用${this.displayName}将${cardAndPos[0]}作为过河拆桥打出`)
        cardAndPos[0].as = CardType.GUO_HE
        
        manager.sendToWorkflow(act.source.player.id, cardAndPos[1], [cardAndPos[0]], true)
        await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [cardAndPos], CardType.GUO_HE, true))
        await new GuoHe(act.source, act.targets[0], [cardAndPos[0]]).perform(manager)
    }
}


export class KuRou extends Skill {
    id = '苦肉'
    displayName = '苦肉'
    description = '出牌阶段限一次，你可以弃一张牌。若如此做，你失去1点体力，然后摸三张牌，此阶段你使用【杀】的次数上限+1'
    hiddenType = HiddenType.NONE
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('苦肉')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>!hint.roundStat.customData[this.id] && id === this.id)
                        .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, (id, context)=>true, ()=>'(苦肉)请弃置一张牌')
                        .expectAnyButton('点击确定发动苦肉')
                        .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        
        manager.roundStats.customData[this.id] = true
        this.playSound(manager, 2)
        manager.log(`${this.playerId} 发动了 ${this.displayName}`)
        await act.dropCardsFromSource('苦肉弃牌')
        let me = manager.context.getPlayer(this.playerId)
        await new DamageOp(me, me, 1, [], DamageSource.SKILL, DamageType.ENERGY).perform(manager)
        if(!me.isDead) {
            manager.roundStats.slashMax += 1
            await new TakeCardOp(me, 3).perform(manager)
        }
    }
}

export class YingZi extends SimpleConditionalSkill<TakeCardStageOp> {
    id = '英姿'
    displayName = '英姿'
    description = '锁定技，摸牌阶段，你多摸一张牌；你的手牌上限等于X（X为你的体力上限）。'
    isLocked = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<TakeCardStageOp>(TakeCardStageOp, this)
        skillRegistry.onEvent<DropCardOp>(DropCardOp, this.playerId, async (dropOp)=>{
            if(!this.isDisabled && this.isRevealed && dropOp.player.player.id === this.playerId && 
                    dropOp.timeline === DropTimeline.BEFORE) {
                let me = manager.context.getPlayer(this.playerId)
                // this.invokeEffects(manager)
                dropOp.limit += me.maxHp - me.hp
                console.log('[英姿] 改变手牌上限为', dropOp.limit)
            }
        })
    }

    public conditionFulfilled(event: TakeCardStageOp, manager: GameManager): boolean {
        return event.player.player.id === this.playerId
    }

    public async doInvoke(event: TakeCardStageOp, manager: GameManager): Promise<void> {
        console.log('[英姿] 发动')
        this.playSound(manager, 2)
        manager.broadcast(new TextFlashEffect(this.playerId, [], this.id))
        event.amount += 1
    }
}

export class FanJian extends SimpleConditionalSkill<TakeCardStageOp> {
    id = '反间'
    displayName = '反间'
    description = '出牌阶段限一次，你可以展示一张手牌并交给一名其他角色，其选择一项：1.展示所有手牌，弃置与此牌同花色的牌；2.失去1点体力。'
    hiddenType = HiddenType.NONE

    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('反间')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>true, ()=>'(反间)选择一张要展示的手牌')
                        .expectChoose([UIPosition.PLAYER], 1, 1, 
                            (id, context)=>{
                                return id !== context.myself.player.id   // 不能是自己
                            }, 
                            ()=>`选择‘反间’的对象给与此牌`)
                        .expectAnyButton('点击确定使用反间')
                        .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        
        this.playSound(manager, 2)
        manager.log(`${this.playerId} 发动了 ${this.displayName}`)
        let cardAndPos = act.getSingleCardAndPos()
        let targetP = act.targets[0]
        let target = targetP.player.id
        let card = cardAndPos[0]
        card.description = this.playerId + ' 反间 ' + target + ' 使用的牌'
        
        //展示并交给此角色
        manager.sendToWorkflow(this.playerId, CardPos.HAND, [card], true, true)
        await manager.transferCards(this.playerId, target, CardPos.HAND, CardPos.HAND, [card])
        
        //令其选择一项: 
        let suit: Suit = manager.interpret(target, card).suit
        let resp = await manager.sendHint(target, {
            hintType: HintType.MULTI_CHOICE,
            hintMsg: '请选择对反间的反应',
            extraButtons: [new Button('cards', `展示所有手牌，弃置所有${Suits[suit]}花色牌`), new Button('hp', '失去一点体力')]
        })
        let button = resp.button
        console.log('[反间] 对方选择了', button)
        if(button === 'cards') {
            let allCards = targetP.getCards(CardPos.HAND)
            let toKeep: Card[] = []
            //allCards.filter(c => manager.interpret(target, c.id).suit === suit)
            let toDrop: Card[] = []
            //allCards.filter(c => manager.interpret(target, c.id).suit !== suit)
            allCards.forEach(c => {
                if(manager.interpret(target, c).suit === suit) {
                    c.description = '反间弃置手牌'
                    toDrop.push(c)
                } else {
                    c.description = '反间展示手牌'
                    toKeep.push(c)
                }
            })
            if(toDrop.length > 0) {
                manager.sendToWorkflow(target, CardPos.HAND, toDrop, false)
                await manager.events.publish(new CardBeingDroppedEvent(target, toDrop.map(t => [t, CardPos.HAND])))
            }
            if(toKeep.length > 0) {
                manager.sendToWorkflow(target, CardPos.HAND, toKeep, false, true)
            }
        } else if (button === 'hp') {
            await new DamageOp(targetP, targetP, 1, [], DamageSource.SKILL, DamageType.ENERGY).perform(manager)
        } else {
            throw 'WHAT??? ' + button
        }
    }
}


export class GuoSe extends Skill {
    id = '国色'
    displayName = '国色'
    description = '你可以将一张方块牌当【乐不思蜀】使用。'
    hiddenType = HiddenType.NONE
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('国色')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, (id, context)=>context.interpret(id).suit === 'diamond', ()=>'(国色)选择一张方片牌')
                        .expectChoose([UIPosition.PLAYER], 1, 1, 
                            (id, context)=>{
                                return id !== context.myself.player.id   // 不能是自己
                            }, 
                            ()=>`选择‘国色’的对象`)
                        .expectAnyButton('点击确定发动国色(乐不思蜀)')
                        .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        
        let cardAndPos = act.getSingleCardAndPos()
        let card = cardAndPos[0], pos = cardAndPos[1]
        card.as = CardType.LE_BU
        
        this.invokeEffects(manager, [act.targets[0].player.id])
        await new UseDelayedRuseOp(card, act.source, pos, act.targets[0]).perform(manager)
        await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [cardAndPos], CardType.LE_BU, true))
    }
}

export class LiuLi extends SimpleConditionalSkill<SlashCompute> {
    id = '流离'
    displayName = '流离'
    description = '当你成为【杀】的目标时，你可以弃置一张牌并将此【杀】转移给你攻击范围内的一名其他角色。'

    public bootstrapClient() {
        playerActionDriverProvider.registerSpecial(this.id, (hint)=>{
            return new PlayerActionDriverDefiner('流离')
                        .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, (id, context)=>true, ()=>'(流离)选择一张牌弃置')
                        .expectChoose([UIPosition.PLAYER], 1, 1, 
                            (id, context)=>{
                                return id !== context.myself.player.id && id !== hint.sourcePlayer && // 不能是自己也不能是出杀的人
                                    context.computeDistance(this.playerId, id) <= context.getPlayer(this.playerId).getReach()
                            }, 
                            ()=>`选择‘流离’的对象`)
                        .expectAnyButton('点击确定发动流离')
                        .build(hint, [Button.OK])
        })
    }

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashCompute>(SlashCompute, this)
    }

    public conditionFulfilled(event: SlashCompute, manager: GameManager): boolean {
        return event.timeline === Timeline.BECOME_TARGET && event.target.player.id === this.playerId
    }

    public async doInvoke(event: SlashCompute, manager: GameManager): Promise<void> {
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.SPECIAL,
            specialId: this.id,
            hintMsg: '请选择发动流离',
            sourcePlayer: event.source.player.id,
            extraButtons: [Button.CANCEL]
        })
        if(resp.isCancel()) {
            return
        }

        let target = resp.targets[0]
        this.invokeEffects(manager, [target.player.id])
        await resp.dropCardsFromSource(this.displayName)
        event.target = target

    }
}

class SingleRuseCancellor<T extends RuseOp<any>> implements SkillTrigger<T> {

    constructor(private skill: Skill, private cardType: CardType) {}

    getSkill(): Skill {
        return this.skill
    }

    invokeMsg(event: T, manager: GameManager): string {
        return '发动' + this.skill.displayName
    }

    conditionFulfilled(event: T, manager: GameManager): boolean {
        return event.timeline === Timeline.BECOME_TARGET && event.target.player.id === this.skill.playerId 
                && event.ruseType === this.cardType
    }

    async doInvoke(event: T, manager: GameManager): Promise<void> {
        this.skill.invokeEffects(manager)
        event.abort = true
    }
}

export class QianXun extends Skill {
    id = '谦逊'
    displayName = '谦逊'
    description = '锁定技，当你成为【顺手牵羊】或【乐不思蜀】的目标时，则取消之。'
    isLocked = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<UseDelayedRuseOp>(UseDelayedRuseOp, new SingleRuseCancellor<UseDelayedRuseOp>(this, CardType.LE_BU))
        skillRegistry.on<ShunShou>(ShunShou, new SingleRuseCancellor<ShunShou>(this, CardType.SHUN_SHOU))
    }
} 

export class DuoShi extends Skill {
    id = '度势'
    displayName = '度势'
    description = '出牌阶段限四次，你可以将一张红色手牌当【以逸待劳】使用。'
    hiddenType = HiddenType.NONE
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            let usedTimes = hint.roundStat.customData[this.id] as number || 0
            return new PlayerActionDriverDefiner('度势')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>usedTimes < 4 && id === this.id)
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>isSuitRed(context.interpret(id).suit), ()=>'(度势)选择一张红色手牌')
                        .expectAnyButton('点击确定发动度势(以逸待劳)')
                        .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        
        let cardAndPos = act.getSingleCardAndPos()
        this.playSound(manager, 2)
        let card = cardAndPos[0], pos = cardAndPos[1]
        manager.log(`${this.playerId} 发动 ${this.displayName} 将${card}作为以逸待劳打出`)
        card.as = CardType.YI_YI
        
        manager.roundStats.customData[this.id] = (manager.roundStats.customData[this.id] || 0) + 1
        manager.sendToWorkflow(act.source.player.id, pos, [card], true)
        await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [cardAndPos], CardType.YI_YI, true))
        await YiYiDaiLao.do([card], act.source, manager)
    }
}

export class JieYin extends Skill {
    id = '结姻'
    displayName = '结姻'
    description = '出牌阶段限一次，你可以弃置两张手牌，令你和一名已受伤的男性角色各回复1点体力。'
    hiddenType = HiddenType.NONE
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('结姻')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>!hint.roundStat.customData[this.id] && id === this.id)
                        .expectChoose([UIPosition.MY_HAND], 2, 2, (id, context)=>true, ()=>'(结姻)选择弃置两张手牌')
                        .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>{
                            let dude = context.getPlayer(id)
                            return dude.getGender() === 'M' && dude.hp < dude.maxHp
                        }, ()=>'(结姻)选择一名已受伤的男性角色')
                        .expectAnyButton('点击确定发动结姻')
                        .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        
        manager.roundStats.customData[this.id] = true
        await act.dropCardsFromSource('结姻')

        this.invokeEffects(manager, [act.targets[0].player.id])
        if(act.source.hp < act.source.maxHp) {
            await new HealOp(act.source, act.source, 1).perform(manager)
        }
        await new HealOp(act.targets[0], act.targets[0], 1).perform(manager)
    }
}

export class XiaoJi extends SimpleConditionalSkill<CardAwayEvent> {
    id = '枭姬'
    displayName = '枭姬'
    description = '当你失去装备区里的牌后，你可以摸两张牌。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<CardAwayEvent>(CardBeingDroppedEvent, this)
        skillRegistry.on<CardAwayEvent>(CardBeingUsedEvent, this)
        skillRegistry.on<CardAwayEvent>(CardBeingTakenEvent, this)
    }

    public conditionFulfilled(event: CardAwayEvent, manager: GameManager): boolean {
        return event.player === this.playerId && event.cards.length > 0 && any(event.cards, c => {
            return c[1] === CardPos.EQUIP
        })
    }

    public async doInvoke(event: CardAwayEvent, manager: GameManager): Promise<void> {
        let times = event.cards.filter(c => c[1] === CardPos.EQUIP).length
        this.invokeEffects(manager)
        while(times > 0) {
            times--
            await new TakeCardOp(manager.context.getPlayer(this.playerId), 2).perform(manager)
        }
    }
}

export class YingHun extends SimpleConditionalSkill<StageStartFlow> {
    id = '英魂'
    displayName = '英魂'
    description = '准备阶段，若你已受伤，你可以选择一名其他角色并选择一项：1.令其摸X张牌，然后弃置一张牌；2.令其摸一张牌，然后弃置X张牌。（X为你已损失的体力值）'

    bootstrapClient() {
        playerActionDriverProvider.registerSpecial(this.id, (hint, context)=>{
            return new PlayerActionDriverDefiner('英魂')
                        .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>id !== this.playerId, ()=>'(英魂)选择一名其他角色')
                        .expectAnyButton('选择发动的选项')
                        .build(hint, [])
        })
    }
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
    }

    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        if(event.info.player.id === this.playerId && event.stage === Stage.ROUND_BEGIN) {
            let me = manager.context.getPlayer(this.playerId)
            return me.hp < me.maxHp
        }
        return false
    }

    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        let me = manager.context.getPlayer(this.playerId)
        let x = me.maxHp - me.hp
        let buttons = [new Button('take', `摸一张,弃${toChinese(x - 1)}张`).inDirect(), new Button('drop', `摸${toChinese(x - 1)}张, 弃一张`).inDirect()]
        if(x === 1) {
            buttons = [new Button('take', `摸一张,弃一张`).inDirect()]
        }
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.SPECIAL,
            specialId: this.id,
            hintMsg: '英魂',
            extraButtons: [...buttons, Button.CANCEL]
        })
        if(resp.isCancel()) {
            return
        }
        let target = resp.targets[0]
        this.invokeEffects(manager, [target.player.id])
        if(resp.button === 'take') {
            await new TakeCardOp(target, 1).perform(manager)
            await new DropCardRequest().perform(target.player.id, x, manager, `${resp.source} 发动英魂令你弃置 ${x} 张牌`, [UIPosition.MY_HAND, UIPosition.MY_EQUIP])
        } else if (resp.button === 'drop') {
            await new TakeCardOp(target, x).perform(manager)
            await new DropCardRequest().perform(target.player.id, 1, manager, `${resp.source} 发动英魂令你弃置一张牌`, [UIPosition.MY_HAND, UIPosition.MY_EQUIP])
        } else {
            throw 'WTF??' + resp.button
        }
    }

}


export class TianYi extends Skill {
    id = '天义'
    displayName = '天义'
    description = '出牌阶段限一次，你可以与一名角色拼点：若你赢，本回合你可以多使用一张【杀】、使用【杀】无距离限制且可以多选择一个目标；若你没赢，本回合你不能使用【杀】。'
    hiddenType = HiddenType.NONE
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('天义')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>{
                            return !hint.roundStat.customData[this.id] && id === this.id && context.getPlayer(this.playerId).getCards(CardPos.HAND).length > 0
                        })
                        .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>{
                            return id !== this.playerId && context.getPlayer(id).getCards(CardPos.HAND).length > 0
                        }, ()=>'(天义)选择一名角色拼点')
                        .expectAnyButton('点击确定发动天义')
                        .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        
        this.invokeEffects(manager, [act.targets[0].player.id])
        manager.roundStats.customData[this.id] = true

        let success = await new CardFightOp(act.source, act.targets[0], this.displayName).perform(manager)
        if(success) {
            manager.roundStats.slashMax += 1
            manager.roundStats.slashNumber += 1
            manager.roundStats.slashReach = 999
        } else {
            manager.roundStats.slashMax = -99999
        }
    }
}

export class ZhiJian extends Skill {
    id = '直谏'
    displayName = '直谏'
    description = '出牌阶段，你可以将手牌中的一张装备牌置于其他角色的装备区里，然后摸一张牌。'
    hiddenType = HiddenType.NONE
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('直谏')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id, context.myself).type.isEquipment(), ()=>'选择手牌中的一张装备牌')
                        .expectChoose([UIPosition.PLAYER], 1, 1, (id, context, chosen)=>{
                            let card = context.interpret(chosen.getArr(UIPosition.MY_HAND)[0], context.myself)
                            let target = context.getPlayer(id)
                            return id !== this.playerId && !target.findCardAt(CardPos.EQUIP, card.type.genre)
                        }, ()=>'(直谏)选择一名角色将此装备牌放置(不能替换已有的)')
                        .expectAnyButton('点击确定发动直谏')
                        .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        
        let card = act.getSingleCardAndPos()[0]
        this.invokeEffects(manager, act.targets.map(t => t.player.id))
        await new EquipOp(act.targets[0], card, CardPos.HAND, act.source).perform(manager)
        await new TakeCardOp(act.source, 1).perform(manager)
    }
}

export class GuZheng extends SimpleConditionalSkill<DropCardOp>{
    id = '固政'
    displayName = '固政'
    description = '其他角色的弃牌阶段结束时，你可以将此阶段中的一张弃牌返还给该角色，然后你获得其余的弃牌。'
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<DropCardOp>(DropCardOp, this)
    }

    public conditionFulfilled(event: DropCardOp, manager: GameManager): boolean {
        return event.player.player.id !== this.playerId && event.timeline === DropTimeline.AFTER && 
                event.dropped.filter(d => manager.stillInWorkflow(d)).length > 0
    }

    public async doInvoke(event: DropCardOp, manager: GameManager): Promise<void> {
        let remaining = event.dropped.filter(d => manager.stillInWorkflow(d))
        this.invokeEffects(manager, [event.player.player.id])
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.UI_PANEL,
            hintMsg: `请在${event.player}的弃牌中选择一张返还`,
            customRequest: {
                mode: 'choose',
                data: {
                    rowsOfCard: {
                        '弃置': remaining
                    },
                    title: `请在${event.player}的弃牌中选择一张返还`,
                    chooseSize: 1
                }
            }
        })

        let ans = (resp.customData as CardSelectionResult)[0]
        let picked = remaining.splice(ans.idx, 1)
        
        await manager.takeFromWorkflow(event.player.player.id, CardPos.HAND, picked)
        await manager.takeFromWorkflow(this.playerId, CardPos.HAND, remaining)
    }
}

export class HongYan extends Skill {
    id = '红颜'
    displayName = '红颜'
    description = '出牌阶段，你可明置此武将牌；你的黑桃牌视为红桃牌。'
    hiddenType = HiddenType.REVEAL_IN_MY_USE_CARD

    bootstrapClient(context: GameClientContext) {
        context.registerInterpreter(this.playerId, this.interpret)
    }

    bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager) {
        manager.context.registerInterpreter(this.playerId, this.interpret)
    }

    interpret=(card: ICard) => {
        if(this.isDisabled || !this.isRevealed) {
            return card
        }
        let res = mimicCard(card)
        if(res.suit === 'spade') {
            console.log('[红颜] 将黑桃改红桃')
            res.suit = 'heart'
        }
        return res
    }
}

export class TianXiang extends SimpleConditionalSkill<DamageOp> {
    
    id = '天香'
    displayName = '天香'
    description = '当你受到伤害时，你可以弃置一张红桃手牌,防止此次伤害并选择一名其他角色，'+
                '你选择一项：令其受到1点伤害，然后摸X张牌（X为其已损失体力值且至多为5）；令其失去1点体力，然后其获得你弃置的牌。'

    public bootstrapClient() {
        playerActionDriverProvider.registerSpecial(this.id, (hint)=>{
            return new PlayerActionDriverDefiner('天香')
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>context.interpret(id).suit === 'heart', ()=>'选择一张红桃手牌')
                        .expectChoose([UIPosition.PLAYER], 1, 1, (id)=>id !== this.playerId, ()=>'(天香)选择一名其他角色')
                        .expectAnyButton('选择一项')
                        .build(hint, [])
        })
    }
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
    }

    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        return event.target.player.id === this.playerId && event.timeline === DamageTimeline.TAKING_DAMAGE 
                 && event.type !== DamageType.ENERGY
    }

    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        let buttons = [new Button('damage', '受到一点伤害然后摸其损失体力值的牌').inDirect(), new Button('energy', '损失一点体力获得你的天香牌').inDirect()]
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.SPECIAL,
            specialId: this.id,
            hintMsg: '天香',
            extraButtons: [...buttons, Button.CANCEL]
        })
        if(resp.isCancel()) {
            return
        }

        let source = resp.source, target = resp.targets[0]
        this.invokeEffects(manager, [target.player.id])
        //防止此伤害
        event.amount = -999
        //弃置牌
        await resp.dropCardsFromSource('[天香] 弃置')
        if(resp.button === 'damage') {
            await new DamageOp(source, target, 1, [], DamageSource.SKILL).perform(manager)
            if(!target.isDead && target.hp < target.maxHp) {
                await new TakeCardOp(target, target.maxHp - target.hp).perform(manager)
            }
        } else {
            await new DamageOp(source, target, 1, [], DamageSource.SKILL, DamageType.ENERGY).perform(manager)
            if(!target.isDead) {
                await manager.takeFromWorkflow(target.player.id, CardPos.HAND, [resp.getSingleCardAndPos()[0]])
            }
        }
    }
}

export class HaoShi extends SimpleConditionalSkill<TakeCardStageOp> {
    id = '好施'
    displayName = '好施'
    description = '摸牌阶段，你可以多摸两张牌，然后若你的手牌数大于5，则你将一半的手牌交给手牌最少的一名其他角色。'
    hasInvoked = false
    
    public bootstrapClient() {
        playerActionDriverProvider.registerSpecial(this.id, (hint, context)=>{
            let required = Math.floor(context.myself.getCards(CardPos.HAND).length / 2)
            let minimum = Infinity, choices = new Set<string>()
            context.playerInfos.forEach(p => {
                if(this.playerId !== p.player.id) {
                    let hand = p.getCards(CardPos.HAND).length
                    if(hand < minimum) {
                        minimum = hand
                        choices.clear()
                        choices.add(p.player.id)
                    } else if (hand === minimum) {
                        choices.add(p.player.id)
                    }
                }
            })
            if(choices.size < 1) {
                console.error('没有找到好施的对象!!! 不可能!!')
            }
            console.log('[好施] 手牌最少的为', minimum, choices)
            return new PlayerActionDriverDefiner('好施')
                        .expectChoose([UIPosition.PLAYER], 1, 1, (id)=>choices.has(id), ()=>'(好施)选择手牌最少的一名其他角色')
                        .expectChoose([UIPosition.MY_HAND], required, required, (id, context)=>true, ()=>`请选择${required}张手牌交给此角色`)
                        .expectAnyButton('点击确定完成好施')
                        .build(hint, [Button.OK])
        })
    }

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<TakeCardStageOp>(TakeCardStageOp, this)
        skillRegistry.onEvent<StageEndFlow>(StageEndFlow, this.playerId, async(flow)=>{
            if(flow.isFor(this.playerId, Stage.TAKE_CARD) && this.hasInvoked) {
                this.hasInvoked = false
                console.log('[好施] 负面效果发动')
                let me = manager.context.getPlayer(this.playerId)
                if(me.getCards(CardPos.HAND).length > 5) {
                    //拿一半手牌
                    let resp = await manager.sendHint(this.playerId, {
                        hintType: HintType.SPECIAL,
                        hintMsg: '好施',
                        specialId: this.id
                    })
                    let cards = resp.cards.get(CardPos.HAND)
                    manager.log(`${this.playerId} 将 ${cards.length} 张手牌交给 ${resp.targets[0]}`)
                    await manager.transferCards(this.playerId, resp.targets[0].player.id, CardPos.HAND, CardPos.HAND, cards)
                }
            }
        })
    }

    public conditionFulfilled(event: TakeCardStageOp, manager: GameManager): boolean {
        return event.player.player.id === this.playerId
    }

    public async doInvoke(event: TakeCardStageOp, manager: GameManager): Promise<void> {
        this.invokeEffects(manager)
        this.hasInvoked = true
        event.amount += 2
    }
}

export class DiMeng extends SimpleConditionalSkill<TakeCardStageOp> {
    id = '缔盟'
    displayName = '缔盟'
    description = '出牌阶段限一次，你可以选择两名其他角色并弃置X张牌（X为这两名角色手牌数的差），然后令这两名角色交换手牌。'
    hiddenType = HiddenType.NONE

    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('缔盟')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>{
                            return !hint.roundStat.customData[this.id] && id === this.id
                        })
                        .expectChoose([UIPosition.PLAYER], 2, 2, (id, context)=>{
                            return id !== this.playerId
                        }, ()=>'(缔盟)选择两名其他角色')
                        .expectAnyButton('点击确定发动缔盟并弃牌')
                        .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        let targetA = act.targets[0]
        let targetB = act.targets[1]
        let diff = Math.abs(targetA.getCards(CardPos.HAND).length - targetB.getCards(CardPos.HAND).length)

        if(diff > 0) {
            let success = await new DropCardRequest().perform(this.playerId, diff, manager, 
                            `请弃置${diff}张牌完成缔盟, 或取消以放弃`, [UIPosition.MY_EQUIP, UIPosition.MY_HAND], true)
            if(!success) {
                console.log('[缔盟] 取消了, 玩家不愿意弃牌')
                return
            }
        }

        
        this.invokeEffects(manager, act.targets.map(t => t.player.id))
        manager.roundStats.customData[this.id] = true

        /**** Hackish Manipultion ****/
        let a = targetA.getCards(CardPos.HAND)
        targetA.cards.set(CardPos.HAND, [])
        let b = targetB.getCards(CardPos.HAND)
        targetB.cards.set(CardPos.HAND, [])
        await manager.events.publish(new CardBeingTakenEvent(targetA.player.id, a.map(c => [c, CardPos.HAND])))
        await manager.events.publish(new CardBeingTakenEvent(targetB.player.id, b.map(c => [c, CardPos.HAND])))
        targetA.cards.set(CardPos.HAND, b)
        targetB.cards.set(CardPos.HAND, a)
        manager.broadcast(new CardTransit(targetA.player.id, CardPos.HAND, targetB.player.id, CardPos.HAND, a, 1000), CardTransit.defaultSanitize)
        manager.broadcast(new CardTransit(targetB.player.id, CardPos.HAND, targetA.player.id, CardPos.HAND, b, 1000), CardTransit.defaultSanitize)
        await manager.events.publish(new CardObtainedEvent(targetA.player.id, b.map(c => [c, CardPos.HAND])))
        await manager.events.publish(new CardObtainedEvent(targetB.player.id, a.map(c => [c, CardPos.HAND])))
    }

}

export class YiCheng extends SimpleConditionalSkill<SlashCompute> {

    id = '疑城'
    displayName = '疑城'
    description = '当与你势力相同的一名角色成为【杀】的目标后，你可以令该角色摸一张牌然后弃置一张牌。'

    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashCompute>(SlashCompute, this)
    }

    public conditionFulfilled(event: SlashCompute, manager: GameManager): boolean {
        return FactionPlayerInfo.factionSame(event.target, manager.context.getPlayer(this.playerId)) && 
                event.timeline === Timeline.AFTER_BECOMING_TARGET
    }

    invokeMsg(event: SlashCompute, manager: GameManager): string {
        return `对${event.target}发动疑城`
    }

    public async doInvoke(event: SlashCompute, manager: GameManager): Promise<void> {
        this.invokeEffects(manager, [event.target.player.id])
        await new TakeCardOp(event.target, 1).perform(manager)
        await new DropCardRequest().perform(event.target.player.id, 1, manager, '(疑城)请弃置一张牌', [UIPosition.MY_HAND, UIPosition.MY_EQUIP])
    }
}

export class KeJi extends SimpleConditionalSkill<DropCardOp> {
   
    id = '克己'
    displayName = '克己'
    description = '锁定技，弃牌阶段开始时，若你未于出牌阶段内使用过颜色不同的牌或出牌阶段被跳过，你的手牌上限于此回合内+4'
    isLocked = true
    colorsUsed = new Set<Color>()

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<DropCardOp>(DropCardOp, this)
        skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async (stageEvent)=> {
            if(stageEvent.isFor(this.playerId, Stage.USE_CARD)) {
                this.colorsUsed.clear()
            }
        })
        skillRegistry.onEvent<CardBeingUsedEvent>(CardBeingUsedEvent, this.playerId, async (useOp)=>{
            //你的出牌阶段,你用的牌
            if(manager.currEffect.stage === Stage.USE_CARD && manager.currPlayer().player.id === this.playerId && 
                useOp.player === this.playerId) {
                useOp.cards.forEach(c => {
                    this.colorsUsed.add(deriveColor([manager.interpret(this.playerId, c[0]).suit]))
                })
            }
        })
    }

    public conditionFulfilled(event: DropCardOp, manager: GameManager): boolean {
        return event.player.player.id === this.playerId && (this.colorsUsed.size < 2)
    }

    public async doInvoke(event: DropCardOp, manager: GameManager): Promise<void> {
        console.log('[克己] 发动')
        this.invokeEffects(manager)
        event.limit += 4
    }
}

export class MouDuan extends SimpleConditionalSkill<StageStartFlow> {
    
    id = '谋断'
    displayName = '谋断'
    description = '结束阶段开始时，若你于出牌阶段内使用过四种花色或三种类别的牌，则你可以移动场上的一张牌。'
    suitsUsed = new Set<Suit>()
    typesUsed = new Set<SuperGenre>()

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
        skillRegistry.onEvent<CardBeingUsedEvent>(CardBeingUsedEvent, this.playerId, async (useOp)=>{
            //你的出牌阶段,你用的牌
            if(manager.currEffect.stage === Stage.USE_CARD && manager.currPlayer().player.id === this.playerId && 
                useOp.player === this.playerId) {
                useOp.cards.forEach(c => {
                    this.suitsUsed.add(c[0].suit)
                    this.typesUsed.add(c[0].type.getSuperGenre())
                })
            }
        })
    }

    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        //趁机重置state
        if(event.isFor(this.playerId, Stage.USE_CARD)) {
            this.suitsUsed.clear()
            this.typesUsed.clear()
        }
        if(event.isFor(this.playerId, Stage.ROUND_END)) {
            return this.suitsUsed.size === 4 || this.typesUsed.size === 3
        }
        return false
    }

    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        this.invokeEffects(manager)
        await MoveCardOnField(manager, event.info, this.displayName)
    }
}

export class DuanXie extends Skill {
    id = '断绁'
    displayName = '断绁'
    description = '出牌阶段限一次，你可以令一名其他角色横置，然后你横置。'
    hiddenType = HiddenType.NONE

    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('断绁')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>{
                            return !hint.roundStat.customData[this.id] && id === this.id
                        })
                        .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>{
                            return id !== this.playerId && !context.getPlayer(id).isChained
                        }, ()=>'(断绁)选择一名未横置(连环)的角色')
                        .expectAnyButton('点击确定发动断绁')
                        .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        manager.roundStats.customData[this.id] = true
        this.invokeEffects(manager, [act.targets[0].player.id])
        await new DoTieSuo([], act.source, CardType.TIE_SUO, []).doForOne(act.targets[0], manager)
        if(act.source.isChained) {
            await new DoTieSuo([], act.source, CardType.TIE_SUO, []).doForOne(act.source, manager)
        }
    }
}

export class FenMing extends SimpleConditionalSkill<StageStartFlow> {
    id = '奋命'
    displayName = '奋命'
    description = '结束阶段，若你处于连环状态，则你可以弃置所有处于连环状态的角色的各一张牌。'
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
    }

    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        if(event.isFor(this.playerId, Stage.ROUND_END) && event.info.isChained) {
            return true
        }
        return false
    }

    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        let targets = manager.getSortedByCurr(true).filter(p => p.hasOwnCards())
        this.invokeEffects(manager, targets.map(t => t.player.id))
        for(let t of targets) {
            await new DropOthersCardRequest().perform(manager, event.info, t, `(奋命)弃置${t}一张牌`, [CardPos.HAND, CardPos.EQUIP])
        }
    }
}



/**
 * 新版【不屈】的周泰则会经历濒死状态，一路求桃到周泰本人时锁定发动，成功则脱离濒死并回复至1体力，失败则继续向后求桃。
 * 旧版【不屈】是按周泰受到伤害的点数翻不屈牌的，而新版【不屈】则是按次。
 */
// export class BuQu extends SimpleConditionalSkill<AskSavingOp> {
    
//     id = '不屈'
//     displayName = '不屈'
//     description = '锁定技，当你处于濒死状态时，你将牌堆顶的一张牌置于你的武将牌上，称为"创"：若此牌点数与已有的"创"点数均不同，你将体力回复至1点；若点数相同，将此牌置入弃牌堆。'
//     //by card sizes
//     wounds = new Set<number>()

//     public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
//         skillRegistry.on<AskSavingOp>(AskSavingOp, this)
//         skillRegistry.onEvent<DropCardOp>(DropCardOp, this.playerId, async (useOp)=>{
//             //你的出牌阶段,你用的牌
//             if(manager.currEffect.stage === Stage.USE_CARD && manager.currPlayer().player.id === this.playerId && 
//                 useOp.player === this.playerId) {
//                 useOp.cards.forEach(c => {
//                     this.suitsUsed.add(c[0].suit)
//                     this.typesUsed.add(c[0].type.getSuperGenre())
//                 })
//             }
//         })
//     }

//     public conditionFulfilled(event: AskSavingOp, manager: GameManager): boolean {
//         //趁机重置state
//         return event.deadman.player.id === this.playerId
//     }

//     public async doInvoke(event: AskSavingOp, manager: GameManager): Promise<void> {
//         await MoveCardOnField(manager, event.info, this.displayName)
//     }
// }


// 不屈 锁定技，当你处于濒死状态时，你将牌堆顶的一张牌置于你的武将牌上，称为"创"：若此牌点数与已有的"创"点数均不同，你将体力回复至1点；若点数相同，将此牌置入弃牌堆。
// 奋激 一名角色的结束阶段开始时，若其没有手牌，你可令其摸两张牌。若如此做，你失去1点体力。

// 短兵 你使用【杀】可以多选择一名距离为1的角色为目标。
// 奋迅 出牌阶段限一次，你可以弃置一张牌并选择一名其他角色，然后本回合你计算与其的距离视为1。

// 尚义 出牌阶段限一次，你可以令一名其他角色观看你的手牌。若如此做，你选择一项：1.观看其手牌并可以弃置其中的一张黑色牌；2.观看其所有暗置的武将牌。
// 鸟翔 阵法技，在同一个围攻关系中，若你是围攻角色，则你或另一名围攻角色使用【杀】指定被围攻角色为目标后，你令该角色需依次使用两张【闪】才能抵消。


// 激昂 当你使用【决斗】或红色【杀】指定目标后，或成为【决斗】或红色【杀】的目标后，你可以摸一张牌。
// 鹰扬 当你拼点的牌亮出后，你可以令此牌的点数+3或-3。
// 魂殇 副将技，此武将牌减少半个阴阳鱼；准备阶段，若你的体力值不大于1，则你本回合获得“英姿”和“英魂”。


// 调度 与你势力相同的角色使用装备牌时可以摸一张牌。出牌阶段开始时，你可以获得与你势力相同的一名角色装备区里的一张牌，然后可以将此牌交给另一名角色。
// 典财 其他角色的出牌阶段结束时，若你于此阶段失去了X张或更多的牌，则你可以将手牌摸至体力上限，然后你可以变更一次副将(X为你的体力值)。

