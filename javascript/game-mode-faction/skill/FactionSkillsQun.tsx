import { Skill, HiddenType, SimpleConditionalSkill, EventRegistryForSkills, SkillTrigger, SimpleTrigger, SkillRepo, GeneralSkillStatusUpdate, SkillPosition } from "../../common/Skill";
import { playerActionDriverProvider } from "../../client/player-actions/PlayerActionDriverProvider";
import { CardSelectionResult, HintType } from "../../common/ServerHint";
import PlayerActionDriverDefiner from "../../client/player-actions/PlayerActionDriverDefiner";
import { UIPosition, Button } from "../../common/PlayerAction";
import { factionDiffers, factionsSame } from "../../common/General";
import FactionPlayerInfo from "../FactionPlayerInfo";
import { all, Suits, any, delay } from "../../common/util/Util";
import PlayerAct from "../../server/context/PlayerAct";
import GameManager from "../../server/GameManager";
import { DropCardRequest, DropOthersCardRequest, SelectACardAt } from "../../server/engine/DropCardOp";
import { CardPos } from "../../common/transit/CardPos";
import { PlayerInfo } from "../../common/PlayerInfo";
import TakeCardOp, { TakeCardStageOp } from "../../server/engine/TakeCardOp";
import AskSavingOp, { AskSavingAround } from "../../server/engine/AskSavingOp";
import HealOp from "../../server/engine/HealOp";
import { isSuitRed, isSuitBlack, deriveColor } from "../../common/cards/ICard"
import Card, { CardType, Color, Suit } from "../../common/cards/Card";
import { CardBeingUsedEvent, CardAwayEvent, CardBeingDroppedEvent, CardBeingTakenEvent, turnOver } from "../../server/engine/Generic";
import { SlashOP } from "../../server/engine/SlashOp";
import { Timeline, RuseOp, UseEventOperation } from "../../server/Operation";
import { JueDou, ShunShou, GuoHe, WuZhong, JieDao, HuoGong } from "../../server/engine/SingleRuseOp";
import { StageStartFlow, StageEndFlow, InStageStart } from "../../server/engine/StageFlows";
import { Stage } from "../../common/Stage";
import JudgeOp, { JudgeTimeline } from "../../server/engine/JudgeOp";
import DamageOp, { DamageSource, DamageType, DamageTimeline, EnterDyingEvent } from "../../server/engine/DamageOp";
import { UseDelayedRuseOp } from "../../server/engine/DelayedRuseOp";
import { DoTieSuo, MultiRuse, WanJian, NanMan, WuGu, TaoYuan, TieSuo } from "../../server/engine/MultiRuseOp";
import { YiYiDaiLao, ZhiJiZhiBi, YuanJiao } from "../FactionWarActionResolver";
import WineOp from "../../server/engine/WineOp";
import DeathOp, { DeathTimeline } from "../../server/engine/DeathOp";
import { SkillForDamageTaken } from "./FactionSkillsWei";
import {Faction} from '../../common/General'
import { DodgePlayed } from "../../server/engine/DodgeOp";
import { MaShu } from "./FactionSkillsShu";
import { getFactionsWithLeastMembers, getFactionMembers, getFactionIfRevealNow } from "../FactionWarUtil";
import { registerPeach } from "../../client/player-actions/PlayerActionDrivers";
import CardFightOp, { canCardFight } from "../../server/engine/CardFightOp";
import { EquipOp } from "../../server/engine/EquipOp";
import { GrabCard } from '../../server/engine/SingleRuseOp'
import FactionWarGeneral, { DUMMY_GENERAL_NAME, hasSub } from "../FactionWarGenerals";
import { getSiegeContext, removeGeneral } from "./FactionSkillsGeneric";
import { CardTransit } from "../../common/transit/EffectTransit";

/**
    [Q]华佗判定【闪电】后受到【闪电】的伤害时，是否可以发动【急救】技能?
    [A]不可以，因为华佗判定【闪电】即说明华佗处于自己回合内，不符合【急救】的发动条件。同理，华佗在自己回合内被【刚烈】或者【天香】等技能影响而进入濒死状态，也不能发动【急救】技能。
    [Q]华佗发动"除疠"，选择实力各不相同的角色时，是否包括自己?
    [A]不包括。即是说华佗最多可以弃置自己以及魏蜀吴群各一名角色，共五名角色的牌。
    [Q]华佗发动"除疠"选择了多名角色，弃牌的顺序如何?
    [A]先弃置自己的，然后按逆时针顺序依次弃置。最后，被弃置黑桃牌的角色各摸一张牌。
    [Q]华佗能否用装备区里的红色的牌来发动【急救】技能?
    [A]可以。
    [Q]华佗在自己回合外进入濒死状态时能否发动【急救】?
    [A]可以。
 */
export class ChuLi extends Skill {
    id = '除疠'
    displayName = '除疠'
    description = '出牌阶段限一次，你可以选择至多三名势力各不相同或未确定势力的其他角色，然后你弃置你和这些角色的各一张牌。被弃置黑桃牌的角色各摸一张牌。'
    hiddenType = HiddenType.NONE

    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('除疠')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>{
                            return !hint.roundStat.customData[this.id] && id === this.id
                        })
                        .expectChoose([UIPosition.PLAYER], 1, 3, (id, context, chosen)=>{
                            let dude = context.getPlayer(id) as FactionPlayerInfo
                            let existing = chosen.getArr(UIPosition.PLAYER).map(i => context.getPlayer(i).getFaction())
                            return id !== this.playerId && dude.hasOwnCards() && (!dude.isRevealed() || all(existing, f => factionDiffers(f, dude.getFaction())))
                        }, ()=>'(除疠)至多三名势力各不相同或未确定势力的其他角色')
                        .expectAnyButton('点击确定发动除疠')
                        .build(hint)
        })
    }

    public async onPlayerAction(act: PlayerAct, event: any, manager: GameManager) {
        
        manager.roundStats.customData[this.id] = true
        this.invokeEffects(manager, act.targets.map(t => t.player.id))
        //先弃置自己的
        let pplToTakeOneMore: PlayerInfo[] = []
        let req = new DropCardRequest()
        await req.perform(this.playerId, 1, manager, '(除疬)请弃一张牌', [UIPosition.MY_EQUIP, UIPosition.MY_HAND])
        let card = req.dropped[0]
        if(manager.interpret(this.playerId, card).suit === 'spade') {
            pplToTakeOneMore.push(act.source)
        }

        let targets = manager.context.sortFromPerspective(this.playerId, act.targets.map(p => p.player.id))
        let me = act.source
        for(let t of targets) {
            let cardAndPos = await new DropOthersCardRequest().perform(manager, me, t, `请弃置${t}的一张牌`, [CardPos.EQUIP, CardPos.HAND])
            if(manager.interpret(t.player.id, cardAndPos[0]).suit === 'spade') {
                pplToTakeOneMore.push(t)
            }
        }

        for(let t of pplToTakeOneMore) {
            await new TakeCardOp(t, 1).perform(manager)
        }
    }
}

export class JiJiu extends Skill {
    id = '急救'
    displayName = '急救'
    description = '你的回合外，你可以将一张红色牌当【桃】使用。'
    
    bootstrapClient() {
        registerPeach((definer, hint)=>{
            return definer.expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>{
                                return id === this.id && context.curr !== this.playerId
                            })
                            .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, (id, context)=>{
                                return isSuitRed(context.interpret(id).suit)
                            }, ()=>'(急救)将一张红色牌当【桃】使用')
        })
    }

    async onPlayerAction(act: PlayerAct, ask: AskSavingOp, manager: GameManager): Promise<void> {
        if(manager.currPlayer().player.id === this.playerId) {
            throw `急救只能在你的回合之外!!`
        }
        
        this.invokeEffects(manager, [ask.deadman.player.id])

        //金主爸爸!!
        let cardAndPos = act.getSingleCardAndPos()
        let card = cardAndPos[0];
        card.as = CardType.PEACH
        //桃, 或者酒
        let goodman = ask.goodman.player.id
        let deadman = ask.deadman.player.id
        card.description = `${goodman} 对 ${deadman} 使用 ${card.type.name}`                
        //桃牌扔进workflow
        manager.sendToWorkflow(goodman, cardAndPos[1], [card])
        await manager.events.publish(new CardBeingUsedEvent(goodman, [cardAndPos], card.type, true, false))
        await new HealOp(ask.goodman, ask.deadman, 1).perform(manager)
    }
}

class WuShuangSlash extends SimpleTrigger<SlashOP> {
    conditionFulfilled(slash: SlashOP, manager: GameManager): boolean {
        return slash.timeline === Timeline.AFTER_CONFIRMING_TARGET && slash.source.player.id === this.skill.playerId
    }
    async doInvoke(slash: SlashOP, manager: GameManager): Promise<void> {
        this.skill.invokeEffects(manager, [slash.getTarget().player.id])
        slash.dodgesRequired = 2
    }
}

