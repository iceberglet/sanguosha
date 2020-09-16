import { Skill, HiddenType, SimpleConditionalSkill, EventRegistryForSkills, SkillTrigger } from "./Skill";
import { playerActionDriverProvider } from "../../client/player-actions/PlayerActionDriverProvider";
import { HintType } from "../../common/ServerHint";
import PlayerActionDriverDefiner from "../../client/player-actions/PlayerActionDriverDefiner";
import { UIPosition, Button } from "../../common/PlayerAction";
import { factionDiffers, factionsSame } from "../../common/General";
import FactionPlayerInfo from "../FactionPlayerInfo";
import { all } from "../../common/util/Util";
import PlayerAct from "../../server/context/PlayerAct";
import GameManager from "../../server/GameManager";
import { DropCardRequest, DropOthersCardRequest } from "../../server/engine/DropCardOp";
import { CardPos } from "../../common/transit/CardPos";
import { PlayerInfo } from "../../common/PlayerInfo";
import TakeCardOp, { TakeCardStageOp } from "../../server/engine/TakeCardOp";
import AskSavingOp, { AskSavingAround } from "../../server/engine/AskSavingOp";
import HealOp from "../../server/engine/HealOp";
import { isSuitRed, isSuitBlack, deriveColor } from "../../common/cards/ICard"
import { CardType, Color } from "../../common/cards/Card";
import { CardBeingUsedEvent } from "../../server/engine/Generic";
import { SlashCompute } from "../../server/engine/SlashOp";
import { Timeline, RuseOp } from "../../server/Operation";
import { JueDou, ShunShou, GuoHe, WuZhong, JieDao, HuoGong } from "../../server/engine/SingleRuseOp";
import { StageStartFlow, StageEndFlow } from "../../server/engine/StageFlows";
import { Stage } from "../../common/Stage";
import JudgeOp from "../../server/engine/JudgeOp";
import { DamageSource, DamageType, DamageTimeline } from "../../server/engine/DamageOp";
import { UseDelayedRuseOp } from "../../server/engine/DelayedRuseOp";
import { DoTieSuo, MultiRuse, WanJian, NanMan, WuGu, TaoYuan } from "../../server/engine/MultiRuseOp";
import { YiYiDaiLao, ZhiJiZhiBi, YuanJiao } from "../FactionWarActionResolver";
import WineOp from "../../server/engine/WineOp";
import DeathOp from "../../server/engine/DeathOp";
import { SkillForDamageTaken } from "./FactionSkillsWei";
import {Faction} from '../../common/General'
import DamageOp from "../../server/engine/DamageOp";

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
        await this.revealMySelfIfNeeded(manager)
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
        playerActionDriverProvider.registerProvider(HintType.PEACH, (hint)=>{
            return new PlayerActionDriverDefiner('急救')
                        .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>{
                            return id === this.id && context.curr !== this.playerId
                        })
                        .expectChoose([UIPosition.MY_HAND, UIPosition.MY_EQUIP], 1, 1, (id, context)=>{
                            return isSuitRed(context.interpret(id).suit)
                        }, ()=>'(急救)将一张红色牌当【桃】使用')
                        .expectAnyButton('点击确定发动急救')
                        .build(hint)
        })
    }

    async onPlayerAction(act: PlayerAct, ask: AskSavingOp, manager: GameManager): Promise<void> {
        if(manager.currPlayer().player.id === this.playerId) {
            throw `急救只能在你的回合之外!!`
        }
        await this.revealMySelfIfNeeded(manager)
        this.invokeEffects(manager, [ask.deadman.player.id])

        //金主爸爸!!
        let card = act.getSingleCardAndPos()[0];
        card.as = CardType.PEACH
        //桃, 或者酒
        let goodman = ask.goodman.player.id
        let deadman = ask.deadman.player.id
        card.description = `${goodman} 对 ${deadman} 使用 ${card.type.name}`                
        //桃牌扔进workflow
        manager.sendToWorkflow(goodman, CardPos.HAND, [card])
        await manager.events.publish(new CardBeingUsedEvent(goodman, [[card, CardPos.HAND]], card.type, false, false))
        await new HealOp(ask.goodman, ask.deadman, 1).perform(manager)
    }
}

