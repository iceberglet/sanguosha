import { Initializer } from "../common/GameMode";
import GameManager from "../server/GameManager";
import { CardBeingDroppedEvent } from "../server/engine/Generic";
import { CardPos } from "../common/transit/CardPos";
import FactionPlayerInfo from "./FactionPlayerInfo";
import { PlayerInfo } from "../common/PlayerInfo";
import { HintType } from "../common/ServerHint";
import { Button } from "../common/PlayerAction";
import { StageStartFlow } from "../server/engine/StageFlows";
import { Faction, factionsSame } from "../common/General";
import { Stage } from "../common/Stage";
import DeathOp from "../server/engine/DeathOp";
import GameEnding from "../server/GameEnding";
import TakeCardOp from "../server/engine/TakeCardOp";
import initializeEquipments from "./FactionWarEquipmentInitializer";
import { generalPairs } from "./FactionWarGenerals";
import DropCardOp from "../server/engine/DropCardOp";

export class RevealGeneralEvent {
    public constructor(public readonly playerId: string, 
                        public readonly mainReveal: boolean,
                        public readonly subReveal: boolean) {}
}

export class RevealPlayerEvent {
    public constructor(public readonly player: PlayerInfo) {}
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
            if(resp.isCancel()) {
                return
            }
            let choice = resp.button
            if(choice === 'general') {
                await manager.events.publish(new RevealGeneralEvent(p.player.id, true, false))
            } else if (choice === 'subgeneral') {
                await manager.events.publish(new RevealGeneralEvent(p.player.id, false, true))
            } else if (choice === 'all') {
                await manager.events.publish(new RevealGeneralEvent(p.player.id, true, true))
            } else {
                throw 'Unknown option ' + choice
            }
        })

        manager.adminRegistry.onGeneral<RevealGeneralEvent>(RevealGeneralEvent, async (reveal)=>{
            console.log('[牌局] 明置武将 ', reveal.playerId, reveal.mainReveal, reveal.subReveal)
            let p = manager.context.getPlayer(reveal.playerId) as FactionPlayerInfo
            let wasRevealed = p.isRevealed()
            p.isGeneralRevealed = p.isGeneralRevealed || reveal.mainReveal
            p.isSubGeneralRevealed = p.isSubGeneralRevealed || reveal.subReveal

            if(p.isGeneralRevealed && p.isSubGeneralRevealed) {
                //珠联璧合
                if(generalPairs.isPaired(p.general.name, p.subGeneral.name)) {
                    if(p.signs['珠']) {
                        console.error('已经有了珠联璧合了，咋回事？？', p, reveal)
                    } else {
                        p.signs['珠'] = {
                            displayName: '珠联璧合',
                            enabled: true,
                            owner: 'player',
                            type: 'usable-sign'
                        }
                    }
                }
                //阴阳鱼
                let hp1 = p.general.hp, hp2 = p.subGeneral.hp
                if(Math.round(2 * (hp1 + hp2 - Math.floor(hp2 + hp1))) === 1) {
                    if(p.signs['鱼']) {
                        console.error('已经有了阴阳鱼了，咋回事？？', p, reveal)
                    } else {
                        p.signs['鱼'] = {
                            displayName: '阴阳鱼',
                            enabled: true,
                            owner: 'player',
                            type: 'usable-sign'
                        }
                    }
                }
            }

            let isRevealed = p.isRevealed()
            if(!wasRevealed && isRevealed) {
                await manager.events.publish(new RevealPlayerEvent(p))
            }
            //todo: update server side skill conditions
            manager.broadcast(p as PlayerInfo, PlayerInfo.sanitize)
            manager.log(`${p.player.id} 明置 ${reveal.mainReveal? '主将' + p.general.name : ''} ${reveal.subReveal? '副将' + p.subGeneral.name : ''}`)
            this.checkGameEndingCondition(manager.context.playerInfos.filter(p => !p.isDead) as FactionPlayerInfo[], manager)
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

            this.checkGameEndingCondition(manager.getSortedByCurr(true).filter(p => p.player.id !== deceased.player.id) as FactionPlayerInfo[], manager)

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
            } else if (factionsSame(killer.getFaction(), deceased.getFaction())) {
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

        let noOneRevealed = true

        manager.adminRegistry.onGeneral<RevealPlayerEvent>(RevealPlayerEvent, async(reveal)=>{
            if(noOneRevealed) {
                noOneRevealed = false
                reveal.player.signs['先'] = {
                    displayName: '先驱',
                    enabled: true,
                    owner: 'player',
                    type: 'usable-sign'
                }
            }
            this.computeFactionForPlayer(reveal.player as FactionPlayerInfo, manager)
        })
        
        
        manager.adminRegistry.onGeneral<DropCardOp>(DropCardOp, async (dropOp)=>{
            if(dropOp.player.signs['鱼'] && dropOp.amount > 0) {
                let resp = await manager.sendHint(dropOp.player.player.id, {
                    hintType: HintType.MULTI_CHOICE,
                    hintMsg: '是否弃置阴阳鱼标记使本回合弃牌阶段手牌上限+2?',
                    extraButtons: [Button.OK, Button.CANCEL]
                })
                if(!resp.isCancel()) {
                    manager.log(`${dropOp.player} 弃置阴阳鱼标记使手牌上限+2`)
                    dropOp.amount -= 2
                    delete dropOp.player.signs['鱼']
                    manager.broadcast(dropOp.player, PlayerInfo.sanitize)
                }
                // this.invokeEffects(manager)
            }
        })
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
    checkGameEndingCondition(surviving: FactionPlayerInfo[], manager: GameManager) {
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