class WuShuangJueDou extends SimpleTrigger<JueDou> {
    conditionFulfilled(jueDou: JueDou, manager: GameManager): boolean {
        return jueDou.timeline === Timeline.AFTER_BECOMING_TARGET && 
                (jueDou.source.player.id === this.skill.playerId || jueDou.getTarget().player.id === this.skill.playerId)
    }
    async doInvoke(jueDou: JueDou, manager: GameManager): Promise<void> {
        //override the decider
        jueDou.slashCountDecider = (source, target)=>{
            if(source.player.id === this.skill.playerId) {
                this.skill.invokeEffects(manager, [target.player.id])
                return 2
            }
            return 1
        }
    }
}

export class WuShuang extends Skill {
    id = '无双'
    displayName = '无双'
    description = '锁定技，你使用的【杀】需两张【闪】才能抵消；与你进行【决斗】的角色每次需打出两张【杀】。'
    isLocked = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<SlashOP>(SlashOP, new WuShuangSlash(this, manager))
        skillRegistry.on<JueDou>(JueDou, new WuShuangJueDou(this, manager))
    }
}

export class LiJian extends Skill {
    id = '离间'
    displayName = '离间'
    description = '出牌阶段限一次，你可以弃置一张牌并选择两名其他男性角色，然后令其中一名男性角色视为对另一名男性角色使用一张【决斗】。'
    hiddenType = HiddenType.NONE
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('离间')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>{
                            return id === this.id && !hint.roundStat.customData[this.id]
                        })
                        .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, (id, context)=>true, ()=>'(离间)弃置一张牌')
                        .expectChoose([UIPosition.PLAYER], 2, 2, (id, context)=>{
                            return id !== this.playerId && context.getPlayer(id).getGender() === 'M'
                        }, ()=>'(离间)选择两名其他男性角色(先选的对后选的出决斗)')
                        .expectAnyButton('点击确定发动离间')
                        .build(hint)
        })
    }

    async onPlayerAction(act: PlayerAct, ask: AskSavingOp, manager: GameManager): Promise<void> {
        
        this.invokeEffects(manager, act.targets.map(t => t.player.id))
        manager.roundStats.customData[this.id] = true
        act.dropCardsFromSource(`[${this.id}] 弃置`)
        await new JueDou(act.targets[0], act.targets[1], []).perform(manager)
    }
}

export class BiYue extends SimpleConditionalSkill<StageStartFlow> {
    id = '闭月'
    displayName = '闭月'
    description = '结束阶段，你可以摸一张牌。'
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
    }
    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        return event.isFor(this.playerId, Stage.ROUND_END)
    }
    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        this.invokeEffects(manager)
        await new TakeCardOp(manager.context.getPlayer(this.playerId), 1).perform(manager)
    }
}

export class ShuangXiong extends SimpleConditionalSkill<TakeCardStageOp> {
    id = '双雄'
    displayName = '双雄'
    description = '摸牌阶段，你可以改为进行判定，你获得生效后的判定牌，然后本回合你可以将与判定结果颜色不同的一张手牌当【决斗】使用。'

    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            let color = hint.roundStat.customData[this.id] as Color
            return new PlayerActionDriverDefiner('离间')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>{
                            return id === this.id && !!color
                        })
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>{
                            let suit = context.interpret(id).suit
                            return color === 'red' ? isSuitBlack(suit) : isSuitRed(suit)
                        }, ()=>`(双雄)使用一张${color === 'red'? '黑色' : '红色'}手牌作为决斗打出`)
                        .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>{
                            return id !== this.playerId
                        }, ()=>'(双雄)选择一名角色发动决斗')
                        .expectAnyButton('点击确定发动决斗')
                        .build(hint)
        })
    }

    async onPlayerAction(act: PlayerAct, ignore: any, manager: GameManager): Promise<void> {
        this.invokeEffects(manager, [act.targets[0].player.id])
        let card = act.getSingleCardAndPos()[0]
        card.as = CardType.JUE_DOU
        card.description = this.displayName

        manager.sendToWorkflow(act.source.player.id, CardPos.HAND, [card], true)
        await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, CardPos.HAND]], CardType.JUE_DOU, true))
        await new JueDou(act.source, act.targets[0], [card]).perform(manager)
    }

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<TakeCardStageOp>(TakeCardStageOp, this)
    }

    public conditionFulfilled(event: TakeCardStageOp, manager: GameManager): boolean {
        return event.player.player.id === this.playerId
    }

    public async doInvoke(event: TakeCardStageOp, manager: GameManager): Promise<void> {
        this.invokeEffects(manager)
        event.amount = -999
        let card = await new JudgeOp('双雄判定', this.playerId).perform(manager)
        await manager.takeFromWorkflow(this.playerId, CardPos.HAND, [card])
        manager.roundStats.customData[this.id] = deriveColor([manager.interpret(this.playerId, card).suit])
    }
}

export class WanSha extends SimpleConditionalSkill<AskSavingAround> {
    id = '完杀'
    displayName = '完杀'
    description = '锁定技，你的回合内，只有你和处于濒死状态的角色才能使用【桃】。'
    isLocked = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<AskSavingAround>(AskSavingAround, this)
    }

    public conditionFulfilled(event: AskSavingAround, manager: GameManager): boolean {
        return manager.currPlayer().player.id === this.playerId
    }

    public async doInvoke(event: AskSavingAround, manager: GameManager): Promise<void> {
        this.invokeEffects(manager, [event.deadman.player.id])
        event.toAsk = event.toAsk.filter(p => p.player.id === this.playerId || p.player.id === event.deadman.player.id)
    }
}

export class LuanWu extends Skill {
    id = '乱武'
    displayName = '乱武'
    description = '限定技，出牌阶段，你可以令所有其他角色除非对各自距离最小的另一名角色使用一张【杀】，否则失去1点体力。'
    hiddenType = HiddenType.NONE

    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('乱武')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>{
                            return id === this.id && context.getPlayer(this.playerId).signs['乱'].enabled
                        })
                        .expectAnyButton('点击确定发动乱武')
                        .build(hint)
        })
    }
    
    async onPlayerAction(act: PlayerAct, ignore: any, manager: GameManager): Promise<void> {
        
        this.invokeEffects(manager)
        act.source.signs['乱'].enabled = false
        manager.broadcast(act.source, PlayerInfo.sanitize)
        let toAsk = manager.getSortedByCurr(false)
        for(let t of toAsk) {
            if(t.isDead) {
                continue
            }
            let valid = manager.context.findingNearestNeighbors(t.player.id)
            console.log(`【乱武】离${t}最近的邻居为${valid}`)
            valid = valid.filter(p => {
                console.log(`【乱武】${t}能否砍到${p}? ${manager.context.computeDistance(t.player.id, p.player.id)} <= ${t.getReach()} ?`)
                return manager.context.computeDistance(t.player.id, p.player.id) <= t.getReach()
            })
            console.log(`离${t}最近的为${valid}`)
            let resp = await manager.sendHint(t.player.id, {
                hintType: HintType.PLAY_SLASH,
                hintMsg: `${this.playerId} 发动乱武, 你需要对离你距离最小的角色出杀`,
                forbidden: valid.map(v => v.player.id),
                extraButtons: [new Button(Button.CANCEL.id, '放弃')]
            })
            if(resp.isCancel()) {
                await new DamageOp(t, t, 1, [], DamageSource.SKILL, DamageType.ENERGY).perform(manager)
            } else {
                await manager.resolver.on(resp, manager)
            }
        }
    }

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        manager.context.getPlayer(this.playerId).signs['乱'] = {
            enabled: true,
            type: 'limit-skill',
            displayName: this.displayName,
            owner: this.position
        }
    }
}


class MultiRuseCancellor<T extends MultiRuse> implements SkillTrigger<T> {

    needRepeatedCheck = false

    constructor(private skill: Skill) {}

    getSkill(): Skill {
        return this.skill
    }

    invokeMsg(event: T, manager: GameManager): string {
        return '发动' + this.skill.displayName
    }

    conditionFulfilled(event: T, manager: GameManager): boolean {
        return event.timeline === Timeline.BECOME_TARGET && !!event.targets.find(t => t.player.id === this.getSkill().playerId) &&
                deriveColor(event.cards.map(c => manager.interpret(this.getSkill().playerId, c).suit)) === 'black'
    }

    public getSkillTriggerer(event: T, manager: GameManager): string {
        return this.skill.playerId
    }

    async doInvoke(event: T, manager: GameManager): Promise<void> {
        this.skill.invokeEffects(manager)
        event.targets.splice(event.targets.findIndex(t => t.player.id === this.getSkill().playerId), 1)
    }
}

export class WeiMu extends SimpleConditionalSkill<RuseOp<any>> {
    id = '帷幕'
    displayName = '帷幕'
    description = '锁定技，当你成为黑色锦囊牌的目标时，则取消之。'
    isLocked = true
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<ShunShou>(ShunShou, this)
        skillRegistry.on<GuoHe>(GuoHe, this)
        skillRegistry.on<JueDou>(JueDou, this)
        skillRegistry.on<JieDao>(JieDao, this)
        skillRegistry.on<ZhiJiZhiBi>(ZhiJiZhiBi, this)
        skillRegistry.on<YuanJiao>(YuanJiao, this)
        skillRegistry.on<UseDelayedRuseOp>(UseDelayedRuseOp, this)
        let cancellor = new MultiRuseCancellor(this)
        skillRegistry.on<DoTieSuo>(DoTieSuo, cancellor)
        skillRegistry.on<NanMan>(NanMan, cancellor)
        