export class WuShuang extends Skill {
    id = '无双'
    displayName = '无双'
    description = '锁定技，你使用的【杀】需两张【闪】才能抵消；与你进行【决斗】的角色每次需打出两张【杀】。'
    isLocked = true

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        skillRegistry.onEvent<SlashCompute>(SlashCompute, this.playerId, async(slash) => {
            if(!this.isDisabled && this.isRevealed && slash.timeline === Timeline.AFTER_BECOMING_TARGET && 
                slash.source.player.id === this.playerId) {
                this.invokeEffects(manager, [slash.target.player.id])
                slash.dodgeRequired = 2
            }
        })
        skillRegistry.onEvent<JueDou>(JueDou, this.playerId, async(jueDou) => {
            if(!this.isDisabled && this.isRevealed && jueDou.timeline === Timeline.AFTER_BECOMING_TARGET) {
                //override the decider
                jueDou.slashCountDecider = (source, target)=>{
                    if(source.player.id === this.playerId) {
                        this.invokeEffects(manager, [target.player.id])
                        return 2
                    }
                    return 1
                }
            }
        })
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
        await this.revealMySelfIfNeeded(manager)
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
        manager.takeFromWorkflow(this.playerId, CardPos.HAND, [card])
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
        event.toAsk.filter(p => p.player.id === this.playerId || p.player.id === event.deadman.player.id)
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
        await this.revealMySelfIfNeeded(manager)
        this.invokeEffects(manager)
        act.source.signs['乱'] = {
            enabled: false,
            owner: this.isMain? 'main' : 'sub'
        }
        manager.broadcast(act.source, PlayerInfo.sanitize)
        let toAsk = manager.getSortedByCurr(false)
        for(let t of toAsk) {
            let valid = manager.context.findingNearestNeighbors(t.player.id)
            console.log(`离${t}最近的为${valid.map(i => i.player.id)}`)
            let resp = await manager.sendHint(t.player.id, {
                hintType: HintType.PLAY_SLASH,
                hintMsg: `${this.playerId} 发动乱武, 你需要对离你距离最小的角色出杀`,
                forbidden: valid.map(v => v.player.id),
                extraButtons: [new Button(Button.CANCEL.id, '放弃')]
            })
            if(resp.isCancel()) {
                await new DamageOp(act.source, t, 1, [], DamageSource.SKILL, DamageType.ENERGY).perform(manager)
            } else {
                await manager.resolver.on(resp, manager)
            }
        }
    }

    public bootstrapServer(skillRegistry: EventRegistryForSkills, manager: GameManager): void {
        manager.context.getPlayer(this.playerId).signs['乱'] = {
            enabled: true,
            owner: this.isMain? 'main' : 'sub'
        }
    }
}


