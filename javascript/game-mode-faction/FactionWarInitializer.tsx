import { Initializer } from "../common/GameMode";
import GameManager from "../server/GameManager";
import { EquipOp } from "../server/engine/EquipOp";
import { CardBeingDroppedEvent, CardBeingPlayedEvent, CardBeingTakenEvent, CardBeingUsedEvent, CardAwayEvent } from "../server/flows/Generic";
import { Equipment, CiXiong, QingGang, GuanShi, GuDing, ZhuQue, HanBing, Qilin, LianNu, RenWang, TengJia, BaGua, BaiYin } from "../server/engine/Equipments";
import { CardPos } from "../common/transit/CardPos";
import { CardType } from "../common/cards/Card";
import FactionPlayerInfo from "./FactionPlayerInfo";
import { PlayerInfo } from "../common/PlayerInfo";
import DamageOp, { DamageSource, DamageTimeline } from "../server/flows/DamageOp";
import { HintType } from "../common/ServerHint";
import { Button, isCancel, getFromAction, UIPosition } from "../common/PlayerAction";
import { StageStartFlow } from "../server/flows/StageFlows";
import { Faction, factionsSame } from "../common/General";
import { Stage } from "../common/Stage";
import DeathOp from "../server/flows/DeathOp";
import GameEnding from "../server/GameEnding";
import TakeCardOp from "../server/flows/TakeCardOp";

export default class FactionWarInitializer implements Initializer {

    playerAndEquipments = new Map<string, Equipment>()