        //below never would happen...
        skillRegistry.on<WuZhong>(WuZhong, this)
        skillRegistry.on<HuoGong>(HuoGong, this)
        skillRegistry.on<TaoYuan>(TaoYuan, cancellor)
        skillRegistry.on<WanJian>(WanJian, cancellor)
        skillRegistry.on<WuGu>(WuGu, cancellor)
        skillRegistry.on<YiYiDaiLao>(YiYiDaiLao, cancellor)
    }

    conditionFulfilled(event: RuseOp<any>, manager: GameManager): boolean {
        return event.timeline === Timeline.BECOME_TARGET && event.getTarget().player.id === this.playerId &&
                deriveColor(event.cards.map(c => manager.interpret(this.playerId, c).suit)) === 'black'
    }

    invokeMsg(event: RuseOp<any>, manager: GameManager) {
        return `发动帷幕使 ${event.ruseType.name} 对你无效`
    }

    async doInvoke(event: RuseOp<any>, manager: GameManager): Promise<void> {
        this.invokeEffects(manager, [], `${this.playerId} 发动了 ${this.displayName} 使 ${event.ruseType.name} 失效`)
        event.removeTarget(this.playerId)
    }
}

export class ZhenDu extends SimpleConditionalSkill<StageStartFlow> {
    
    id = '鸩毒'
    displayName = '鸩毒'
    description = '一名角色的出牌阶段开始时，你可以弃置一张手牌，然后该角色视为使用一张【酒】，若该角色不是你，你对其造成1点伤害。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
    }

    invokeMsg(event: StageStartFlow, manager: GameManager) {
        if(event.info.player.id !== this.playerId) {
            return `对${event.info}发动鸩毒, 对其造成一点伤害并视为其使用一张【酒】`
        }
        return `发动鸩毒弃置一张牌, 视为使用一张【酒】`
    }

    conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        return event.stage === Stage.USE_CARD && 
                manager.context.getPlayer(this.playerId).getCards(CardPos.HAND).length > 0 &&
                !manager.roundStats.skipStages.get(Stage.USE_CARD) //不能是要跳过出牌阶段的人
    }

    async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        let success = await new DropCardRequest().perform(this.playerId, 1, manager, '(鸩毒)弃置一张牌', [UIPosition.MY_HAND], true)
        if(!success) {
            return
        }
        this.invokeEffects(manager, [event.info.player.id])
        await new WineOp(event.info).perform(manager)
        if(event.info.player.id !== this.playerId) {
            await new DamageOp(manager.context.getPlayer(this.playerId), event.info, 1, [], DamageSource.SKILL).perform(manager)
        }
    }
}


export class QiLuan extends SimpleConditionalSkill<StageEndFlow> {
    
    id = '戚乱'
    displayName = '戚乱'
    description = '一名角色的回合结束时，你每杀死过一名其他角色，便摸三张牌；每有一名其他角色死亡(不是你杀死)，你摸一张牌。'
    bounty = 0

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<StageEndFlow>(StageEndFlow, this)
        skillRegistry.onEvent<DeathOp>(DeathOp, this.playerId, async(op)=>{
            if(op.timeline !== DeathTimeline.BEFORE_REVEAL) {
                return
            }
            if(op.killer && op.killer.player.id === this.playerId) {
                this.bounty += 3
            } else {
                this.bounty += 1
            }
        })
    }

    conditionFulfilled(event: StageEndFlow, manager: GameManager): boolean {
        return event.stage === Stage.ROUND_END && this.bounty > 0
    }

    async doInvoke(event: StageEndFlow, manager: GameManager): Promise<void> {
        await new TakeCardOp(manager.context.getPlayer(this.playerId), this.bounty).perform(manager)
        this.bounty = 0
    }
}

export class FuDi extends SkillForDamageTaken {
    
    id = '附敌'
    displayName = '附敌'
    description = '当你受到来自其他角色的伤害后，你可以交给伤害来源一张手牌。若如此做，你对与其势力相同的角色中体力值最多且不小于你的一名角色造成1点伤害。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
    }
    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        return this.isMyDamage(event) && this.damageFromOthers(event) && event.target.hasCardAt(CardPos.HAND) //&& this.triggerable(event, manager).length > 0
    }

    private getChoices(event: DamageOp, manager: GameManager): string[] {
        let fac = event.source.getFaction()
        let me = event.target
        let choices: string[]
        if(fac === Faction.UNKNOWN || fac === Faction.YE) {
            choices = event.source.hp >= me.hp? [event.source.player.id] : []
        } else {
            let maxHp = 0
            choices = []
            manager.context.playerInfos.forEach(p => {
                if(FactionPlayerInfo.factionSame(p, event.source) && p.hp >= me.hp) {
                    if(p.hp > maxHp) {
                        choices = [p.player.id]
                        maxHp = p.hp
                    } else if(p.hp === maxHp) {
                        choices.push(p.player.id)
                    }
                }
            })
        }
        return choices
    }

    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        let resp = await manager.sendHint(event.target.player.id, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg: `请选择一张手牌交给${event.source}`,
            quantity: 1,
            positions: [UIPosition.MY_HAND],
            extraButtons: [Button.CANCEL]
        })
        if(resp.isCancel()) {
            return
        }
        this.invokeEffects(manager, [event.source.player.id])
        let card = resp.getSingleCardAndPos()[0]
        manager.transferCards(this.playerId, event.source.player.id, CardPos.HAND, CardPos.HAND, [card])

        let victims = this.getChoices(event, manager)
        if(victims.length > 0) {
            let victim: PlayerInfo
            if(victims.length === 1) {
                victim = manager.context.getPlayer(victims[0])
            } else {
                let ask = await manager.sendHint(this.playerId, {
                    hintType: HintType.CHOOSE_PLAYER,
                    hintMsg: '[附敌] 请选择附敌要造成伤害的对象',
                    minQuantity: 1, quantity: 1,
                    forbidden: victims
                })
                victim = ask.targets[0]
            }
            await new DamageOp(event.target, victim, 1, [], DamageSource.SKILL).perform(manager)
        }
    }
}

export class CongJian extends SimpleConditionalSkill<DamageOp> {
    
    id = '从谏'
    displayName = '从谏'
    description = '锁定技，当你于回合外造成伤害时或于回合内受到伤害时，伤害值+1。'
    isLocked = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
    }

    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        //回合内受到伤害
        if(event.target.player.id === this.playerId && manager.currPlayer().player.id === this.playerId &&
                event.timeline === DamageTimeline.TAKING_DAMAGE) {
            return true
        }
        //回合外造成伤害
        if(event.source && event.source.player.id === this.playerId && 
            manager.currPlayer().player.id !== this.playerId && event.timeline === DamageTimeline.DOING_DAMAGE) {
            return true
        }
        return false
    }

    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        this.invokeEffects(manager, [event.target.player.id])
        event.amount += 1
    }
}

export class GuiDao extends SimpleConditionalSkill<JudgeOp> {

    id = '鬼道'
    displayName = '鬼道'
    description = '当一名角色的判定牌生效前，你可以打出一张黑色牌替换之。'
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<JudgeOp>(JudgeOp, this)
    }

    public conditionFulfilled(event: JudgeOp, manager: GameManager): boolean {
        return event.timeline === JudgeTimeline.CONFIRMING && manager.context.getPlayer(this.playerId).hasOwnCards()
    }

    public async doInvoke(event: JudgeOp, manager: GameManager): Promise<void> {
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg: `请选择要改变的判定牌`,
            quantity: 1,
            positions: [UIPosition.MY_HAND, UIPosition.MY_EQUIP],
            extraButtons: [Button.CANCEL],
            suits: ['club', 'spade']
        })
        if(!resp.isCancel()) {
            let cardAndPos = resp.getSingleCardAndPos()
            let card = cardAndPos[0], pos = cardAndPos[1]
            this.invokeEffects(manager, [event.owner], `${this.playerId} 发动 ${this.displayName} 将判定牌替换为 ${card}`)
            card.description = this.playerId + ' 鬼道改判定'
            manager.sendToWorkflow(this.playerId, pos, [card], false)
            await manager.events.publish(new CardBeingUsedEvent(this.playerId, [cardAndPos], null, true, false))
            await manager.takeFromWorkflow(this.playerId, CardPos.HAND, [event.judgeCard])
            event.judgeCard = card
        } else {
            console.log('[鬼道] 最终放弃了')
        }
    }
}

export class LeiJi extends SimpleConditionalSkill<DodgePlayed> {
    