class MultiRuseCancellor<T extends MultiRuse> implements SkillTrigger<T> {

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
        return event.timeline === Timeline.BECOME_TARGET && event.target.player.id === this.playerId &&
                deriveColor(event.cards.map(c => manager.interpret(this.playerId, c).suit)) === 'black'
    }

    async doInvoke(event: RuseOp<any>, manager: GameManager): Promise<void> {
        this.invokeEffects(manager)
        event.abort = true
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
        return `对${event.info}发动鸩毒`
    }

    conditionFulfilled(event: StageStartFlow, manager: GameManager): boolean {
        return event.stage === Stage.USE_CARD && manager.context.getPlayer(this.playerId).getCards(CardPos.HAND).length > 0
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
        skillRegistry.onEvent<StageStartFlow>(StageStartFlow, this.playerId, async(op)=>{
            if(op.stage === Stage.ROUND_BEGIN) {
                this.bounty = 0
            }
        })
        skillRegistry.onEvent<DeathOp>(DeathOp, this.playerId, async(op)=>{
            if(op.killer.player.id === this.playerId) {
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
    description = '当你受到伤害后，你可以交给伤害来源一张手牌。若如此做，你对与其势力相同的角色中体力值最多且不小于你的一名角色造成1点伤害。'

    bootstrapClient() {
        playerActionDriverProvider.registerSpecial(this.id, (hint, context)=>{
            return new PlayerActionDriverDefiner('附敌')
                        .expectChoose([UIPosition.MY_HAND], 1, 1, (id, context)=>true, ()=>'(附敌)选择一张手牌交给对方')
                        .expectChoose([UIPosition.PLAYER], 1, 1, (id, context)=>{
                            return !!hint.forbidden.find(c => c === id)
                        }, ()=>`(附敌)选择与${hint.sourcePlayer}势力相同的一名角色`)
                        .expectAnyButton('点击确定发动附敌')
                        .build(hint, [Button.OK])
        })
    }
    public bootstrapServer(skillRegistry: EventRegistryForSkills): void {
        skillRegistry.on<DamageOp>(DamageOp, this)
    }
    public conditionFulfilled(event: DamageOp, manager: GameManager): boolean {
        return this.isMyDamage(event) && this.damageFromOthers(event) && this.triggerable(event, manager).length > 0
    }

    private triggerable(event: DamageOp, manager: GameManager): string[] {
        let fac = event.source.getFaction()
        let me = event.target
        let choices: string[]
        if(fac === Faction.UNKNOWN || fac === Faction.YE) {
            choices = event.source.hp >= me.hp? [event.source.player.id] : []
        } else {
            let maxHp = 0
            choices = []
            manager.context.playerInfos.forEach(p => {
                if(factionsSame(p.getFaction(), fac) && p.hp >= me.hp) {
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
        let resp = await manager.sendHint(this.playerId, {
            hintType: HintType.SPECIAL,
            specialId: this.id,
            hintMsg: '(附敌)选择一张手牌交给对方',
            sourcePlayer: event.source.player.id,
            forbidden: this.triggerable(event, manager),
            extraButtons: [Button.CANCEL]
        })
        if(resp.isCancel()) {
            return
        }
        this.invokeEffects(manager, [event.source.player.id])
        let card = resp.getSingleCardAndPos()[0]
        manager.transferCards(this.playerId, event.source.player.id, CardPos.HAND, CardPos.HAND, [card])
        await new DamageOp(event.target, event.source, 1, [], DamageSource.SKILL).perform(manager)
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
        return event.source && event.source.player.id === this.playerId && 
            manager.currPlayer().player.id !== this.playerId && event.timeline === DamageTimeline.DOING_DAMAGE
    }
    public async doInvoke(event: DamageOp, manager: GameManager): Promise<void> {
        this.invokeEffects(manager, [event.target.player.id])
        event.amount += 1
    }
}

// 乱击 你可以将两张手牌当【万箭齐发】使用（不能使用本回合此前发动此技能时已用过的花色）。若如此做，其他与你同势力角色使用【闪】响应此【万箭齐发】时，其可摸一张牌。

// 马术 出牌阶段，你可以明置此武将牌；你计算与其他角色的距离-1。
// 鞬出 当你使用【杀】指定一个目标后，你可以弃置其一张牌，若弃置的牌：是装备牌，该角色不能使用【闪】；不是装备牌，该角色获得此【杀】。

// 雷击 当你使用或打出【闪】时，你可以令一名其他角色进行判定，若结果为黑桃，你对该角色造成2点雷电伤害。
// 鬼道 当一名角色的判定牌生效前，你可以打出一张黑色牌替换之。

// 悲歌 当一名角色受到【杀】造成的伤害后，你可以弃置一张牌，然后令其进行判定，若结果为：红桃，其回复1点体力；方块，其摸两张牌；梅花，伤害来源弃置两张牌；黑桃，伤害来源翻面。

// 注: 存嗣获得的勇决是不会失去的
// 
// 断肠 锁定技，当你死亡时，你令杀死你的角色失去一张武将牌的所有技能。

// 马术 出牌阶段，你可以明置此武将牌；你计算与其他角色的距离-1。
// 雄异 限定技，出牌阶段，你可以令与你势力相同的所有角色各摸三张牌，然后若你的势力是全场角色最少的势力，则你回复1点体力。

// 名士 锁定技，当你受到伤害时，若伤害来源有暗置的武将牌，此伤害-1。
// 礼让 当你的牌因弃置而置入弃牌堆时，你可以将其中的任意张牌交给其他角色。
// 双刃 出牌阶段开始时，你可以与一名角色拼点。若你赢，你视为对其或与其势力相同的另一名角色使用一张【杀】；若你没赢，你结束出牌阶段。
// 死谏 当你失去最后的手牌时，你可以弃置一名其他角色的一张牌。
// 随势 锁定技，当其他角色进入濒死状态时，若伤害来源与你势力相同，你摸一张牌；当其他角色死亡时，若其与你势力相同，你失去1点体力。

// 狂斧 当你使用【杀】对目标角色造成伤害后，你可以将其装备区里的一张牌置入你的装备区或弃置之。
// 祸水 出牌阶段，你可以明置此武将牌；你的回合内，其他角色不能明置其武将牌。
// 倾城 出牌阶段，你可以弃置一张黑色牌并选择一名武将牌均明置的其他角色，然后你暗置其一张武将牌。然后若你以此法弃置的牌是黑色装备牌，则你可以再选择另一名武将牌均明置的其他角色，暗置其一张武将牌。

// 千幻 当与你势力相同的一名角色受到伤害后，你可以将一张与你武将牌上花色均不同的牌置于你的武将牌上。当一名与你势力相同的角色成为基本牌或锦囊牌的唯一目标时，你可以移去一张“千幻”牌，取消之。
// 横征 摸牌阶段，若你的体力值为1或你没有手牌，则你可以改为获得每名其他角色区域里的一张牌。
// 暴凌 主将技，锁定技，出牌阶段结束时，若你有副将，则你移除副将，然后加3点体力上限，回复3点体力，并获得“崩坏”。
// 崩坏 锁定技，结束阶段，若你不是体力值最小的角色，你失去1点体力或减1点体力上限。

// 穿心 可预亮,当你于出牌阶段内使用【杀】或【决斗】对目标角色造成伤害时，若其与你势力不同且有副将，你可以防止此伤害。若如此做，该角色选择一项：1.弃置装备区里的所有牌，若如此做，其失去1点体力；2.移除副将。
// 锋矢 阵法技，在同一个围攻关系中，若你是围攻角色，则你或另一名围攻角色使用【杀】指定被围攻角色为目标后，可令该角色弃置装备区里的一张牌。


// 凶算 限定技，出牌阶段，你可以弃置一张手牌并选择与你势力相同的一名角色，对其造成1点伤害，然后你摸三张牌。若该角色有已发动的限定技，则你选择其一个限定技，此回合结束时视为该限定技未发动过。
