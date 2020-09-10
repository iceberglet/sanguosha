import DamageOp, { DamageTimeline, DamageSource, DamageType } from "../../server/engine/DamageOp";
import { SimpleConditionalSkill, EventRegistryForSkills } from "./Skill";
import GameManager from "../../server/GameManager";
import { CardPos } from "../../common/transit/CardPos";
import { HintType, CardSelectionResult } from "../../common/ServerHint";
import { gatherCards, findCard, CardBeingPlayedEvent, CardBeingDroppedEvent, CardBeingUsedEvent } from "../../server/engine/Generic";
import JudgeOp, {JudgeTimeline} from "../../server/engine/JudgeOp";
import { UIPosition, Button } from "../../common/PlayerAction";
import { getRandom, checkThat } from "../../common/util/Util";
import { StageEndFlow, StageStartFlow } from "../../server/engine/StageFlows";
import { Stage } from "../../common/Stage";
import TakeCardOp, { TakeCardStageOp } from "../../server/engine/TakeCardOp";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import DodgeOp from "../../server/engine/DodgeOp";
import { playerActionDriverProvider } from "../../client/player-actions/PlayerActionDriverProvider";
import PlayerActionDriverDefiner from "../../client/player-actions/PlayerActionDriverDefiner";
import { isSuitBlack } from "../../common/cards/ICard";
import Card, { CardType } from "../../common/cards/Card";
import { SlashCompute, SlashOP } from "../../server/engine/SlashOp";
import { EquipOp } from "../../server/engine/EquipOp";
import { UseDelayedRuseOp } from "../../server/engine/DelayedRuseOp";
import FactionPlayerInfo from "../FactionPlayerInfo";
import DeathOp from "../../server/engine/DeathOp";
import { PlayerInfo } from "../../common/PlayerInfo";
import PlayerAct from "../../server/context/PlayerAct";
import CardFightOp from "../../server/engine/CardFightOp";

export abstract class SkillForDamageTaken extends SimpleConditionalSkill<DamageOp> {

    protected isMyDamage(event: DamageOp) {
        return event.target.player.id === this.playerId && event.timeline === DamageTimeline.TAKEN_DAMAGE 
                 && event.type !== DamageType.ENERGY
    }

    protected damageHasSource(event: DamageOp) {
        return event.source && !event.source.isDead
    }
}

export class JianXiong extends SkillForDamageTaken {

    id = '奸雄'
    displayName = '奸雄'
    description = '当你受到伤害后，你可以获得造成此伤害的牌。'
    isLocked: boolean = false

    public hookup(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
        
    }
    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        return event.cards && event.cards.length > 0 && this.isMyDamage(event)
    }
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        if(event.cards && event.cards.length > 0) {
            this.playSound(manager, 2)
            manager.broadcast(new TextFlashEffect(this.playerId, [], this.id))
            manager.takeFromWorkflow(this.playerId, CardPos.HAND, event.cards)
        }
    }
}

export class FanKui extends SkillForDamageTaken {

    id = '反馈'
    displayName = '反馈'
    description = '当你受到伤害后，你可以获得伤害来源的一张牌。'

    public hookup(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
    }
    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        return this.isMyDamage(event) && this.damageHasSource(event) &&
                (event.source.getCards(CardPos.HAND).length > 0 || event.source.getCards(CardPos.EQUIP).length > 0)
    }
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        
        let targetPlayer = event.source
        let targetId = targetPlayer.player.id
        manager.broadcast(new TextFlashEffect(this.playerId, [targetId], this.id))

        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.UI_PANEL,
            hintMsg: '请选择对方一张牌',
            customRequest: {
                data: {
                    rowsOfCard: gatherCards(targetPlayer, [CardPos.HAND, CardPos.EQUIP]),
                    title: `反馈 > ${targetId}`,
                    chooseSize: 1
                },
                mode: 'choose'
            }
        })
        console.log('反馈成功!', resp)
        let res = resp.customData as CardSelectionResult
        let cardAndPos = findCard(targetPlayer, res)[0]
        let card = cardAndPos[0], pos = cardAndPos[1]
        delete card.description
        delete card.as
        this.playSound(manager, 2)
        await manager.transferCards(targetId, this.playerId, pos, CardPos.HAND, [card])
    }
}

export class GuiCai extends SimpleConditionalSkill<JudgeOp> {

    id = '鬼才'
    displayName = '鬼才'
    description = '当一名角色的判定牌生效前，你可以打出一张手牌代替之。'
    
    public hookup(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<JudgeOp>(JudgeOp, this)
    }