    id = '雷击'
    displayName = '雷击'
    description = '当你使用或打出【闪】时，你可以令一名其他角色进行判定，若结果为黑桃，你对该角色造成2点雷电伤害。'
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DodgePlayed>(DodgePlayed, this)
    }

    public conditionFulfilled(event: DodgePlayed, manager: GameManager): boolean {
        return event.player === this.playerId
    }

    public async doInvoke(event: DodgePlayed, manager: GameManager): Promise<void> {
        let choice = await manager.sendHint(this.playerId, {
            hintType: HintType.CHOOSE_PLAYER,
            hintMsg: '选择雷击的对象',
            forbidden: [this.playerId],
            minQuantity: 1,
            quantity: 1,
            extraButtons: [Button.CANCEL]
        })
        if(choice.isCancel()){
            return
        }
        let target = choice.targets[0].player.id
        this.invokeEffects(manager, [target])
        let card = await new JudgeOp('雷击判定', target).perform(manager)
        let suit = manager.interpret(target, card).suit
        if(suit === 'spade') {
            await new DamageOp(manager.context.getPlayer(this.playerId), choice.targets[0], 2, [], DamageSource.SKILL, DamageType.THUNDER).perform(manager)
        } else {
            manager.log(`雷击判定为${Suits[suit]}, 失效`)
        }
    }
}

export class MaShuPang extends MaShu {
    id = '马术(庞)'
}

export class MaShuTeng extends MaShu {
    id = '马术(腾)'
}

export class JianChu extends SimpleConditionalSkill<SlashOP> {
    id = '鞬出'
    displayName = '鞬出'
    description = '当你使用【杀】指定一个目标后，你可以弃置其一张牌，若弃置的牌：是装备牌，该角色不能使用【闪】；不是装备牌，该角色获得此【杀】。'
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<SlashOP>(SlashOP, this)
    }

    public conditionFulfilled(event: SlashOP, manager: GameManager): boolean {
        return event.timeline === Timeline.AFTER_CONFIRMING_TARGET && event.source.player.id === this.playerId && 
                event.getTarget().player.id !== this.playerId && event.getTarget().hasOwnCards()
    }

    public invokeMsg(event: SlashOP, manager: GameManager){
        return `对${event.getTarget()}发动鞬出`
    }

    public async doInvoke(event: SlashOP, manager: GameManager): Promise<void> {
        let me = manager.context.getPlayer(this.playerId)
        let cardAndPos = await new DropOthersCardRequest().perform(manager, me, event.getTarget(), `${this.displayName}弃置对方一张牌`, [CardPos.HAND, CardPos.EQUIP])
        this.invokeEffects(manager, [event.getTarget().player.id])
        if(cardAndPos[0].type.isEquipment()) {
            event.undodegables.add(event.getTarget().player.id)
        } else {
            await manager.takeFromWorkflow(event.getTarget().player.id, CardPos.HAND, event.cards)
        }
    }
}

export class XiongYi extends Skill {
    
    id = '雄异'
    displayName = '雄异'
    description = '限定技，出牌阶段，你可以令与你势力相同的所有角色各摸三张牌，然后若你的势力是全场角色最少的势力，则你回复1点体力。'
    hiddenType = HiddenType.NONE

    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('雄异')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>{
                            return id === this.id && context.getPlayer(this.playerId).signs['雄'].enabled
                        })
                        .expectAnyButton('点击确定发动雄异')
                        .build(hint)
        })
    }
    
    async onPlayerAction(act: PlayerAct, ignore: any, manager: GameManager): Promise<void> {
        
        act.source.signs['雄'] = {
            enabled: false,
            type: 'limit-skill',
            displayName: this.displayName,
            owner: this.position
        }
        manager.broadcast(act.source, PlayerInfo.sanitize)
        let me = act.source
        let cardTakers: PlayerInfo[]
        if(me.getFaction() === Faction.YE) {
            //just me
            cardTakers = [me]
        } else {
            cardTakers = getFactionMembers(manager).getArr(me.getFaction())
        }
        let ts = cardTakers.map(c => c.player.id)
        this.invokeEffects(manager, ts)
        for(let p of cardTakers) {
            await new TakeCardOp(p, 3).perform(manager)
        }
        if(getFactionsWithLeastMembers(manager).has(me.getFaction()) && me.hp < me.maxHp) {
            await new HealOp(me, me, 1).perform(manager)
        }
    }

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        manager.context.getPlayer(this.playerId).signs['雄'] = {
            enabled: true,
            type: 'limit-skill',
            displayName: this.displayName,
            owner: this.position
        }
    }
}

export class LuanJi extends Skill {
    
    id = '乱击'
    displayName = '乱击'
    description = '你可以将两张手牌当【万箭齐发】使用（不能使用本回合此前发动此技能时已用过的花色）。若如此做，其他与你同势力角色使用【闪】响应此【万箭齐发】时，其可摸一张牌。'
    hiddenType = HiddenType.NONE

    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('乱击')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>{
                            return id === this.id
                        })
                        .expectChoose([UIPosition.MY_HAND], 2, 2, (id, context)=>{
                            let prev = hint.roundStat.customData[this.id] as Set<Suit>
                            if(!prev) {
                                //尚未发动过, 嗯
                                return true
                            }
                            return !prev.has(context.interpret(id).suit)
                        }, ()=>'(乱击)请选择两张手牌(不能使用本回合乱击用过的花色)')
                        .expectAnyButton('点击确定发动乱击')
                        .build(hint)
        })
    }
    
    async onPlayerAction(act: PlayerAct, ignore: any, manager: GameManager): Promise<void> {
        let prev: Set<Suit> = manager.roundStats.customData[this.id] || new Set<Suit>()
        let cards = act.getCardsAtPos(CardPos.HAND)
        cards.forEach(c => {
            c.as = CardType.WAN_JIAN,
            c.description = act.source + ' ' + this.displayName
            prev.add(manager.interpret(this.playerId, c).suit)
        })
        manager.roundStats.customData[this.id] = prev
        let targets = manager.getSortedByCurr(false)
        this.invokeEffects(manager, [], `${this.playerId} 用 ${cards} 发动了 ${this.displayName}`)
        manager.sendToWorkflow(this.playerId, CardPos.HAND, cards, true)
        await manager.events.publish(new CardBeingUsedEvent(this.playerId, cards.map(c => [c, CardPos.HAND]), CardType.WAN_JIAN, true))
        await new WanJian(cards, act.source, CardType.WAN_JIAN, targets).perform(manager)
    }
}


export class SiJian extends SimpleConditionalSkill<CardAwayEvent> {
    
    id = '死谏'
    displayName = '死谏'
    description = '当你失去最后的手牌时，你可以弃置一名其他角色的一张牌。'
    needRepeatedCheck = false
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<CardBeingDroppedEvent>(CardBeingDroppedEvent, this)
        skillRegistry.on<CardBeingTakenEvent>(CardBeingTakenEvent, this)
        skillRegistry.on<CardBeingUsedEvent>(CardBeingUsedEvent, this)
    }
    public conditionFulfilled(event: CardAwayEvent, manager: GameManager): boolean {
        if(event.player === this.playerId && manager.context.getPlayer(this.playerId).getCards(CardPos.HAND).length === 0) {
            if(any(event.cards, pair => pair[1] === CardPos.HAND)) {
                return true
            }
        }
        return false
    }
    public async doInvoke(event: CardAwayEvent, manager: GameManager): Promise<void> {
        let forbidden = manager.getOthers(this.playerId).filter(p => !p.hasOwnCards()).map(p => p.player.id)
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.CHOOSE_PLAYER,
            hintMsg: '选择死谏的对象(弃置其一张牌)',
            minQuantity: 1,
            quantity: 1,
            forbidden: [this.playerId, ...forbidden],
            extraButtons: [Button.CANCEL]
        })
        if(resp.isCancel()) {
            return
        }
        this.invokeEffects(manager, [resp.targets[0].player.id])
        await new DropOthersCardRequest().perform(manager, resp.source, resp.targets[0], `${this.displayName} 弃置对方一张牌`, [CardPos.HAND, CardPos.EQUIP])
    }

}

export class SuiShi extends Skill {

    id = '随势'
    displayName = '随势'
    description = '锁定技，当其他角色进入濒死状态时，若伤害来源与你势力相同，你摸一张牌；当其他角色死亡时，若其与你势力相同，你失去1点体力。'
    needRepeatedCheck = false
    isLocked = true
    
    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<EnterDyingEvent>(EnterDyingEvent, new SuiShiDying(this, manager))
        skillRegistry.on<DeathOp>(DeathOp, new SuiShiDeath(this, manager))
    }
}

export class SuiShiDying extends SimpleTrigger<EnterDyingEvent> {

    conditionFulfilled(event: EnterDyingEvent, manager: GameManager): boolean {
        if(event.damage.target.player.id !== this.skill.playerId && event.damage.source && event.damage.type !== DamageType.ENERGY) {
            let hisFac = event.damage.source.getFaction()
            let meFac = this.player.getFaction()
            return factionsSame(hisFac, meFac)
        }
        return false
    }
    async doInvoke(event: EnterDyingEvent, manager: GameManager): Promise<void> {
        this.skill.invokeEffects(manager)
        await new TakeCardOp(this.player, 1).perform(manager)
    }
    invokeMsg(event: EnterDyingEvent, manager: GameManager): string {
        return '发动' + this.getSkill().displayName + '获得一张牌'
    }
}

export class SuiShiDeath extends SimpleTrigger<DeathOp> {
    
