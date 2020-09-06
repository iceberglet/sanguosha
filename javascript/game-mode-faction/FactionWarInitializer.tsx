import { Initializer } from "../common/GameMode";
import GameManager from "../server/GameManager";
import { CardBeingDroppedEvent } from "../server/flows/Generic";
import { CardPos } from "../common/transit/CardPos";
import { CardType } from "../common/cards/Card";
import FactionPlayerInfo from "./FactionPlayerInfo";
import { PlayerInfo } from "../common/PlayerInfo";
import { HintType } from "../common/ServerHint";
import { Button, isCancel, getFromAction, UIPosition } from "../common/PlayerAction";
import { StageStartFlow } from "../server/flows/StageFlows";
import { Faction, factionsSame } from "../common/General";
import { Stage } from "../common/Stage";
import DeathOp from "../server/flows/DeathOp";
import GameEnding from "../server/GameEnding";
import TakeCardOp from "../server/flows/TakeCardOp";
import { describer } from "../common/util/Describer";
import initializeEquipments from "./FactionWarEquipmentInitializer";

export class RevealEvent {
    public constructor(public readonly playerId: string, 
                        public readonly mainReveal: boolean,
                        public readonly subReveal: boolean) {}
}

export default class FactionWarInitializer implements Initializer {

    init(manager: GameManager) : void {

        initializeEquipments(manager)

        //回合开始的时候问是否要明置武将
        manager.adminRegistry.onGeneral<StageStartFlow>(StageStartFlow, async (start)=>{
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
            if(choice === 'general') {
                await manager.events.publish(new RevealEvent(p.player.id, true, false))
            } else if (choice === 'subgeneral') {
                await manager.events.publish(new RevealEvent(p.player.id, false, true))
            } else if (choice === 'all') {
                await manager.events.publish(new RevealEvent(p.player.id, true, true))
            } else {
                throw 'Unknown option ' + choice
            }
        })

        manager.adminRegistry.onGeneral<RevealEvent>(RevealEvent, async (reveal)=>{
            console.log('[牌局] 明置武将 ', reveal.playerId, reveal.mainReveal, reveal.subReveal)
            let p = manager.context.getPlayer(reveal.playerId) as FactionPlayerInfo
            let wasRevealed = p.isRevealed()
            p.isGeneralRevealed = p.isGeneralRevealed || reveal.mainReveal
            p.isSubGeneralRevealed = p.isSubGeneralRevealed || reveal.subReveal
            let isRevealed = p.isRevealed()
            if(!wasRevealed && isRevealed) {
                this.computeFactionForPlayer(p, manager)
            }
            //todo: update server side skill conditions
            manager.broadcast(p as PlayerInfo, PlayerInfo.sanitize)
        })

        manager.adminRegistry.onGeneral<DeathOp>(DeathOp, async (death)=>{
            let deceased = death.deceased as FactionPlayerInfo
            let killer = death.killer as FactionPlayerInfo
            if(!deceased.isRevealed()) {
                console.log(`[牌局] ${deceased.player.id} 未亮明身份, 强行翻开`)
                deceased.isDead = true
                //亮明
                deceased.isGeneralRevealed = true
                deceased.isSubGeneralRevealed = true
                this.computeFactionForPlayer(deceased, manager)
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


    initClient() {
        
        describer.register(CardType.TENG_JIA.id, '锁定技，【南蛮入侵】、【万箭齐发】和普通【杀】对你无效。当你受到火焰伤害时，此伤害+1。')
        describer.register(CardType.SILVER_LION.id, '锁定技，当你受到伤害时，若此伤害多于1点，则防止多余的伤害；当你失去装备区里的【白银狮子】时，你回复1点体力。')
        describer.register(CardType.REN_WANG.id, '锁定技，黑色的【杀】对你无效。')
        describer.register(CardType.BA_GUA.id, '每当你需要使用或打出一张【闪】时，你可以进行一次判定：若判定结果为红色，则视为你使用或打出了一张【闪】。')
        describer.register(CardType.QI_LIN.id, '当你使用【杀】对目标角色造成伤害时，你可以弃置其装备区里的一张坐骑牌。')
        describer.register(CardType.ZHU_QUE.id, '你可以将一张普通【杀】当具火焰伤害的【杀】使用。')
        describer.register(CardType.ZHANG_BA.id, '你可以将两张手牌当【杀】使用或打出。')
        describer.register(CardType.GUAN_SHI.id, '当你使用的【杀】被抵消时，你可以弃置两张牌，则此【杀】依然造成伤害。')
        describer.register(CardType.SAN_JIAN.id, '你使用【杀】对目标角色造成伤害后，可弃置一张手牌并对该角色距离1的另一名角色造成1点伤害。')
        describer.register(CardType.WU_LIU.id, '锁定技，与你势力相同的其他角色攻击范围+1。')
        describer.register(CardType.HAN_BING.id, '当你使用【杀】对目标角色造成伤害时，若该角色有牌，你可以防止此伤害，改为依次弃置其两张牌。')
        describer.register(CardType.CI_XIONG.id, '当你使用【杀】指定一名异性角色为目标后，你可以令其选择一项：弃一张手牌；或令你摸一张牌。')
        describer.register(CardType.QING_GANG.id, '锁定技，当你使用【杀】指定一名角色为目标后，无视其防具。')
        describer.register(CardType.LIAN_NU.id, '出牌阶段，你可以使用任意数量的【杀】。')
        describer.register(CardType.BING_LIANG.id, '出牌阶段，对距离为1的一名其他角色使用。将【兵粮寸断】放置于该角色的判定区里，若判定结果不为梅花，跳过其摸牌阶段。')
        describer.register(CardType.LE_BU.id, '出牌阶段，对一名其他角色使用。将【乐不思蜀】放置于该角色的判定区里，若判定结果不为红桃，则跳过其出牌阶段。')
        describer.register(CardType.SHAN_DIAN.id, '出牌阶段，对自己使用。将【闪电】放置于自己的判定区里。若判定结果为黑桃2~9，则目标角色受到3点雷电伤害。若判定不为此结果，将之移动到下家的判定区里。')
        describer.register(CardType.WU_GU.id, '出牌阶段，对所有角色使用。你从牌堆亮出等同于现存角色数量的牌，每名目标角色选择并获得其中的一张。')
        describer.register(CardType.TAO_YUAN.id, '出牌阶段，对所有角色使用。每名目标角色回复1点体力。')
        describer.register(CardType.NAN_MAN.id, '出牌阶段，对所有其他角色使用。每名目标角色需打出一张【杀】，否则受到1点伤害。')
        describer.register(CardType.WAN_JIAN.id, '出牌阶段，对所有其他角色使用。每名目标角色需打出一张【闪】，否则受到1点伤害。')
        describer.register(CardType.YUAN_JIAO.id, '出牌阶段，对有明置武将牌且与你势力不同的一名角色使用。该角色摸一张牌，然后你摸三张牌。')
        describer.register(CardType.ZHI_JI.id, '出牌阶段，对一名其他角色使用。观看其一张暗置的武将牌或其手牌。重铸，出牌阶段，你可以将此牌置入弃牌堆，然后摸一张牌。')
        describer.register(CardType.YI_YI.id, '出牌阶段，对你和与你势力相同的角色使用。每名目标角色各摸两张牌，然后弃置两张牌。')
        describer.register(CardType.HUO_GONG.id, '该角色展示一张手牌，然后若你弃置一张与所展示牌相同花色的手牌，则【火攻】对其造成1点火焰伤害。')
        describer.register(CardType.TIE_SUO.id, '连环: 出牌阶段使用，分别横置或重置其武将牌（被横置武将牌的角色处于“连环状态 ·即使第一名受伤害的角色死亡，也会令其它处于连环状态的角色受到该属性伤害。 ·经由连环传导的伤害不能再次被传导。重铸: 出牌阶段，你可以将此牌置入弃牌堆，然后摸一张牌。')
        describer.register(CardType.WU_XIE.id, '抵消目标锦囊对一名角色产生的效果；或抵消另一张无懈可击产生的效果。')
        describer.register(CardType.JIE_DAO.id, '出牌阶段，对装备区里有武器牌的一名其他角色使用。该角色需对其攻击范围内，由你指定的另一名角色使用一张【杀】，否则将装备区里的武器牌交给你。')
        describer.register(CardType.SHUN_SHOU.id, '出牌阶段，对距离为1且区域内有牌的一名其他角色使用。你获得其区域内的一张牌。')
        describer.register(CardType.GUO_HE.id, '出牌阶段，对一名区域内有牌的其他角色使用。你将其区域内的一张牌弃置。')
        describer.register(CardType.WU_ZHONG.id, '出牌阶段，对自己使用。摸两张牌。')
        describer.register(CardType.JUE_DOU.id, '出牌阶段，对一名其他角色使用。由该角色开始，你与其轮流打出一张【杀】，首先不出【杀】的一方受到另一方造成的1点伤害。')
        describer.register(CardType.WU_XIE_GUO.id, '抵消目标锦囊牌对一名角色或一种势力产生的效果，或抵消另一张【无懈可击】产生的效果。')
    }


    computeFactionForPlayer(p: FactionPlayerInfo, manager: GameManager) {
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
                surviving[0].isGeneralRevealed = true
                surviving[0].isSubGeneralRevealed = true
                this.computeFactionForPlayer(surviving[0], manager)
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