    public conditionFulfilled(event: JudgeOp, manager: GameManager): boolean {
        console.log('[鬼才] 条件达成? ', event.timeline === JudgeTimeline.CONFIRMING, manager.context.getPlayer(this.playerId).getCards(CardPos.HAND).length > 0)
        return event.timeline === JudgeTimeline.CONFIRMING && manager.context.getPlayer(this.playerId).getCards(CardPos.HAND).length > 0
    }
    public async doInvoke(event: JudgeOp, manager: GameManager): Promise<void> {
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg: `请选择要改变的判定牌`,
            quantity: 1,
            positions: [UIPosition.MY_HAND],
            extraButtons: [Button.CANCEL],
        })
        if(!resp.isCancel()) {
            manager.broadcast(new TextFlashEffect(this.playerId, [event.owner], this.id))
            let card = resp.getCardsAtPos(CardPos.HAND)[0]
            console.log('[鬼才] 改变判定牌 ' + card.id)
            card.description = this.playerId + ' 鬼才改判定'
            this.playSound(manager, 2)
            manager.sendToWorkflow(this.playerId, CardPos.HAND, [card], false)
            await manager.events.publish(new CardBeingPlayedEvent(this.playerId, [[card, CardPos.HAND]], null))
            event.judgeCard = card
        } else {
            console.log('[鬼才] 最终放弃了')
        }
    }
}

export class GangLie extends SkillForDamageTaken {

    id = '刚烈'
    displayName = '刚烈'
    description = '当你受到伤害后，你可以进行判定，若结果不为红桃，伤害来源弃置两张手牌或受到1点伤害。'
    
    public hookup(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
        
    }
    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        return this.isMyDamage(event) && this.damageHasSource(event)
    }
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        this.playSound(manager, 2)
        let card = await new JudgeOp('刚烈判定', this.playerId).perform(manager)
        if(manager.interpret(this.playerId, card.id).suit !== 'heart') {
            console.log('[刚烈] 判定成功 ' + card.id)
            let victim = event.source.player.id
            let resp = await manager.sendHint(victim, {
                hintType: HintType.CHOOSE_CARD,
                hintMsg: `请选择弃置两张牌或者取消受到一点伤害`,
                quantity: 2,
                positions: [UIPosition.MY_HAND, UIPosition.MY_EQUIP],
                extraButtons: [Button.CANCEL],
            })
            
            if(!resp.isCancel()) {
                let cards = resp.getCardsAndPos(CardPos.HAND, CardPos.EQUIP)
                for(let kv of cards) {
                    let p = kv[0]
                    let toDrop = kv[1].map(card => {
                        delete card.as
                        card.description = `[${victim}] 因刚烈弃置`
                        return card
                    })
                    manager.sendToWorkflow(victim, p, toDrop, true)
                    await manager.events.publish(new CardBeingDroppedEvent(victim, toDrop.map(d => [d, p])))
                }
                console.log('[刚烈] 玩家弃置两张牌 ' + card.id)
            } else {
                console.log('[刚烈] 玩家选择掉血')
                await new DamageOp(event.target, event.source, 1, [], DamageSource.SKILL).perform(manager)
            }
        } else {
            console.log('[刚烈] 判定失败 ' + card.id)
        }
    }
}


export class TuXi extends SimpleConditionalSkill<TakeCardStageOp> {

    id = '突袭'
    displayName = '突袭'
    description = '摸牌阶段，你可以改为获得最多两名角色的各一张手牌。'

    public hookup(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<TakeCardStageOp>(TakeCardStageOp, this)
        
    }
    public conditionFulfilled(event: TakeCardStageOp, manager: GameManager): boolean {
        return event.player.player.id === this.playerId
    }
    public async doInvoke(event: TakeCardStageOp, manager: GameManager): Promise<void> {
        console.log('[突袭] 选择突袭')
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.CHOOSE_PLAYER,
            hintMsg: '选择1到2名玩家获得各一张手牌',
            minQuantity: 1,
            quantity: 2,
            //必须是有手牌的人
            forbidden: [...manager.getSortedByCurr(false).filter(p => p.getCards(CardPos.HAND).length === 0).map(p => p.player.id), this.playerId],
            extraButtons: [Button.CANCEL]
        })

        if(resp.isCancel()) {
            console.log('[突袭] 玩家最终放弃了突袭')
        } else {
            this.playSound(manager, 2)
            let victims = resp.targets
            console.log('[突袭] 玩家选择了突袭, 放弃了摸牌', victims)
            manager.broadcast(new TextFlashEffect(this.playerId, victims.map(v => v.player.id), this.id))
            for(let v of victims) {
                let card = getRandom(v.getCards(CardPos.HAND))
                await manager.transferCards(v.player.id, this.playerId, CardPos.HAND, CardPos.HAND, [card])
            }
            event.amount = 0
        }

    }
}