    conditionFulfilled(event: DeathOp, manager: GameManager): boolean {
        if(event.deceased.player.id !== this.skill.playerId && event.timeline === DeathTimeline.IN_DEATH) {
            let hisFac = event.deceased.getFaction()
            let meFac = this.player.getFaction()
            return factionsSame(hisFac, meFac)
        }
        return false
    }
    async doInvoke(event: DeathOp, manager: GameManager): Promise<void> {
        this.skill.invokeEffects(manager)
        await new DamageOp(this.player, this.player, 1, [], DamageSource.SKILL, DamageType.ENERGY).perform(manager)
    }
    invokeMsg(event: DeathOp, manager: GameManager): string {
        return '发动' + this.getSkill().displayName + '失去一点体力'
    }
}


export class XiongSuan extends Skill {

    id = '凶算'
    displayName = '凶算'
    description = '限定技，出牌阶段，你可以弃置一张手牌并选择与你势力相同的一名角色，对其造成1点伤害，' + 
                '然后你摸三张牌。若该角色有已发动的限定技，则你选择其一个限定技，此回合结束时视为该限定技未发动过。'

    toRestore: [PlayerInfo, string] = null
    
    bootstrapClient() {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('凶算')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>{
                            return id === this.id && context.getPlayer(this.playerId).signs['凶'].enabled
                        })
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id)=>true, ()=>'(凶算)选择一张手牌弃置')
                        .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>{
                            if(id === this.playerId) {
                                return true
                            }
                            let me = context.getPlayer(this.playerId).getFaction()
                            let dude = context.getPlayer(id).getFaction()
                            return factionsSame(me, dude)
                        }, ()=>'(凶算)选择一名势力与你相同的角色,对其造成一点伤害,本回合后恢复其一个限定技')
                        .expectAnyButton('点击确定发动凶算')
                        .build(hint)
        })
    }
    
    async onPlayerAction(act: PlayerAct, ignore: any, manager: GameManager): Promise<void> {
        
        act.source.signs['凶'].enabled = false
        manager.broadcast(act.source, PlayerInfo.sanitize)
        this.invokeEffects(manager, [act.targets[0].player.id])

        await act.dropCardsFromSource('凶算弃置')
        await new DamageOp(act.source, act.targets[0], 1, [], DamageSource.SKILL).perform(manager)
        if(act.source.isDead) {
            console.log('[凶算] 把自己整死了...')
            return
        }
        await new TakeCardOp(act.source, 3).perform(manager)

        let choices: Button[] = []
        for(let k of Object.keys(act.targets[0].signs)) {
            let sign = act.targets[0].signs[k]
            if(sign.type === 'limit-skill' && !sign.enabled) {
                choices.push(new Button(k, sign.displayName))
            }
        }
        if(choices.length > 0) {
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.MULTI_CHOICE,
                hintMsg: `(凶算) 请选择 ${act.targets[0]} 未发动过的技能`,
                extraButtons: choices
            })
            this.toRestore = [act.targets[0], resp.button]
        }
    }

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        manager.context.getPlayer(this.playerId).signs['凶'] = {
            enabled: true,
            type: 'limit-skill',
            displayName: this.displayName,
            owner: this.position
        }
        skillRegistry.onEvent<StageEndFlow>(StageEndFlow, this.playerId, async (flow) => {
            if(flow.info.player.id === this.playerId && this.toRestore) {
                //restore limited skills
                let sign = this.toRestore[0].signs[this.toRestore[1]]
                sign.enabled = true
                manager.broadcast(this.toRestore[0], PlayerInfo.sanitize)
                manager.log(`(凶算) ${this.toRestore[0]} 的限定技 ${sign.displayName} 视为未发动`)
            }
        })
    }
}


// export class ShiBei extends SkillForDamageTaken {
    
//     id = '矢北'
//     displayName = '矢北'
//     description = '锁定技，当你受到伤害后：若此伤害是你本回合第一次受到伤害，则你回复1点体力；若不是你本回合第一次受到伤害，则你失去1点体力。'
//     isLocked = true
//     hasTakenDamageThisRound = false

//     public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
//         skillRegistry.on<DamageOp>(DamageOp, this)
//         skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async(event)=>{
//             if(event.stage === Stage.ROUND_BEGIN) {
//                 this.hasTakenDamageThisRound = false
//             }
//         })
//     }
//     public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
//         return this.isMyDamage(event)
//     }
//     public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
//         this.invokeEffects(manager)
//         let me = manager.context.getPlayer(this.playerId)
//         if(this.hasTakenDamageThisRound) {
//             await new DamageOp(me, me, 1, [], DamageSource.SKILL, DamageType.ENERGY).perform(manager)
//         } else {
//             this.hasTakenDamageThisRound = true
//             await new HealOp(me, me, 1).perform(manager)
//         }
//     }
// }


// export class JianYing extends SimpleConditionalSkill<CardBeingUsedEvent> {
    
//     id = '渐营'
//     displayName = '渐营'
//     description = '当你于出牌阶段内使用牌时，若此牌与你于此阶段内使用的上一张牌点数或花色相同，则你可以摸一张牌。'
//     lastSuit: Suit
//     lastSize: number

//     public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
//         skillRegistry.on<CardBeingUsedEvent>(CardBeingUsedEvent, this)
//         skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async(event)=>{
//             if(event.stage === Stage.ROUND_BEGIN) {
//                 this.lastSuit = null
//                 this.lastSize = -1
//             }
//         })
//     }

//     public conditionFulfilled(event: CardBeingUsedEvent, manager: GameManager): boolean {
//         if(manager.currEffect.player === this.playerId && manager.currEffect.stage === Stage.USE_CARD &&
//                 event.player === this.playerId && event.cards.length === 1) {
//             let res = false, card = event.cards[0][0]
//             if(card.suit === this.lastSuit || event.cards[0][0].size.size === this.lastSize) {
//                 res = true
//             }
//             this.lastSize = card.size.size
//             this.lastSuit = card.suit
//             return res
//         }
//         return false
//     }

//     public async doInvoke(event: CardBeingUsedEvent, manager: GameManager): Promise<void> {
//         this.invokeEffects(manager)
//         await new TakeCardOp(manager.context.getPlayer(this.playerId), 1).perform(manager)
//     }
// }

// export class FengLue extends SimpleConditionalSkill<StageStartFlow> {
    
//     id = '锋略'
//     displayName = '锋略'
//     description = '出牌阶段开始时，你可以与一名角色拼点，若你赢，该角色将其区域内的各一张牌交给你(手牌,装备,判定)；若你没赢，你交给其一张牌。拼点结算后你可以令其获得你拼点的牌。'

//     public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
//         skillRegistry.on<StageStartFlow>(StageStartFlow, this)
//     }

//     public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
//         return event.isFor(this.playerId, Stage.USE_CARD) && 
//                 manager.context.getPlayer(this.playerId).getCards(CardPos.HAND).length > 0 &&
//                 !manager.roundStats.skipStages.get(Stage.USE_CARD)
//     }

//     public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
//         let forbidden = manager.getSortedByCurr(false).filter(p => p.getCards(CardPos.HAND).length === 0).map(p => p.player.id)
//         let resp = await manager.sendHint(this.playerId, {
//             hintType: HintType.CHOOSE_PLAYER,
//             hintMsg: '请选择锋略拼点的对象',
//             minQuantity: 1, quantity: 1,
//             forbidden: [this.playerId, ...forbidden],
//             extraButtons: [Button.CANCEL]
//         })
//         if(resp.isCancel()) {
//             return
//         }
//         let target = resp.targets[0]
//         let me = manager.context.getPlayer(this.playerId)
//         this.invokeEffects(manager, [target.player.id])
//         let fight = new CardFightOp(me, target, this.displayName)
//         let success = await fight.perform(manager)
//         if(success) {
//             for(let pos of [CardPos.HAND, CardPos.EQUIP, CardPos.JUDGE]) {
//                 let c = await SelectACardAt(manager, target, target, `(锋略)请选择一张牌交给${me}`, pos)
//                 if(c) {
//                     manager.log(`(锋略) ${target} 交给了 ${me} ${isCardPosHidden(c[1])? '一张手牌' : c[0]}`)
//                     await manager.transferCards(target.player.id, me.player.id, pos, CardPos.HAND, [c[0]])
//                 }
//             }
//         } else {
//             let c = await SelectACardAt(manager, me, me, `(锋略)请选择一张牌交给${target}`, CardPos.HAND, CardPos.EQUIP)
//             if(c) {
//                 manager.log(`(锋略) ${me} 交给了 ${target} ${isCardPosHidden(c[1])? '一张手牌' : c[0]}`)
//                 await manager.transferCards(me.player.id, target.player.id, c[1], CardPos.HAND, [c[0]])
//             }
//         }
//         let letHimTake = await manager.sendHint(this.playerId, {
//             hintType: HintType.MULTI_CHOICE,
//             hintMsg: `是否令${target}获得你的拼点牌${fight.initiatorCard}?`,
//             extraButtons: [Button.OK, Button.CANCEL]
//         })
//         if(letHimTake.button === Button.OK.id) {
//             manager.log(`(锋略) ${target} 获得了 ${me} 的拼点牌 ${fight.initiatorCard}`)
//             await manager.takeFromWorkflow(target.player.id, CardPos.HAND, [fight.initiatorCard])
//         }
//     }
// }