    init(manager: GameManager) : void {
        manager.equipmentRegistry.onGeneral<EquipOp>(EquipOp, async (equipOp)=>{
            //register equipments
            if(equipOp.card.type.isHorse()) {
                return //no need to do this for horses
            }
            let type = equipOp.card.type.name
            let equip: Equipment
            switch(type) {
                case CardType.CI_XIONG.name: equip = new CiXiong(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.QING_GANG.name: equip = new QingGang(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.ZHU_QUE.name: equip = new ZhuQue(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.GU_DING.name: equip = new GuDing(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.GUAN_SHI.name: equip = new GuanShi(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.LIAN_NU.name: equip = new LianNu(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.HAN_BING.name: equip = new HanBing(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.QI_LIN.name: equip = new Qilin(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.WU_LIU.name: equip = new WuLiu(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.SAN_JIAN.name: equip = new SanJian(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.ZHANG_BA.name: 
                    //丈八的效果仅限于玩家主动施放
                    return


                case CardType.SILVER_LION.name: equip = new BaiYin(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.REN_WANG.name: equip = new RenWang(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.TENG_JIA.name: equip = new TengJia(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                case CardType.BA_GUA.name: equip = new BaGua(equipOp.beneficiary, equipOp.card.id, manager)
                    break
                default:
                    throw 'Unknown equipment!!! ' + type
            }

            console.log(`[装备] ${equipOp.beneficiary} 装备了 ${equipOp.card.id}`)
            this.playerAndEquipments.set(equipOp.card.id, equip)
            await equip.onEquipped()
        })

        manager.equipmentRegistry.onGeneral<CardBeingDroppedEvent>(CardBeingDroppedEvent, this.checkEquipmentDrop)
        manager.equipmentRegistry.onGeneral<CardBeingPlayedEvent>(CardBeingPlayedEvent, this.checkEquipmentDrop)
        manager.equipmentRegistry.onGeneral<CardBeingTakenEvent>(CardBeingTakenEvent, this.checkEquipmentDrop)
        manager.equipmentRegistry.onGeneral<CardBeingUsedEvent>(CardBeingUsedEvent, this.checkEquipmentDrop)

        //勉強用這個吧...
        manager.skillRegistry.onGeneral<StageStartFlow>(StageStartFlow, async (start)=>{
            if(start.stage !== Stage.ROUND_BEGIN) {
                return
            }
            let p = start.info as FactionPlayerInfo
            let choices: Button[] = []
            if(!p.isGeneralRevealed) {
                choices.push(new Button('general', '明置主将'))
            }
            if(!p.isSubGeneralRevealed) {
                choices.push(new Button('subgeneral', '明置副将'))
            }
            if(!p.isGeneralRevealed && !p.isSubGeneralRevealed) {
                choices.push(new Button('all', '全部明置'))
            }
            if(choices.length === 0) {
                return //nothing more to do
            }
            let resp = await manager.sendHint(p.player.id, {
                hintType: HintType.MULTI_CHOICE,
                hintMsg: '回合开始, 你是否要明置武将?',
                extraButtons: [...choices, Button.CANCEL]
            })
            if(isCancel(resp)) {
                return
            }
            let choice = getFromAction(resp, UIPosition.BUTTONS)[0]
            let wasRevealed = p.isRevealed()
            if(choice === 'general') {
                p.isGeneralRevealed = true
            } else if (choice === 'subgeneral') {
                p.isSubGeneralRevealed = true
            } else if (choice === 'all') {
                p.isGeneralRevealed = true
                p.isSubGeneralRevealed = true
            }
            let isRevealed = p.isRevealed()
            if(!wasRevealed && isRevealed) {
                this.revealPlayer(p, manager)
            }
            manager.broadcast(p as PlayerInfo, PlayerInfo.sanitize)
        })

        manager.skillRegistry.onGeneral<DeathOp>(DeathOp, async (death)=>{
            let deceased = death.deceased as FactionPlayerInfo
            let killer = death.killer as FactionPlayerInfo
            if(!deceased.isRevealed()) {
                console.log(`[牌局] ${deceased.player.id} 未亮明身份, 强行翻开`)
                deceased.isDead = true
                //亮明
                deceased.isGeneralRevealed = true
                deceased.isSubGeneralRevealed = true
                this.revealPlayer(deceased, manager)
            }

            this.checkGameEndingCondition(deceased, manager)

            //奖惩
            if(!killer) {
                console.log('[牌局] 天谴死亡, 不计奖惩...')
                return
            }
            if(!killer.isRevealed()) {
                console.log(`[牌局] ${killer.player.id} 未亮明身份不来奖惩`)
                return
            }
            if(killer.getFaction() === Faction.YE) {
                console.log(`[牌局] ${killer.player.id} 野人杀人拿三张`)
                await new TakeCardOp(killer, 3).perform(manager)
            }
            if(factionsSame(killer.getFaction(), deceased.getFaction())) {
                //打了自己人... 弃牌吧...
                console.log(`[牌局] ${killer.player.id} 杀死了阵营相同的 ${deceased.player.id} 弃置所有牌`)

                let equips = killer.getCards(CardPos.EQUIP).map(c => {
                    c.description = `${killer.player.id} 杀害队友被弃置`
                    return c
                })
                manager.sendToWorkflow(killer.player.id, CardPos.EQUIP, equips)
                await manager.events.publish(new CardBeingDroppedEvent(killer.player.id, equips.map(e => [e, CardPos.EQUIP])))

                let hands = killer.getCards(CardPos.HAND).map(c => {
                    c.description = `${killer.player.id} 杀害队友被弃置`
                    return c
                })
                manager.sendToWorkflow(killer.player.id, CardPos.HAND, hands)
                await manager.events.publish(new CardBeingDroppedEvent(killer.player.id, hands.map(e => [e, CardPos.HAND])))

            } else {
                let reward = manager.getSortedByCurr(true)
                                    .filter(p => p !== deceased)
                                    .filter(p => factionsSame(p.getFaction(), deceased.getFaction()))
                                    .length + 1
                console.log(`[牌局] ${killer.player.id} 杀死了阵营不同的 ${deceased.player.id} 获得 ${reward} 张牌`)
                await new TakeCardOp(killer, reward).perform(manager)
            }
        })
    }

    checkEquipmentDrop = async (dropEvent: CardAwayEvent): Promise<void> =>{
        //unregister equipments
        for(let d of dropEvent.cards) {
            if(d[1] === CardPos.EQUIP && !d[0].type.isHorse()) {
                console.log(`[装备] ${dropEvent.player} 卸下了 ${d[0].id}`)
                if(!this.playerAndEquipments.has(d[0].id)) {
                    console.warn('Missing equipment... not registered (这是丈八?) ' + d[0].id)
                    continue
                }
                await this.playerAndEquipments.get(d[0].id).onDropped()
            }
        }
    }

    revealPlayer(p: FactionPlayerInfo, manager: GameManager) {
        console.log(`[牌局] ${p.player.id} 身份亮明`)
        //身份要确认
        let numberOfFriends = manager.context.playerInfos
                            // .filter(pp => (pp as FactionPlayerInfo).isRevealed())
                            .filter(pp => pp.getFaction().name === p.getFaction().name)
                            .length
        //若场上势力相同的加上你已经超过了全体玩家的一半, 则你成为野
        if(numberOfFriends > manager.context.playerInfos.length / 2) {
            console.log(`[牌局] ${p.player.id} 野了`)
            p.faction = Faction.YE
        }
        manager.broadcast(p as PlayerInfo, PlayerInfo.sanitize)
    }

    /**
     * 判断是否进入鏖战模式. true -> 进入鏖战
     * @param manager 
     */
    checkAoZhan(manager: GameManager): boolean {
        let survivors = manager.getSortedByCurr(true)
        if(survivors.length <= 4) {
            let set = new Set<Faction>()
            for(let s of survivors) {
                let sF = s.getFaction()
                if(set.has(sF) && sF.name !== Faction.YE.name && sF.name !== Faction.UNKNOWN.name) {
                    return false
                }
                set.add(sF)
            }
        }
        return true
    }

    /**
     * 判断是否游戏结束
     * 游戏结束条件: 场上所有玩家*如果明置*均属于统一势力的话, 则结束, 强行翻开未明置的将牌
     * 不然继续打
     * @param deceased 
     * @param manager 
     */
    checkGameEndingCondition(deceased: PlayerInfo, manager: GameManager) {
        let surviving = manager.getSortedByCurr(true).filter(p => p.player.id !== deceased.player.id) as FactionPlayerInfo[]
        if(surviving.length === 1) {
            console.log('[牌局] 只剩一人了!')
            //强制结算
            if(!surviving[0].isRevealed()) {
                this.revealPlayer(surviving[0], manager)
            }
            //declare winners!
            this.declareWinners(surviving[0], manager)
        } else {
            //不能有未验明的势力也不能有野
            let tentativeFac : Faction
            for(let s of surviving) {
                if(s.getFaction() === Faction.UNKNOWN || s.getFaction() === Faction.YE) {
                    console.log('[牌局] 尚有人野/未亮明, 不能结束游戏')
                    return
                }
                if(tentativeFac && tentativeFac !== s.getFaction()) {
                    console.log('[牌局] 尚有人势力相同, 不能结束游戏')
                    return
                }
                tentativeFac = s.getFaction()
            }
            this.declareWinners(surviving[0], manager)
        }
    }

    declareWinners(player: FactionPlayerInfo, manager: GameManager) {
        console.log('[牌局] 胜利条件达到, 计算胜利者!')
        let winnerFac = player.getFaction()
        if(winnerFac === Faction.UNKNOWN) {
            throw 'How????'
        } else if (winnerFac === Faction.YE) {
            throw new GameEnding([player.player.id])
        } else {
            throw new GameEnding(manager.context.playerInfos.filter(p => p.getFaction() === winnerFac).map(p => p.player.id))
        }
    }
}


export class WuLiu extends Equipment {

    async onEquipped(): Promise<void> {
        let me = this.manager.context.getPlayer(this.player) as FactionPlayerInfo
        console.log('[装备] 吴六剑装备')
        this.manager.getSortedByCurr(true)
                    .filter(p => p.player.id !== this.player && FactionPlayerInfo.factionSame(me, p as FactionPlayerInfo))
                    .forEach(p => {
                        p.reachModifier += 1
                        console.log(`[装备] ${p.player.id} 受吴六剑装备的影响, reachModifier成为${p.reachModifier}`)
                        this.manager.broadcast(p, PlayerInfo.sanitize)
                    })
        //todo: newly revealed players need to have this as well!
    }

    async onDropped(): Promise<void> {
        let me = this.manager.context.getPlayer(this.player) as FactionPlayerInfo
        console.log('[装备] 吴六剑卸下')
        this.manager.getSortedByCurr(true)
                    .filter(p => p.player.id !== this.player && FactionPlayerInfo.factionSame(me, p as FactionPlayerInfo))
                    .forEach(p => {
                        p.reachModifier -= 1
                        console.log(`[装备] ${p.player.id} 受吴六剑卸下的影响, reachModifier成为${p.reachModifier}`)
                        this.manager.broadcast(p, PlayerInfo.sanitize)
                    })
    }
}


export class SanJian extends Equipment {
    
    async onEquipped(): Promise<void> {
        this.manager.equipmentRegistry.on<DamageOp>(DamageOp, this.player, this.performEffect)
    }

    async onDropped(): Promise<void> {
        this.manager.equipmentRegistry.off<DamageOp>(DamageOp, this.player, this.performEffect)
    }

    performEffect = async (op: DamageOp) => {
        if(!op.source || op.source.player.id !== this.player || op.damageSource !== DamageSource.SLASH) {
            return
        }
        if(op.timeline !== DamageTimeline.DID_DAMAGE) {
            return
        }
        let potential = op.source.getCards(CardPos.EQUIP).find(c => c.type === CardType.SAN_JIAN)
        if(!potential) {
            throw `不可能! 我登记过的就应该有这个武器! 三尖两刃刀 ${this.player}`
        }
        if(op.target.isDead || op.source.isDead) {
            console.log('[装备] 三尖两刃刀无法发动, 因玩家已死', op.target.isDead, op.source.isDead)
            return 
        }
        let ask = await this.manager.sendHint(this.player, {
            hintType: HintType.MULTI_CHOICE,
            hintMsg: `是否发动三尖两刃刀特效`,
            extraButtons: [Button.OK, Button.CANCEL]
        })
        if(isCancel(ask)) {
            console.log('[装备] 玩家放弃发动三尖两刃刀')
            return
        }
        let resp = await this.manager.sendHint(this.player, {
            hintType: HintType.SPECIAL,
            specialId: CardType.SAN_JIAN.name,
            hintMsg: '发动三尖两刃刀',
            sourcePlayer: op.target.player.id,
            extraButtons: [Button.CANCEL]
        })
        if(isCancel(resp)) {
            console.log('[装备] 玩家放弃发动三尖两刃刀')
            return 
        } else {
            let card = this.manager.getCard(getFromAction(resp, UIPosition.MY_HAND)[0])
            delete card.as
            card.description = this.player + ' 三尖两刃刀弃牌'
            this.manager.sendToWorkflow(this.player, CardPos.HAND, [card], true)
            await new DamageOp(op.source, op.target, 1, [], DamageSource.SKILL).perform(this.manager)
        }
    }
}