export class LuoYi extends SimpleConditionalSkill<TakeCardStageOp> {

    displayName = '裸衣'
    description = '摸牌阶段，你可以少摸一张牌，然后本回合你使用【杀】或【决斗】造成的伤害+1'
    id = '裸衣'

    private isTriggered = false

    public hookup(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<TakeCardStageOp>(TakeCardStageOp, this)
        skillRegistry.onEvent<DamageOp>(DamageOp, this.playerId, this.changeDamage)
        skillRegistry.onEvent<StageEndFlow>(StageEndFlow, this.playerId, this.endEffect)
    }

    public conditionFulfilled(event: TakeCardStageOp, manager: GameManager): boolean {
        return event.player.player.id === this.playerId
    }

    public async doInvoke(event: TakeCardStageOp, manager: GameManager): Promise<void> {
        console.log('[裸衣] 脱!')
        this.playSound(manager, 2)
        manager.broadcast(new TextFlashEffect(this.playerId, [], this.id))
        this.isTriggered = true
        event.amount -= 1
    }

    changeDamage = async (damageOp: DamageOp): Promise<void> => {
        if(this.isTriggered && damageOp.source && damageOp.source.player.id === this.playerId &&
            damageOp.timeline === DamageTimeline.DOING_DAMAGE &&
            (damageOp.damageSource === DamageSource.DUEL || damageOp.damageSource === DamageSource.SLASH)) {
            console.log('[裸衣] 伤害加深')
            damageOp.amount += 1
        }
    }

    endEffect = async (stageEnd: StageEndFlow): Promise<void> => {
        console.log('某人的回合结束了')
        if(stageEnd.stage === Stage.ROUND_END && stageEnd.info.player.id === this.playerId) {
            console.log('[裸衣] 穿回去...')
            this.isTriggered = false
        }
    }
}


export class TianDu extends SimpleConditionalSkill<JudgeOp> {

    id = '天妒'
    displayName = '天妒'
    description = '当你的判定牌生效后，你可以获得此牌。'
    
    public hookup(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<JudgeOp>(JudgeOp, this)
        
    }
    public conditionFulfilled(event: JudgeOp, manager: GameManager): boolean {
        return event.owner === this.playerId && event.timeline === JudgeTimeline.CONFIRMED
    }
    public async doInvoke(event: JudgeOp, manager: GameManager): Promise<void> {
        //take the card into hand
        delete event.judgeCard.as
        delete event.judgeCard.description
        this.playSound(manager, 2)
        manager.broadcast(new TextFlashEffect(this.playerId, [], this.id))
        manager.takeFromWorkflow(this.playerId, CardPos.HAND, [event.judgeCard])
    }
}


export class QinGuo extends SimpleConditionalSkill<DodgeOp> {

    id = '倾国'
    displayName = '倾国'
    description = '你可以将一张黑色手牌当【闪】使用或打出。'

    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.DODGE, (hint)=>{
            return new PlayerActionDriverDefiner('倾国出闪')
                    .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                    .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>isSuitBlack(context.interpret(id).suit), ()=>'选择一张黑色手牌作为闪')
                    .expectAnyButton('点击确定使用倾国')
                    .build(hint, [Button.OK])
        })
    }

    async onPlayerAction(act: PlayerAct, dodgeOp: DodgeOp, manager: GameManager): Promise<void> {
        this.playSound(manager, 2)
        manager.broadcast(new TextFlashEffect(dodgeOp.target.player.id, [dodgeOp.source.player.id], '闪'))
        //assume he played it
        let cards = act.getCardsAtPos(CardPos.HAND)
        if(cards.length !== 1) {
            throw `Player played dodge cards but not one card!!!! ${act.source.player.id} ${cards}`
        }
        cards[0].as = CardType.DODGE
        cards[0].description = '倾国'
        manager.sendToWorkflow(dodgeOp.target.player.id, CardPos.HAND, cards)
    }
}


export class LuoShen extends SimpleConditionalSkill<StageStartFlow> {
    id = '洛神'
    displayName = '洛神'
    description = '准备阶段，你可以进行判定，若结果为黑色，你可以重复此流程。然后你获得所有的黑色判定牌。'