// export class MouShi extends Skill {
    
//     id = '谋识'
//     displayName = '谋识'
//     description = '出牌阶段限一次，你可以将一张手牌交给一名角色，若如此做，当其于其下回合的出牌阶段内对一名角色造成伤害后，若是此阶段其第一次对该角色造成伤害，你摸一张牌。'
//     hiddenType = HiddenType.NONE
    
//     target: string
//     inTargetRound = false
//     damageDone: Set<PlayerInfo> = new Set<PlayerInfo>()

//     bootstrapClient() {
//         playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
//             return new PlayerActionDriverDefiner('谋识')
//                         .expectChoose([UIPosition.MY_SKILL], 1, 1, (id)=>{
//                             return id === this.id && !hint.roundStat.customData[this.id]
//                         })
//                         .expectChoose([UIPosition.MY_HAND], 1, 1, ()=>true, ()=>'(谋识)选择一张手牌')
//                         .expectChoose([UIPosition.PLAYER], 1, 1, (id)=>id !== this.playerId, ()=>'(谋识)选择一名角色交予此手牌')
//                         .expectAnyButton('点击确定发动谋识')
//                         .build(hint)
//         })
//     }
    
//     async onPlayerAction(act: PlayerAct, ignore: any, manager: GameManager): Promise<void> {
//         manager.roundStats.customData[this.id] = true
//         this.target = act.targets[0].player.id
//         this.invokeEffects(manager, [this.target])
//         await manager.transferCards(this.playerId, this.target, CardPos.HAND, CardPos.HAND, [act.getSingleCardAndPos()[0]])
//         this.damageDone.clear()
//     }
    
//     public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
//         skillRegistry.onEvent<DamageOp>(DamageOp, this.playerId, async (event)=>{
//             if(event.source && event.source.player.id === this.target && event.timeline === DamageTimeline.DID_DAMAGE && this.inTargetRound) {
//                 if(!this.damageDone.has(event.target)) {
//                     this.damageDone.add(event.target)
//                     this.invokeEffects(manager, [this.target])
//                     await new TakeCardOp(manager.context.getPlayer(this.playerId), 1).perform(manager)
//                 }
//             }
//         })
//         skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async (flow)=>{
//             if(flow.isFor(this.target, Stage.USE_CARD)) {
//                 this.inTargetRound = true
//             } else {
//                 this.inTargetRound = false
//             }
//         })
//         skillRegistry.onEvent<StageEndFlow>(StageEndFlow, this.playerId, async (flow)=>{
//             if(flow.isFor(this.target, Stage.USE_CARD)) {
//                 this.target = null
//                 this.inTargetRound = false
//             }
//         })
//     }
// }

export class KuangFu extends SimpleConditionalSkill<DamageOp> {
    
    id = '狂斧'
    displayName = '狂斧'
    description = '当你使用【杀】对目标角色造成伤害后，你可以将其装备区里的一张牌置入你的装备区或弃置之。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
    }
    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        if(event.source && event.source.player.id === this.playerId && event.target.player.id !== this.playerId && 
            event.timeline === DamageTimeline.DID_DAMAGE &&
            event.damageSource === DamageSource.SLASH && event.target.getCards(CardPos.EQUIP).length > 0) {
            return true
        }
        return false
    }
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        //选择一张装备牌
        let card = (await SelectACardAt(manager, event.source, event.target, '(狂斧)选择对方一张装备牌', CardPos.EQUIP))[0]
        //选择弃置还是拿过来
        let choices = [new Button('take', '装备之'), new Button('drop', '弃置之')]
        if(event.source.findCardAt(CardPos.EQUIP, card.type.genre)) {
            choices[0].disable()
        }
        let choice = await manager.sendHint(this.playerId, {
            hintType: HintType.MULTI_CHOICE,
            hintMsg: '(狂斧)选择弃置还是获得' + card,
            extraButtons: choices
        })
        this.invokeEffects(manager, [event.target.player.id])
        if(choice.button === 'take') {
            await new EquipOp(event.source, card, CardPos.EQUIP, event.target).perform(manager)
        } else {
            manager.log(`${event.source} 弃置了 ${event.target} 的 ${card}`)
            card.description = `${event.target} 被弃置`
            manager.sendToWorkflow(event.target.player.id, CardPos.EQUIP, [card])
            await manager.events.publish(new CardBeingDroppedEvent(event.target.player.id, [[card, CardPos.EQUIP]]))
        }
    }
}

export class DuanChange extends SimpleConditionalSkill<DeathOp> {
    
    id = '断肠'
    displayName = '断肠'
    description = '锁定技，当你死亡时，你令杀死你的角色失去一张武将牌的所有技能。'
    isLocked = true
    skillRepo: SkillRepo

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager, repo: SkillRepo): void {
        skillRegistry.on<DeathOp>(DeathOp, this)
        this.skillRepo = repo
    }

    public conditionFulfilled(event: DeathOp, manager: GameManager): boolean {
        if(event.deceased.player.id === this.playerId && event.timeline === DeathTimeline.IN_DEATH && event.killer) {
            return true
        }
        return false
    }

    public async doInvoke(event: DeathOp, manager: GameManager): Promise<void> {
        this.invokeEffects(manager, [event.killer.player.id])
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.MULTI_CHOICE,
            hintMsg: `请选择令${event.killer}失去哪一张武将牌的技能`,
            extraButtons: [new Button('main', '主将的技能'), new Button('sub', '副将的技能')]
        })
        let position = resp.button
        //set isGone = true so client side does not have them any more
        for(let s of this.skillRepo.getSkills(event.killer.player.id)) {
            if(s.position === position) {
                s.isGone = true
                s.onRemoval(manager.context)
            }
        }

        //disable the abilities
        await manager.events.publish(new GeneralSkillStatusUpdate(this.displayName, event.killer as FactionPlayerInfo, position as SkillPosition, false, true))
    }
}

// 注: 存嗣获得的勇决是不会失去的
export class BeiGe extends SimpleConditionalSkill<DamageOp> {
    
    id = '悲歌'
    displayName = '悲歌'
    description = '当一名角色受到【杀】造成的伤害后，你可以弃置一张牌，然后令其进行判定，若结果为：红桃，其回复1点体力；方块，其摸两张牌；梅花，伤害来源弃置两张牌；黑桃，伤害来源翻面。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
    }

    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        if(event.damageSource === DamageSource.SLASH && event.timeline === DamageTimeline.TAKEN_DAMAGE &&
            manager.context.getPlayer(this.playerId).hasOwnCards()) {
            return true
        }
        return false
    }

    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        let resp = await new DropCardRequest().perform(this.playerId, 1, manager, '(悲歌)请弃置一张牌', [UIPosition.MY_HAND, UIPosition.MY_EQUIP], false)
        if(!resp) {
            console.error('??????')
            return
        }
        this.invokeEffects(manager, [event.target.player.id])
        let card = await new JudgeOp(this.displayName + ' 判定', event.target.player.id).perform(manager)
        let icard = manager.interpret(event.target.player.id, card)
        if(icard.suit === 'heart') {
            await new HealOp(event.target, event.target, 1).perform(manager)
        } else if (icard.suit === 'diamond') {
            await new TakeCardOp(event.target, 2).perform(manager)
        } else if (icard.suit === 'club') {
            if(event.source.hasOwnCards()) {
                await new DropCardRequest().perform(event.source.player.id, 2, manager, '(悲歌)请弃置两张牌', [UIPosition.MY_HAND, UIPosition.MY_EQUIP], false)
            }
        } else {
            await turnOver(manager.context.getPlayer(this.playerId), event.source, this.displayName, manager)
        }
    }
}

export class HengZheng extends SimpleConditionalSkill<StageStartFlow> {

    id = '横征'
    displayName = '横征'
    description = '摸牌阶段，若你的体力值为1或你没有手牌，则你可以改为获得每名其他角色区域里的一张牌。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
    }

    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        if(event.isFor(this.playerId, Stage.TAKE_CARD) && !manager.roundStats.skipStages.get(Stage.TAKE_CARD)) {
            let me = manager.context.getPlayer(this.playerId)
            return me.hp === 1 || !me.hasCardAt(CardPos.HAND)
        }
        return false
    }

    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        let targets = manager.getSortedByCurr(false).filter(p => p.hasCards())
        manager.roundStats.skipStages.set(Stage.TAKE_CARD, true)
        this.invokeEffects(manager, targets.map(t => t.player.id))
        for(let target of targets) {
            await GrabCard(event.info, target, `${this.displayName} > ${target}`, manager, [CardPos.HAND, CardPos.EQUIP, CardPos.JUDGE])
        }
    }
}

export class BaoLing extends SimpleConditionalSkill<StageEndFlow> {
    