    public hookup(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
    }
    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        return event.info.player.id === this.playerId && event.stage === Stage.ROUND_BEGIN
    }
    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        let cards: Card[] = []
        //do nothing
        while(true) {
            this.playSound(manager, 2)
            let card = await new JudgeOp('洛神判定', this.playerId).perform(manager)
            if(isSuitBlack(manager.interpret(this.playerId, card.id).suit)) {
                cards.push(card)
                console.log('[洛神] 成功', card.id)
            } else {
                console.log('[洛神] 判定失败, 结束洛神', card.id)
                break;
            }
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.MULTI_CHOICE,
                hintMsg: '是否继续洛神?',
                extraButtons: [Button.OK, Button.CANCEL]
            })
            if(resp.isCancel()) {
                console.log('[洛神] 玩家放弃洛神, 结束洛神', card)
                break
            }
        }
        cards = cards.filter(c => manager.stillInWorkflow(c))
        if(cards.length > 0) {
            console.log('[洛神] 获得牌', cards.map(c => c.id))
            //最后才拿回来
            manager.takeFromWorkflow(this.playerId, CardPos.HAND, cards)
        } else {
            console.log('[洛神] 没有获得牌')
        }
    }
}



export class ShenSu extends SimpleConditionalSkill<StageStartFlow> {
    id = '神速'
    displayName = '神速'
    description = '你可以做出如下选择：1.跳过判定阶段和摸牌阶段。2.跳过出牌阶段并弃置一张装备牌。你每选择一项，便视为你使用一张无距离限制的【杀】。'

    public bootstrapClient() {
        playerActionDriverProvider.registerSpecial('神速', (hint)=>{
            return new PlayerActionDriverDefiner('神速出杀')
                    .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, (id, context)=>context.interpret(id).type.isEquipment(), ()=>'选择要弃置的装备牌')
                    .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>id !== this.playerId, ()=>'选择出杀的对象')
                    .expectAnyButton('点击确定跳过出牌阶段并弃置装备牌, 视为出杀')
                    .build(hint, [Button.OK])
        })
    }
    
    public hookup(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
    }
    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        if(event.info.player.id !== this.playerId) {
            return false
        }
        if(event.stage === Stage.ROUND_BEGIN) {
            if(manager.roundStats.skipStages.get(Stage.JUDGE) || manager.roundStats.skipStages.get(Stage.TAKE_CARD)) {
                return false
            }
            return true
        } else if (event.stage === Stage.USE_CARD) {
            if(manager.roundStats.skipStages.get(Stage.USE_CARD)) {
                return false
            }
            return true
        }
        return false
    }
    public invokeMsg(event: StageStartFlow, manager: GameManager): string {
        if(event.stage === Stage.ROUND_BEGIN) {
            return '[神速]跳过判定与摸牌'
        } else if (event.stage === Stage.USE_CARD) {
            return '[神速]跳过出牌并弃置一张装备牌'
        } else throw '[神速] 不应该在此时发动 ' + event.stage.name
    }

    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        if(event.stage === Stage.ROUND_BEGIN) {
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.CHOOSE_PLAYER,
                hintMsg: '选择一名杀的目标',
                minQuantity: 1,
                quantity: 1,
                forbidden: [this.playerId],
                extraButtons: [Button.CANCEL]
            })
            if(!resp.isCancel()) {
                this.playSound(manager, 2)
                let target = resp.targets[0]
                console.log('[神速] 跳过判定和摸牌出杀', this.playerId, target)
                //跳过判定和摸牌阶段
                manager.roundStats.skipStages.set(Stage.JUDGE, true)
                manager.roundStats.skipStages.set(Stage.TAKE_CARD, true)
                manager.broadcast(new TextFlashEffect(this.playerId, [target.player.id], '神速'))
                await new SlashOP(manager.context.getPlayer(this.playerId),
                                        [target],
                                        [], 1, DamageType.NORMAL, 'none').perform(manager)
            }
        } else if (event.stage === Stage.USE_CARD){
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.SPECIAL,
                specialId: '神速',
                hintMsg: 'Placeholder, ignored',
                extraButtons: [Button.CANCEL]
            })
            if(!resp.isCancel()) {
                this.playSound(manager, 2)
                let target = resp.targets[0]
                let equipp = resp.getSingleCardAndPos()

                console.log('[神速] 跳过出牌并弃装备牌出杀', this.playerId, target)
                //弃置装备牌
                let pos = equipp[1]
                let card = equipp[0]
                console.log('[神速] 弃置的为', CardPos[pos], card.id)
                delete card.as
                card.description = '神速弃置'
                manager.sendToWorkflow(this.playerId, pos, [card], false)
                await manager.events.publish(new CardBeingDroppedEvent(this.playerId, [[card, pos]]))
                //跳过出牌阶段
                manager.roundStats.skipStages.set(Stage.USE_CARD, true)
                //出杀
                manager.broadcast(new TextFlashEffect(this.playerId, [target.player.id], '神速'))
                await new SlashCompute(manager.context.getPlayer(this.playerId),
                                        target,
                                        [], 1, 1, DamageType.NORMAL, 'none').perform(manager)
            }
        }
    }
}

export class DuanLiang extends SimpleConditionalSkill<StageStartFlow> {
    id = '断粮'
    displayName = '断粮'
    description = '出牌阶段，你可以明置此武将牌；你可以将一张黑色基本牌或黑色装备牌当【兵粮寸断】使用；你可以对距离为2的角色使用【兵粮寸断】。'

    public bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('断粮黑色基本牌')
                    .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                    .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, (id, context)=>{
                        let card = context.interpret(id)
                        return isSuitBlack(card.suit) && (card.type.isEquipment() || card.type.isBasic())
                    }, ()=>'选择一张黑色基本牌或装备牌当做兵粮寸断')
                    .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>id !== this.playerId &&       //不能是自己
                                    (context.getMyDistanceTo(id) <= (context.serverHint.hint.roundStat.binLiangReach)) && //范围得是1
                                    !context.getPlayer(id).hasJudgeCard(CardType.BING_LIANG), 
                                    ()=>'选择兵粮寸断的对象') //不能已经有兵粮了)
                    .expectAnyButton('点击确定打出兵粮寸断')
                    .build(hint)
        })
    }

    async onPlayerAction(act: PlayerAct, ignore: any, manager: GameManager): Promise<void> {
        let target = act.targets[0]
        // manager.broadcast(new TextFlashEffect(this.playerId, [target], this.id))
        //assume he played it
        let posAndCards = act.getSingleCardAndPos()
        let pos = posAndCards[1]
        let card = posAndCards[0]
        card.as = CardType.BING_LIANG
        card.description = '兵粮' 
        this.playSound(manager, 2)
        // manager.sendToWorkflow(this.playerId, pos, [card])
        await new UseDelayedRuseOp(card, act.source, pos, target).perform(manager)
        await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, pos]], CardType.BING_LIANG, true))
    }

    public hookup(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async (f)=>{
            if(f.info.player.id === this.playerId && f.stage === Stage.ROUND_BEGIN) {
                manager.roundStats.binLiangReach = 2
            }
        })
    }
}

export class JuShou extends SimpleConditionalSkill<StageStartFlow> {

    id = '据守'
    displayName = '据守'
    description = '结束阶段开始时，你可以发动此技能。然后你摸X张牌，选择一项：1.弃置一张不为装备牌的手牌；2.使用一张装备牌。若X大于2，则你将武将牌翻面。（X为此时亮明势力数）'

    public hookup(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
    }

    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        return event.info.player.id === this.playerId && event.stage === Stage.ROUND_END
    }
    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        this.playSound(manager, 2)
        let revealed = manager.getSortedByCurr(true).filter(p => (p as FactionPlayerInfo).isRevealed())
        let facs = new Set<string>()
        let myself = manager.context.getPlayer(this.playerId)
        revealed.forEach(r => facs.add(r.getFaction().name))
        let x = facs.size
        console.log('[据守] 场上亮明势力数为', x)
        await new TakeCardOp(myself, x).perform(manager)
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg: '[据守] 选择一张手牌, 若为装备则使用, 否则弃置',
            quantity: 1,
            minQuantity: 1,
            positions: [UIPosition.MY_HAND]
        })

        let card = resp.getCardsAtPos(CardPos.HAND)[0]
        console.log('[据守] 弃置', card)
        if(card.type.isEquipment()) {
            //装备
            await new EquipOp(this.playerId, card, CardPos.HAND, this.playerId).perform(manager)
        } else {
            delete card.as
            card.description = '据守弃置'
            manager.sendToWorkflow(this.playerId, CardPos.HAND, [card], false)
            await manager.events.publish(new CardBeingDroppedEvent(this.playerId, [[card, CardPos.HAND]]))
        }
        if(x > 2) {
            console.log('[据守] 翻面', x)
            myself.isTurnedOver = !myself.isTurnedOver
            manager.broadcast(myself, PlayerInfo.sanitize)
        }
        return
    }

}

export class QiangXi extends SimpleConditionalSkill<void> {
    id = '强袭'
    displayName = '强袭'
    description = '出牌阶段限一次，你可以失去1点体力或弃置一张武器牌，并对你攻击范围内的一名其他角色造成1点伤害。'