    id = '暴凌'
    displayName = '暴凌'
    description = '主将技，锁定技，出牌阶段结束时，若你有副将，则你移除副将，然后加3点体力上限，回复3点体力，并获得“崩坏”。'
    isLocked = true
    disabledForSub = true
    skillRepo: SkillRepo

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager, skillRepo: SkillRepo): void {
        skillRegistry.on<StageEndFlow>(StageEndFlow, this)
        this.skillRepo = skillRepo
    }

    public conditionFulfilled(event: StageEndFlow, manager: GameManager): boolean {
        if(event.isFor(this.playerId, Stage.USE_CARD)) {
            let me = manager.context.getPlayer(this.playerId) as FactionPlayerInfo
            return hasSub(me)
        }
        return false
    }

    public async doInvoke(event: StageEndFlow, manager: GameManager): Promise<void> {
        this.invokeEffects(manager)

        let me = manager.context.getPlayer(this.playerId)
        me.maxHp += 3
        me.hp += 3

        await removeGeneral(manager, this.skillRepo, this.playerId, false)

        console.log(`[${this.id}] 获得技能'崩坏'`)
        let myNew = new BengHuai(this.playerId)
        myNew.isRevealed = true
        myNew.position = 'main'
        this.skillRepo.addSkill(this.playerId, myNew)
        manager.send(this.playerId, myNew.toStatus())
    }
}

export class BengHuai extends SimpleConditionalSkill<StageStartFlow> {
    
    id = '崩坏'
    displayName = '崩坏'
    description = '锁定技，结束阶段，若你不是体力值最小的角色，你失去1点体力或减1点体力上限。'
    hiddenType = HiddenType.NONE
    isLocked = true
    disabledForMain = true
    disabledForSub = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<StageStartFlow>(StageStartFlow, this)
    }

    public conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        if(event.isFor(this.playerId, Stage.ROUND_END)) {
            let others = manager.getSortedByCurr(false).map(p => p.hp)
            let meHp = manager.context.getPlayer(this.playerId).hp
            if(Math.min(...others) < meHp) {
                return true
            }
        }
        return false
    }

    public async doInvoke(event: StageStartFlow, manager: GameManager): Promise<void> {
        let buttons = [new Button('hp', '失去一点体力'), new Button('maxHp', '减1点体力上限')]
        if(event.info.maxHp <= 1) {
            buttons[1].disable()
        }
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.MULTI_CHOICE,
            hintMsg: `请选择崩坏的效果`,
            extraButtons: buttons
        })
        this.invokeEffects(manager)
        let me = manager.context.getPlayer(this.playerId)
        if(resp.button === 'hp') {
            await new DamageOp(me, me, 1, [], DamageSource.SKILL, DamageType.ENERGY).perform(manager)
        } else {
            me.changeMax(-1)
            manager.broadcast(me, PlayerInfo.sanitize)
        }
    }
}


export class MingShi extends SimpleConditionalSkill<DamageOp> {
    
    id = '名士'
    displayName = '名士'
    description = '锁定技，当你受到伤害时，若伤害来源有暗置的武将牌，此伤害-1。'
    isLocked = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
    }

    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        let source: FactionPlayerInfo = event.source as FactionPlayerInfo
        return source && !(source.isGeneralRevealed && source.isSubGeneralRevealed) && event.target.player.id === this.playerId
                 && event.timeline === DamageTimeline.TAKING_DAMAGE 
                 && event.type !== DamageType.ENERGY
    }

    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        this.invokeEffects(manager, [event.target.player.id])
        //此伤害-1。
        event.amount -= 1
    }
}

export class LiRang extends SimpleConditionalSkill<CardBeingDroppedEvent> {
    
    id = '礼让'
    displayName = '礼让'
    description = '当你的牌因弃置而置入弃牌堆时，你可以将其中的任意张牌交给其他角色。'

    public bootstrapClient() {
        playerActionDriverProvider.registerSpecial(this.id, (hint)=>{
            let cards = new Set<string>(hint.forbidden)
            return new PlayerActionDriverDefiner('礼让')
                    .expectChoose([UIPosition.MY_HAND], 1, 2, (id, context)=>cards.has(id), ()=>hint.hintMsg) 
                    .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>id !== this.playerId,   //不能是自己
                                    ()=>'选择将牌交给的对象')
                    .expectAnyButton('点击确认将牌交给指定对象')
                    .build(hint, [Button.OK])
        })
    }

    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<CardBeingDroppedEvent>(CardBeingDroppedEvent, this)
    }

    public conditionFulfilled(event: CardBeingDroppedEvent, manager: GameManager): boolean {
        return event.isCardFrom(this.playerId)
    }

    public async doInvoke(event: CardBeingDroppedEvent, manager: GameManager): Promise<void> {
        //要扔的牌
        let cards = event.cards.map(c => c[0]).filter(c => manager.stillInWorkflow(c))
        console.log('[礼让] 弃置了牌', cards)
        let me = manager.context.getPlayer(this.playerId)        
        //只给孔融认为自己牌拿到了手
        manager.send(me.player.id, CardTransit.fromWorkflow(me.player.id, CardPos.HAND, cards))
        // await manager.takeFromWorkflow(this.playerId, CardPos.HAND, cards)

        let aborted = false
        while(cards.length > 0 && !aborted) {
            let resp = await manager.sendHint(this.playerId, {
                hintType: HintType.SPECIAL,
                specialId: this.id,
                hintMsg: `选择将弃置的牌交给另一名角色`,
                forbidden: cards.map(c => c.id),
                extraButtons: [Button.CANCEL]
            })
            if(!resp.isCancel()){
                //选卡然后选人
                this.invokeEffects(manager, [resp.targets[0].player.id])
                let sent = resp.getCardsAtPos(CardPos.HAND)
                let target = resp.targets[0]
                cards = cards.filter(c => sent.findIndex(s => s.id === c.id) < 0)
                //从手中拿掉
                manager.send(me.player.id, CardTransit.toWorkflow(me.player.id, CardPos.HAND, sent, false, false))
                await delay(300)
                //然后正式发出
                await manager.takeFromWorkflow(target.player.id, CardPos.HAND, sent)
            } else {
                aborted = true
            }
        }

        if(cards.length > 0) {
            //剩下的扔掉
            manager.send(me.player.id, CardTransit.toWorkflow(me.player.id, CardPos.HAND, cards, false, false))
        }
    }
}

export class ShuangRen extends SimpleConditionalSkill<InStageStart> {
    
    id = '双刃'
    displayName = '双刃'
    description = '出牌阶段开始时，你可以与一名角色拼点。若你赢，你视为对其或与其势力相同的另一名角色使用一张【杀】；若你没赢，你结束出牌阶段。'

    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<InStageStart>(InStageStart, this)
    }

    public conditionFulfilled(event: InStageStart, manager: GameManager): boolean {
        return event.isFor(this.playerId, Stage.USE_CARD)
    }
    
    public async doInvoke(event: InStageStart, manager: GameManager): Promise<void> {
        //选择一个有手牌的人
        let forbidden = manager.context.playerInfos.filter(p => !canCardFight(p.player.id, this.playerId, manager))
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.CHOOSE_PLAYER,
            hintMsg: '请选择发动双刃拼点的对象',
            forbidden: forbidden.map(f => f.player.id),
            minQuantity: 1,
            quantity: 1,
            extraButtons: [Button.CANCEL]
        })
        if(resp.isCancel()) {
            return
        }

        let me = manager.context.getPlayer(this.playerId), target = resp.targets[0] as FactionPlayerInfo
        this.invokeEffects(manager, [target.player.id])
        let success = await new CardFightOp(me, target, this.displayName).perform(manager)
        if(success) {
            let toSlash: PlayerInfo = target
            //查看是否需要选择出杀的对象
            if(target.isRevealed()) {
                let candidates: PlayerInfo[] = []
                let notToSlash: PlayerInfo[] = manager.context.playerInfos.filter(p => {
                    let pl = p as FactionPlayerInfo
                    if(pl.isDead || pl.player.id === this.playerId) {
                        return true
                    }
                    if(pl.isRevealed() && factionDiffers(target.getFaction(), pl.getFaction())) {
                        return true
                    }
                    candidates.push(pl)
                    return false
                })
                if(candidates.length === 1) {
                    toSlash = candidates[0]
                } else {
                    let ask = await manager.sendHint(this.playerId, {
                        hintType: HintType.CHOOSE_PLAYER,
                        hintMsg: '请选择发动双刃出杀的对象',
                        forbidden: notToSlash.map(f => f.player.id),
                        minQuantity: 1,
                        quantity: 1
                    })
                    toSlash = ask.targets[0]
                }
            }
            
            this.invokeEffects(manager, [toSlash.player.id])
            await new SlashOP(manager.context.getPlayer(this.playerId), [toSlash], [], 1, DamageType.NORMAL, 'n.a.').perform(manager)
        } else {
            event.endStage = true
        }
    }
}


export class ChuanXin extends SimpleConditionalSkill<DamageOp> {