    public bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('强袭')
                    .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>!hint.roundStat.customData[this.id] && id === this.id)
                    .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>id !== this.playerId &&       //不能是自己
                                    context.getMyDistanceTo(id) <= context.getPlayer(this.playerId).getReach(), 
                                    ()=>'选择强袭的对象')
                    .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 0, 1, (id, context)=>{
                        let card = context.interpret(id)
                        return card.type.genre === 'weapon'
                    }, ()=>'选择一张武器牌弃置或直接确定失去一点体力')
                    .expectAnyButton('点击确定强袭')
                    .build(hint)
        })
    }

    async onPlayerAction(act: PlayerAct, ignore: any, manager: GameManager): Promise<void> {
        if(act.isCancel()) {
            console.error('[强袭] 怎么可能cancel??')
            return
        }
        this.playSound(manager, 2)
        manager.roundStats.customData[this.id] = true
        let target = act.targets[0]
        manager.broadcast(new TextFlashEffect(this.playerId, [target.player.id], this.id))
        let me = act.source
        let posAndCardos = act.getCardsAndPos(CardPos.HAND, CardPos.EQUIP)
        if(posAndCardos.length > 0) {
            let posAndCards = posAndCardos[0]
            //assume he played it
            console.log('[强袭] 弃置武器牌', posAndCards)
            let pos = posAndCards[0]
            let card = posAndCards[1][0]
            card.description = '强袭弃置' 
            manager.sendToWorkflow(this.playerId, pos, [card])
            await manager.events.publish(new CardBeingDroppedEvent(this.playerId, [[card, pos]]))
        } else {
            console.log('[强袭] 自减体力')
            await new DamageOp(me, me, 1, [], DamageSource.SKILL, DamageType.ENERGY).perform(manager)
        }
        await new DamageOp(me, target, 1, [], DamageSource.SKILL, DamageType.NORMAL).perform(manager)
    }
}

export class XingShang extends SimpleConditionalSkill<DeathOp> {

    id = '行殇'
    displayName = '行殇'
    description = '当其他角色死亡时，你可以获得其所有牌。'

    public hookup(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<DeathOp>(DeathOp, this)
    }

    public conditionFulfilled(event: DeathOp, manager: GameManager): boolean {
        return event.deceased.player.id !== this.id
    }
    public async doInvoke(event: DeathOp, manager: GameManager): Promise<void> {
        this.playSound(manager, 2)
        manager.broadcast(new TextFlashEffect(this.playerId, [], this.id))
        let hand: Card[] = [], equip: Card[] = []
        event.toDrop.forEach(d => {
            if(d[1] === CardPos.HAND){
                hand.push(d[0])
            } else if(d[1] === CardPos.EQUIP){
                equip.push(d[0])
            }
        })
        event.toDrop = event.toDrop.filter(d => d[1] !== CardPos.HAND && d[1] !== CardPos.EQUIP)
        if(hand.length > 0) {
            console.log('[行殇] 行殇拿手牌...', hand.length)
            await manager.transferCards(event.deceased.player.id, this.playerId, CardPos.HAND, CardPos.HAND, hand)
        }
        if(equip.length > 0) {
            console.log('[行殇] 行殇拿装备牌...', equip.length)
            await manager.transferCards(event.deceased.player.id, this.playerId, CardPos.EQUIP, CardPos.HAND, equip)
        }
        return
    }
}
// this.isMyDamage(event) && this.damageHasSource(event)

export class FangZhu extends SkillForDamageTaken {
    id = '放逐'
    displayName = '放逐'
    description = '当你受到伤害后，你可以令一名其他角色翻面，然后该角色摸X张牌（X为你已损失的体力值）。'

    public hookup(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
        
    }
    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        return this.isMyDamage(event)
    }
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.CHOOSE_PLAYER,
            hintMsg: '请选择放逐的对象',
            forbidden: [this.playerId],
            minQuantity: 1,
            quantity: 1,
            extraButtons: [Button.CANCEL]
        })
        if(resp.isCancel()) {
            console.log('[放逐] 放弃了')
            return
        }
        this.playSound(manager, 2)
        let target = resp.targets[0]
        console.log('[放逐] 结果', resp, target.player.id)
        manager.broadcast(new TextFlashEffect(this.playerId, [target.player.id], this.id))
        target.isTurnedOver = !target.isTurnedOver
        manager.broadcast(target, PlayerInfo.sanitize)
        await new TakeCardOp(target, resp.source.maxHp - resp.source.hp).perform(manager)
        return

    }
}

export class QuHu extends SimpleConditionalSkill<void> {
    id = '驱虎'
    displayName = '驱虎'
    description = '出牌阶段限一次，你可以与体力值大于你的一名角色拼点：若你赢，你令该角色对其攻击范围内的另一名角色造成1点伤害；若你没赢，其对你造成1点伤害。'

    
    public bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('驱虎')
                    .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>!hint.roundStat.customData[this.id] && id === this.id &&
                                    context.getPlayer(this.playerId).getCards(CardPos.HAND).length > 0) //有手牌才能拼~
                    .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>id !== this.playerId &&       //不能是自己
                                    context.getPlayer(id).hp > context.getPlayer(this.playerId).hp &&
                                    context.getPlayer(id).getCards(CardPos.HAND).length > 0, 
                                    ()=>'选择驱虎拼点的对象')
                    .expectAnyButton('点击确定与其拼点')
                    .build(hint)
        })
    }

    /**
     * [Q]拼点赢后，能否放弃让目标对其他人造成伤害？
     * [A]不能。
     * @param act 
     * @param ignore 
     * @param manager 
     */
    async onPlayerAction(act: PlayerAct, ignore: any, manager: GameManager): Promise<void> {
        manager.roundStats.customData[this.id] = true
        let target = act.targets[0]
        this.playSound(manager, 2)
        manager.broadcast(new TextFlashEffect(this.playerId, [target.player.id], this.id))
        console.log('[驱虎] 发动')
        let success = await new CardFightOp(act.source, target, '驱虎').perform(manager)
        if(success) {
            console.log('[驱虎] 成功')
            //forbids choice on players out of reach (and target himself)
            let impossible = manager.getSortedByCurr(true).map(p => p.player.id).filter(p => {
                p === target.player.id || manager.context.computeDistance(target.player.id, p) > target.getReach()
            })
            if(impossible.length === manager.getSortedByCurr(true).length) {
                //cannot touch anyone, failed
                console.log('[驱虎] 无法进行, ', target.player.id, ' 打不着任何人')
                return
            } else {
                console.log('[驱虎] 请求指定伤害对象')
                let hurt = await manager.sendHint(this.playerId, {
                    hintType: HintType.CHOOSE_PLAYER,
                    hintMsg: '请选择驱虎伤害的对象',
                    minQuantity: 1,
                    quantity: 1,
                    //必须是有手牌的人
                    forbidden: impossible
                })
                let ttarget = hurt.targets[0]
                console.log('[驱虎] 伤害对象为', ttarget.player.id)
                manager.broadcast(new TextFlashEffect(this.playerId, [ttarget.player.id], this.id))
                await new DamageOp(target, ttarget, 1, [], DamageSource.SKILL, DamageType.NORMAL).perform(manager)
            }
        } else {
            console.log('[驱虎] 失败')
            await new DamageOp(target, act.source, 1, [], DamageSource.SKILL, DamageType.NORMAL).perform(manager)
        }
    }
}

export class JieMing extends SkillForDamageTaken {
    id = '节命'
    displayName = '节命'
    description = '当你受到1点伤害后，你可以令一名角色将手牌摸至X张（X为其体力上限且最多为5）。'
    
    public hookup(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
    }
    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        return this.isMyDamage(event)
    }
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        let amount = event.amount
        while(amount !== 0) {
            amount--
            //找一个人, 任何人
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.CHOOSE_PLAYER,
                hintMsg: '请选择一名角色将手牌补至体力上限(至多为5)',
                minQuantity: 1,
                quantity: 1,
                extraButtons: [Button.CANCEL]
            })
            this.playSound(manager, 2)
            let target = resp.targets[0]
            manager.broadcast(new TextFlashEffect(this.playerId, [target.player.id], this.id))
            let curr = target.getCards(CardPos.HAND).length
            let max = Math.min(5, target.maxHp)
            if(curr < max) {
                console.log('[节命] 使人补牌', target.player.id)
                await new TakeCardOp(target, max - curr).perform(manager)
            } else {
                console.log('[节命] 无法发动, 此人的牌太多了', target.player.id)
            }
        }
    }
}

export class YiJi extends SkillForDamageTaken {
    id = '遗计'
    displayName = '遗计'
    description = '当你受到1点伤害后，你可以观看牌堆顶的两张牌，然后将这些牌交给任意角色。'
    