    id = '穿心'
    displayName = '穿心'
    description = `当你于出牌阶段内使用【杀】或【决斗】对目标角色造成伤害时，若其与你势力不同且有副将，你可以防止此伤害。若如此做，该角色选择一项：1.弃置装备区里的所有牌，若如此做，其失去1点体力；2.移除副将。`
    skillRepo: SkillRepo

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager, repo: SkillRepo): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
        this.skillRepo = repo
    }

    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        let t = event.target as FactionPlayerInfo
        return (event.damageSource === DamageSource.DUEL || event.damageSource === DamageSource.SLASH) &&
            event.source && event.source.player.id === this.playerId && manager.currPlayer().player.id === this.playerId &&
            manager.currEffect.stage === Stage.USE_CARD && event.timeline === DamageTimeline.DOING_DAMAGE &&
            t.isRevealed() && factionDiffers(getFactionIfRevealNow(event.source, manager), t.getFaction()) &&
            hasSub(t)
    }
    
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        event.amount = -999
        let choices = [new Button('drop', '弃置装备区里的所有牌，然后失去1点体力'), new Button('remove', '移除你的副将')]
        if(!event.target.hasCardAt(CardPos.EQUIP)) {
            choices[0].disable()
        }
        this.invokeEffects(manager, [event.target.player.id])
        let ask = await manager.sendHint(event.target.player.id, {
            hintType: HintType.MULTI_CHOICE,
            hintMsg: '你受到穿心之痛, 请选择',
            extraButtons: choices
        })
        if(ask.button === 'drop') {
            let equips = event.target.getCards(CardPos.EQUIP).slice()
            equips.forEach(e => e.description = `${event.target} 穿心弃置`)
            console.log('[穿心] 弃置装备', equips.map(e => e.toString()))
            manager.sendToWorkflow(event.target.player.id, CardPos.EQUIP, equips, false)
            let toDrop: Array<[Card, CardPos]> = equips.map(e => {return [e, CardPos.EQUIP]})
            await manager.events.publish(new CardBeingDroppedEvent(event.target.player.id, toDrop))
            await new DamageOp(event.target, event.target, 1, [], DamageSource.SKILL, DamageType.ENERGY).perform(manager)
        } else {
            await removeGeneral(manager, this.skillRepo, event.target.player.id, false)
        }
    }
}


export class FengShi extends SimpleConditionalSkill<SlashOP> {

    id = '锋矢'
    displayName = '锋矢'
    description = `阵法技，在同一个围攻关系中，若你是围攻角色，则你或另一名围攻角色使用【杀】指定被围攻角色为目标后，可令该角色弃置装备区里的一张牌。`
    skillRepo: SkillRepo

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager, repo: SkillRepo): void {
        skillRegistry.on<SlashOP>(SlashOP, this)
    }

    public conditionFulfilled(event: SlashOP, manager: GameManager): boolean {
        if(event.targets.length > 1) {
            return false
        }
        let siegeContext = getSiegeContext(event.getTarget().player.id, this.playerId, manager.context)
        return event.timeline === Timeline.AFTER_CONFIRMING_TARGET && event.getTarget().hasCardAt(CardPos.EQUIP) &&
            siegeContext && (siegeContext.siegers[0] === this.playerId || siegeContext.siegers[1] === this.playerId)
    }
    
    public async doInvoke(event: SlashOP, manager: GameManager): Promise<void> {
        await new DropCardRequest().perform(event.getTarget().player.id, 1, manager, `${this.playerId} 发动锋矢令你弃置一张装备`, [UIPosition.MY_EQUIP])
    }
}


class QianHuanTrigger implements SkillTrigger<UseEventOperation<any>> {
    needRepeatedCheck: boolean = false
    
    constructor(private skill: QianHuan) {
        
    }

    public getSkillTriggerer(event: UseEventOperation<any>, manager: GameManager): string {
        return this.skill.playerId
    }
    getSkill(): Skill {
        return this.skill
    }
    invokeMsg(event: UseEventOperation<any>, manager: GameManager): string {
        return `发动千幻抵消${event.whatIsThis}对${event.targets[0]}的效果`
    }
    conditionFulfilled(event: UseEventOperation<any>, manager: GameManager): boolean {
        if(event.targets.length !== 1 || event.timeline !== Timeline.BECOME_TARGET) {
            return false
        }
        let t = event.getTarget() as FactionPlayerInfo
        let me = manager.context.getPlayer(this.skill.playerId)
        let pos = this.skill.position === 'main'? CardPos.ON_GENERAL: CardPos.ON_SUB_GENERAL
        return t.isRevealed() && factionsSame(t.getFaction(), getFactionIfRevealNow(me, manager)) && me.getCards(pos).length > 0
    }
    async doInvoke(event: UseEventOperation<any>, manager: GameManager): Promise<void> {
        let me = manager.context.getPlayer(this.skill.playerId)
        let pos = this.skill.position === 'main'? CardPos.ON_GENERAL: CardPos.ON_SUB_GENERAL
        let cards = me.getCards(pos)
        //询问移除哪张千幻牌
        let resp = await manager.sendHint(this.skill.playerId, {
            hintType: HintType.UI_PANEL,
            hintMsg: '请选择使用哪一张幻',
            customRequest: {
                data: {
                    rowsOfCard: {
                        '幻': cards
                    },
                    title: '千幻',
                    chooseSize: 1
                },
                mode: 'choose'
            }
        })
        let res = resp.customData as CardSelectionResult
        let card = cards[res[0].idx]

        //移除之
        manager.sendToWorkflow(this.skill.playerId, pos, [card], false)
        this.skill.invokeEffects(manager)
        this.skill.allowedSuits.add(manager.interpret(this.skill.playerId, card).suit)

        //取消目标
        event.removeTarget(event.getTarget().player.id)
        return
    }
    
}

export class QianHuan extends SimpleConditionalSkill<DamageOp> {
    
    id = '千幻'
    displayName = '千幻'
    description = '当与你势力相同的一名角色受到伤害后，你可以将一张与你武将牌上花色均不同的牌置于你的武将牌上。当一名与你势力相同的角色成为基本牌或锦囊牌的唯一目标时，你可以移去一张“千幻”牌，取消之。'
    allowedSuits = new Set<Suit>(['club', 'heart', 'diamond', 'spade'])

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager, repo: SkillRepo): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
        let remover = new QianHuanTrigger(this)
        skillRegistry.on<UseEventOperation<any>>(WanJian, remover)
        skillRegistry.on<UseEventOperation<any>>(NanMan, remover)
        skillRegistry.on<UseEventOperation<any>>(WuGu, remover)
        skillRegistry.on<UseEventOperation<any>>(TaoYuan, remover)
        skillRegistry.on<UseEventOperation<any>>(TieSuo, remover)

        skillRegistry.on<UseEventOperation<any>>(YiYiDaiLao, remover)
        skillRegistry.on<UseEventOperation<any>>(ZhiJiZhiBi, remover)
        skillRegistry.on<UseEventOperation<any>>(YuanJiao, remover)
        skillRegistry.on<UseEventOperation<any>>(JueDou, remover)
        skillRegistry.on<UseEventOperation<any>>(HuoGong, remover)
        skillRegistry.on<UseEventOperation<any>>(JieDao, remover)

        skillRegistry.on<UseEventOperation<any>>(GuoHe, remover)
        skillRegistry.on<UseEventOperation<any>>(ShunShou, remover)

        skillRegistry.on<UseEventOperation<any>>(UseDelayedRuseOp, remover)

        skillRegistry.on<UseEventOperation<any>>(SlashOP, remover)
        //todo: 桃, 酒
        // skillRegistry.on<UseEventOperation<any>>(WuZhong, remover)
        // skillRegistry.on<UseEventOperation<any>>(SlashOP, remover)
    }

    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        if(event.timeline !== DamageTimeline.TAKEN_DAMAGE) {
            return false
        }
        let t = event.target as FactionPlayerInfo
        let me = manager.context.getPlayer(this.playerId)
        return t.isRevealed() && factionsSame(t.getFaction(), getFactionIfRevealNow(me, manager)) && me.hasOwnCards()
    }
    
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        //选择一张花色与已有的不同的
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg: '[千幻] 请选择放置于武将牌上作为\'幻\'的牌',
            quantity: 1,
            positions: [UIPosition.MY_HAND, UIPosition.MY_EQUIP],
            extraButtons: [Button.CANCEL],
            suits: [...this.allowedSuits]
        })

        //先发给workflow让大家看看
        if(resp.isCancel()) {
            return
        }

        let cardAndPos = resp.getSingleCardAndPos()
        cardAndPos[0].description = '幻'
        manager.sendToWorkflow(this.playerId, cardAndPos[1], [cardAndPos[0]], false)
        this.invokeEffects(manager)
        this.allowedSuits.delete(manager.interpret(this.playerId, cardAndPos[0]).suit)
        await manager.takeFromWorkflow(this.playerId, this.position === 'main'? CardPos.ON_GENERAL: CardPos.ON_SUB_GENERAL, [cardAndPos[0]])
    }

}

// 祸水 出牌阶段，你可以明置此武将牌；你的回合内，其他角色不能明置其武将牌。
// 倾城 出牌阶段，你可以弃置一张黑色牌并选择一名武将牌均明置的其他角色，然后你暗置其一张武将牌。然后若你以此法弃置的牌是黑色装备牌，则你可以再选择另一名武将牌均明置的其他角色，暗置其一张武将牌。