    public bootstrapClient() {
        playerActionDriverProvider.registerSpecial(this.id, (hint)=>{
            let cards = new Set<string>(hint.forbidden)
            checkThat(cards.size <= 2, '遗计牌至多有俩')
            return new PlayerActionDriverDefiner('遗计')
                    .expectChoose([UIPosition.MY_HAND], 1, 2, (id, context)=>cards.has(id), ()=>hint.hintMsg) 
                    .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>id !== this.playerId,   //不能是自己
                                    ()=>'选择将牌交给的对象')
                    .expectAnyButton('点击将牌交出, 取消自己拿着')
                    .build(hint, [Button.OK])
        })
    }
    public hookup(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
    }
    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        return this.isMyDamage(event)
    }
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        let amount = event.amount
        while(amount !== 0) {
            amount--
            let cards = (await new TakeCardOp(event.target, 2).perform(manager))
            this.playSound(manager, 2)
            manager.broadcast(new TextFlashEffect(this.playerId, [], this.id))
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.SPECIAL,
                specialId: this.id,
                hintMsg: `选择将${cards[0].toString()}/${cards[1].toString()}交给另一名角色, 或者取消自己拿`,
                forbidden: cards.map(c => c.id),
                extraButtons: [Button.CANCEL]
            })
            if(!resp.isCancel()){
                console.log('[遗计] 给了牌')
                let sent = resp.getCardsAtPos(CardPos.HAND)
                let target = resp.targets[0]
                await manager.transferCards(this.playerId, target.player.id, CardPos.HAND, CardPos.HAND, sent)
                if(sent.length < 2) {
                    console.log('[遗计] 继续询问')
                    let remain = cards.filter(c => c.id !== sent[0].id)[0]
                    let resp2 = await manager.sendHint(this.playerId, {
                        hintType: HintType.SPECIAL,
                        specialId: this.id,
                        hintMsg: `选择将${remain.toString()}交给另一名角色, 或者取消自己拿`,
                        forbidden: [remain.id],
                        extraButtons: [Button.CANCEL]
                    })
                    if(!resp2.isCancel()) {
                        console.log('[遗计] 又给了牌')
                        let sent = resp2.getCardsAtPos(CardPos.HAND)
                        let target = resp2.targets[0]
                        await manager.transferCards(this.playerId, target.player.id, CardPos.HAND, CardPos.HAND, sent)
                    }
                }
            }
        }
    }
}

/*
export class QiaoBian extends Skill<DamageOp> {

    displayName = '巧变'
    description = '你可以弃置一张手牌并跳过一个阶段：若跳过摸牌阶段，你可以获得至多两名角色的各一张手牌；若跳过出牌阶段，你可以移动场上的一张牌。'
}




export class XiaoGuo extends Skill<DamageOp> {

    displayName = '骁果'
    description = '其他角色的结束阶段，你可以弃置一张基本牌，然后除非该角色弃置一张装备牌，否则受到你造成的1点伤害。'
}


export class TunTian extends Skill<DamageOp> {

    displayName = '屯田'
    description = '当你于回合外失去牌后，你可以进行判定，若结果不为红桃，你可将此牌置于武将牌上，称为“田”；你计算与其他角色的距离-X（X为“田”的数量）。）'
}

export class ZiLiang extends Skill<DamageOp> {

    displayName = '资粮'
    description = '副将技，当与你势力相同的一名角色受到伤害后，你可以将一张“田”交给该角色。'
}

export class JiXi extends Skill<DamageOp> {

    displayName = '急袭'
    description = '主将技，此武将牌减少半个阴阳鱼；你可以将一张“田”当【顺手牵羊】使用。'
}

export class HuYuan extends Skill<DamageOp> {

    displayName = '护援'
    description = '结束阶段，你可以将一张装备牌置入一名角色的装备区，然后你可以弃置该角色距离为1的一名角色的一张牌。'
}

export class HeYi extends Skill<DamageOp> {

    displayName = '鹤翼'
    description = '阵法技，与你处于同一队列的其他角色拥有“飞影”。 [飞影] 锁定技，其他角色计算与你的距离+1。'
}

export class XunXun extends Skill<DamageOp> {

    displayName = '恂恂'
    description = '摸牌阶段开始时，你可以观看牌堆顶的四张牌，然后将其中的两张牌置于牌堆顶，将其余的牌置于牌堆底。'
}

export class WangXi extends Skill<DamageOp> {

    displayName = '忘隙'
    description = '当你造成或受到其他角色的1点伤害后，你可以与其各摸一张牌。'
}

export class HengJiang extends Skill<DamageOp> {

    displayName = '横江'
    description = '当你受到1点伤害后，你可以令当前回合角色本回合的手牌上限-1。然后若其弃牌阶段内没有弃牌，则你摸一张牌。'
}

export class XunYou extends Skill<DamageOp> {

    displayName = '奇策'
    description = '出牌阶段限一次，你可以将所有手牌当任意一张普通锦囊牌使用，你不能以此法使用目标数超过X的牌（X为你的手牌数），然后你可以变更一次副将。'
}

export class ZhiYu extends Skill<DamageOp> {

    displayName = '智愚'
    description = '当你受到伤害后，你可以摸一张牌，然后展示所有手牌，若颜色均相同，伤害来源弃置一张手牌。'
}
 */