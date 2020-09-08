import GameContext from "../common/GameContext";
import Card, { CardSize, CardType } from "../common/cards/Card"
import { PlayerInfo, Identity } from "../common/PlayerInfo"
import { PlayerDeadInHisRound } from "./Operation";
import RoundStat from "../common/RoundStat";
import { PlayerRegistry, Sanitizer } from "./PlayerRegistry";
import { ServerHint, HintType, Rescind } from "../common/ServerHint";
import { SequenceAwarePubSub, EventRegistry, GameEventListener, CompositeListener } from "../common/util/PubSub";
import { PlayerAction, Button, UIPosition } from "../common/PlayerAction";
import { CardPos } from "../common/transit/CardPos";
import { Stage } from "../common/Stage";
import IdentityWarGeneral from "../game-mode-identity/IdentityWarGenerals";
import { GameMode } from "../common/GameMode";
import GameServerContext from "./context/GameServerContext";
import IdentityWarPlayerInfo from "../game-mode-identity/IdentityWarPlayerInfo";
import FactionPlayerInfo from "../game-mode-faction/FactionPlayerInfo";
import FactionWarGeneral from "../game-mode-faction/FactionWarGenerals";
import { StageStartFlow, StageEndFlow } from "./engine/StageFlows";
import TakeCardOp, { TakeCardStageOp } from "./engine/TakeCardOp";
import DropCardOp from "./engine/DropCardOp";
import { CurrentPlayerEffect, CardTransit, PlaySound } from "../common/transit/EffectTransit";
import PlayerActionResolver, { ActionResolver } from "./context/PlayerActionResolver";
import { ICard } from "../common/cards/ICard";
import { JudgeDelayedRuseOp } from "./engine/DelayedRuseOp";
import GameEnding from "./GameEnding";
import { GameModeEnum } from "../common/GameModeEnum";
import GameStatsCollector from "./GameStatsCollector";
import { EventRegistryForSkills } from "../game-mode-faction/skill/Skill";
import { CardBeingPlayedEvent, CardBeingUsedEvent } from "./engine/Generic";
import PlayerAct from "./context/PlayerAct";


//Manages the rounds
export default class GameManager {

    //index of GameContext#playerInfos
    private currentPlayer: number = 0
    public roundStats: RoundStat
    /**
     * 事件的触发与结算
     */
    public adminRegistry: EventRegistry
    public equipmentRegistry: EventRegistry
    public skillRegistry: EventRegistryForSkills
    public events : GameEventListener
    //for custom ui components
    public onReconnect: ()=>void

    private currEffect: CurrentPlayerEffect = new CurrentPlayerEffect(null, null, new Set<string>())
    public resolver: PlayerActionResolver

    public constructor(public context: GameServerContext, 
                        private registry: PlayerRegistry,
                        resolver: ActionResolver,
                        private statsCollector: GameStatsCollector) {
        //other initialization
        this.resolver = new PlayerActionResolver(resolver)
    }

    public init(skillRegistry: EventRegistryForSkills & GameEventListener) {
        //event pubsub
        let sequencer = (ids: string[])=>this.context.sortFromPerspective(this.currPlayer().player.id, ids).map(p => p.player.id)
        let equipmentRegistry = new SequenceAwarePubSub(sequencer)
        let adminRegistry = new SequenceAwarePubSub(sequencer)
        this.adminRegistry = adminRegistry
        this.equipmentRegistry = equipmentRegistry
        this.skillRegistry = skillRegistry
        //先触发技能, 再触发装备...
        this.events = new CompositeListener([adminRegistry, skillRegistry, equipmentRegistry])

        this.statsCollector.subscribeTo(adminRegistry)
        adminRegistry.onGeneral<CardBeingPlayedEvent>(CardBeingPlayedEvent, this.processCardEvent)
        adminRegistry.onGeneral<CardBeingUsedEvent>(CardBeingUsedEvent, this.processCardEvent)
    }

    processCardEvent = async (event: CardBeingPlayedEvent | CardBeingUsedEvent): Promise<void> => {
        if(!event.as) {
            return
        }
        if(event.isFromSkill) {
            // console.log('[Game Manager] Not playing sound as this is from a skill', event.as, event.cards)
            return
        }
        let gender = this.context.getPlayer(event.player).getGender()
        let genderFolder = gender === 'F'? 'female' : 'male'
        let soundName = event.as.id
        console.log('[Game Manager] Play Sound ', `audio/card/${genderFolder}/${soundName}.ogg`)
        this.broadcast(new PlaySound(`audio/card/${genderFolder}/${soundName}.ogg`))
    }

    public async startGame(): Promise<string[]> {
        console.log('[Game Manager] 开始发牌, 进入游戏!')
        //cards for everyone
        await Promise.all(this.context.playerInfos.map(async p => await new TakeCardOp(p, 4).perform(this)))
        
        while(true) {
            //go to next round
            let player = this.currPlayer()
            if(player.isTurnedOver) {
                player.isTurnedOver = false
                console.log(`Player is turned back ${player.player.id}`)
                this.broadcast(player, PlayerInfo.sanitize)
                this.goToNextPlayer()
                continue;
            } else {
                try {
                    this.roundStats = new RoundStat()
                    await this.processStage(player, Stage.ROUND_BEGIN)
                    await this.processStage(player, Stage.JUDGE, async ()=>await this.processJudgingStage())
                    await this.processStage(player, Stage.TAKE_CARD, async ()=>await this.processTakeCardStage())
                    await this.processStage(player, Stage.USE_CARD, async ()=>await this.processUseCardStage())
                    await this.processStage(player, Stage.DROP_CARD, async ()=>await this.processDropCardStage())
                    await this.processStage(player, Stage.ROUND_END)
                    this.goToNextPlayer()
                } catch (err) {
                    if(err instanceof PlayerDeadInHisRound) {
                        console.log('Player died in his round. Proceeding to next player...')
                        this.goToNextPlayer()
                        continue;
                    }
                    if(err instanceof GameEnding) {
                        console.log('The Game has ended', err.winners)
                        let stats = this.statsCollector.declareWinner(err.winners)
                        await Promise.all(this.context.playerInfos.map(info => {
                            return this.sendHint(info.player.id, {
                                hintType: HintType.UI_PANEL,
                                hintMsg: '牌局结束',
                                customRequest: {
                                    mode: 'game-end',
                                    data: stats
                                }
                            })
                        }))
                        return this.context.playerInfos.map(p => p.player.id)
                    }
                    console.error(err)
                    throw err
                }
            }
        }
    }


    //--------------- network interaction -------------------
    /**
     * Sending a hint to player for action
     * @param player target for the hint
     * @param hint 
     */
    public async sendHint(player: string, hint: ServerHint, isCollective: boolean = false): Promise<PlayerAct> {
        hint.roundStat = this.roundStats
        if(!isCollective) {
            this.setPending([player])
        }
        return new PlayerAct(await this.registry.sendServerAsk(player, hint), this)
    }

    public send(anyone: string, anything: any) {
        this.registry.send(anyone, anything)
    }

    /**
     * Show pending effect on the players
     * @param players
     */
    public setPending(players: string[]) {
        this.currEffect.pendingUser = new Set<string>(players)
        this.broadcast(this.currEffect)
    }

    public setPlayerAndStage(player: string, stage: Stage) {
        this.currEffect.player = player
        this.currEffect.stage = stage
        this.currEffect.pendingUser = new Set<string>([player])
        this.broadcast(this.currEffect)
    }


    /**
     * Rescind all server hints. ignore their responses, if any
     */
    public async rescindAll() {
        //send such request to all players
        this.broadcast(new Rescind())
        this.setPending([])
        //clear our cache
        this.registry.rescindAll()
    }

    public broadcast<F extends object>(obj: F, sanitizer: Sanitizer<F> = null) {
        this.registry.broadcast(obj, sanitizer)
    }

    public onPlayerReconnected(player: string) {
        let context = new GameContext(this.context.playerInfos, this.context.gameMode)
        this.registry.send(player, context.sanitize(player))
        if(this.currEffect) {
            this.registry.send(player, this.currEffect)
        }
        if(this.onReconnect) {
            this.onReconnect()
        }
        this.registry.onPlayerReconnected(player)
    }

    public getCard=(id: string): Card=> {
        let c = this.context.cardManager.getCard(id)
        delete c.as
        delete c.description
        return c
    }

    public currPlayer(): PlayerInfo {
        return this.context.playerInfos[this.currentPlayer]
    }

    public getOthers(id: string) {
        return this.context.playerInfos.map(p => !p.isDead && p.player.id !== id)
    }

    /**
     * 当前活着的玩家根据座次排序
     * @param includeCurr 
     */
    public getSortedByCurr(includeCurr: boolean): PlayerInfo[] {
        return this.context.getRingFromPerspective(this.currPlayer().player.id, includeCurr)
    }
    

    //////////////////////// Card Movement ///////////////////////
    
    /**
     * 从此玩家身上扒下牌进workflow
     * @param fromPlayer 玩家
     * @param fromPos 玩家打出的位置
     * @param cards 任何玩家打出的牌
     * @param head 整个flow的发起牌. (杀 / 锦囊 / 南蛮 / 离间用的牌, 等等)
     * @param doNotRemove 不要从玩家手中拿走
     */
    public sendToWorkflow(fromPlayer: string, fromPos: CardPos, cards: Card[], head: boolean = false, doNotRemove: boolean = false) {
        if(!doNotRemove) {
            this.context.sendToWorkflow(fromPlayer, fromPos, cards)
        }
        this.broadcast(CardTransit.toWorkflow(fromPlayer, fromPos, cards, head, doNotRemove))
    }

    public stillInWorkflow(card: Card): boolean {
        if(!this.context.workflowCards.find(w => w.id === card.id)) {
            return false
        }
        return true
    }

    public takeFromWorkflow(toPlayer: string, toPos: CardPos, cards: Card[]): Card[] {
        // if(!this.stillInWorkflow(cards)) {
        //     console.error('Workflow 没有这些卡了!')
        // }
        // this.broadcast(new TransferCardEffect(null, toPlayer, cards))
        let cardos = this.context.takeFromWorkflow(toPlayer, toPos, cards)
        this.broadcast(CardTransit.fromWorkflow(toPlayer, toPos, cardos))
        return cardos
    }
    
    /**
     * 仅改变卡牌的位置, 不作其他动作
     * Move selected cards from one place to another
     * @param fromPlayer null for shared positions
     * @param toPlayer null for shared positions
     * @param from from position
     * @param to to position. 
     * @param cards cards. Sequence depends on this position
     */
    public transferCards(fromPlayer: string, toPlayer: string, from: CardPos, to: CardPos, cards: Card[]) {
        this.context.transferCards(fromPlayer, toPlayer, from, to, cards)
        this.broadcast(new CardTransit(fromPlayer, from, toPlayer, to, cards, 1000), CardTransit.defaultSanitize)
    }

    public interpret(forPlayer: string, cardId: string): ICard {
        return this.context.getPlayer(forPlayer).cardInterpreter(this.getCard(cardId))
    }


    /////////////////////// Flows ////////////////////////

    private async processJudgingStage() {
        let p = this.currPlayer()
        let judgeCards = [...p.getCards(CardPos.JUDGE)]
        for(let j = 0; j < judgeCards.length; ++j) {
            console.log('[Game Manager] 延时锦囊结算', judgeCards[j].type)
            await new JudgeDelayedRuseOp(p, judgeCards[j]).perform(this)
        }
    }

    private async processTakeCardStage() {
        await new TakeCardStageOp(this.currPlayer(), 2).perform(this)
    }

    private async processUseCardStage() {
        while(true) {
            let resp = await this.sendHint(this.currPlayer().player.id, {
                hintType: HintType.PLAY_HAND,
                hintMsg: '请出牌',
                roundStat: this.roundStats,
                extraButtons: [new Button('abort', '结束出牌')]
            })
            if(resp.button === 'abort') {
                //进入弃牌阶段
                break;
            }
            //process this action
            await this.resolver.on(resp, this)
        }
        if(this.currPlayer().isDrunk) {
            //醒酒
            this.currPlayer().isDrunk = false
            this.broadcast(this.currPlayer(), PlayerInfo.sanitize)
        }
    }

    private async processDropCardStage() {
        await new DropCardOp(this.currPlayer()).perform(this)
    }

    private async processStage(info: PlayerInfo, stage: Stage, midProcessor: () => Promise<void> = null) {
        console.log(`[Game Manager] Enter ${info.player.id} ${stage.name} 场上卡牌数 ${this.countAllCards()}`)
        await new StageStartFlow(info, stage).perform(this)
        if(!this.roundStats.skipStages.get(stage)) {
            this.setPlayerAndStage(this.currPlayer().player.id, stage)
            this.broadcast(this.currEffect)
            if(midProcessor) {
                await midProcessor()
            }
        }
        await new StageEndFlow(info, stage).perform(this)
        this.context.dropWorkflowCards()
        console.log(`[Game Manager] Leave ${info.player.id} ${stage.name}`)
    }

    private goToNextPlayer() {
        do {
            this.currentPlayer = (this.currentPlayer + 1) % this.context.playerInfos.length
        } while(this.currPlayer().isDead)
        console.log('进入下一个玩家的回合:', this.currPlayer().player.id)
    }

    private countAllCards() {
        let count = this.context.workflowCards.size() + this.context.deck.size()
        this.context.playerInfos.forEach(p => count += p.getAllCards().length)
        return count 
    }
}


// export function sampleFactionWarContext() {
//     let p = {id: '青青子吟'}
//     let player = new FactionPlayerInfo(p, FactionWarGeneral.jia_xu, FactionWarGeneral.li_jue_guo_si).init()
//     // player.hp = 1
//     let player2 = new FactionPlayerInfo({id: '欧阳挠挠'}, FactionWarGeneral.diao_chan, FactionWarGeneral.dong_zhuo).init()
//     // player2.hp = 1
//     let context = new GameServerContext([player, player2], GameModeEnum.FactionWarGame)

//     return context
// }


// export function sampleIdentityWarContext() {
//     let cardManager = GameMode.get(GameModeEnum.IdentityWarGame).cardManager
//     let p = {id: '青青子吟'}
//     let cards = cardManager.getShuffledDeck()
//     let player = new IdentityWarPlayerInfo(p, Identity.ZHU_GONG, IdentityWarGeneral.standard_zhang_liao).init()
//     player.addCard(cards.find(c => c.type === CardType.SLASH), CardPos.HAND)
//     player.addCard(cards.find(c => c.type === CardType.WAN_JIAN), CardPos.HAND)
//     player.addCard(cards.find(c => c.type === CardType.DODGE), CardPos.HAND)
//     player.addCard(cards.find(c => c.type === CardType.PEACH), CardPos.HAND)
//     player.addCard(cards.find(c => c.type === CardType.HUO_GONG), CardPos.HAND)
//     // player.addCard(cards.find(c => c.type === CardType.SHUN_SHOU), CardPos.HAND)
//     // player.addCard(cards.find(c => c.type === CardType.GUO_HE), CardPos.HAND)
//     // player.addCard(cards.find(c => c.type === CardType.JUE_DOU), CardPos.HAND)
//     // player.addCard(cards.find(c => c.type === CardType.TIE_SUO), CardPos.HAND)
//     // player.addCard(cards.find(c => c.type === CardType.BING_LIANG), CardPos.HAND)
//     // player.addCard(cards.find(c => c.type === CardType.LE_BU), CardPos.HAND)
//     // player.addCard(cards.find(c => c.type === CardType.SHAN_DIAN), CardPos.HAND)
//     player.addCard(new Card('diamond', CardSize.FIVE, CardType.GUAN_SHI), CardPos.EQUIP)
//     player.addCard(new Card('spade', CardSize.SIX, CardType.LE_BU), CardPos.JUDGE)
//     player.addCard(new Card('heart', CardSize.QUEEN, CardType.SHAN_DIAN), CardPos.JUDGE)
//     player.hp = 2;
    
//     let player2 = new IdentityWarPlayerInfo({id: '欧阳挠挠'}, Identity.ZHONG_CHEN, IdentityWarGeneral.forest_dong_zhuo).init()
//     player2.addCard(cardManager.getShuffledDeck()[0], CardPos.HAND)
//     player2.addCard(new Card('spade', CardSize.QUEEN, CardType.ZHANG_BA), CardPos.EQUIP)
//     player2.addCard(new Card('spade', CardSize.KING, CardType.DA_YUAN), CardPos.EQUIP)
//     player2.addCard(new Card('diamond', CardSize.KING, CardType.HUA_LIU), CardPos.EQUIP)
//     player2.addCard(new Card('diamond', CardSize.ACE, CardType.LE_BU), CardPos.JUDGE)
//     player2.hp = 2;

//     let player3 = new IdentityWarPlayerInfo({id: '东郭旭銮'}, Identity.FAN_ZEI, IdentityWarGeneral.standard_cao_cao).init()
//     player3.addCard(cardManager.getShuffledDeck()[0], CardPos.HAND)
//     player3.addCard(new Card('heart', CardSize.KING, CardType.ZHUA_HUANG), CardPos.EQUIP)

//     let player4 = new IdentityWarPlayerInfo({id: '新荷'}, Identity.FAN_ZEI, IdentityWarGeneral.standard_huang_gai).init()
//     player4.addCard(new Card('club', CardSize.JACK, CardType.BING_LIANG), CardPos.JUDGE)
//     player4.hp = 1

//     let player5 = new IdentityWarPlayerInfo({id: 'Iceberglet'}, Identity.FAN_ZEI, IdentityWarGeneral.standard_guan_yu).init()
    
//     let player6 = new IdentityWarPlayerInfo({id: '广东吴彦祖'}, Identity.FAN_ZEI, IdentityWarGeneral.standard_ma_chao).init()
//     player6.addCard(new Card('club', CardSize.TWO, CardType.BA_GUA), CardPos.EQUIP)
    
//     let player7 = new IdentityWarPlayerInfo({id: '豫章铁锅'}, Identity.FAN_ZEI, IdentityWarGeneral.standard_zhang_fei).init()
//     player7.hp = 3

//     let player8 = new IdentityWarPlayerInfo({id: 'tester-8'}, Identity.FAN_ZEI, IdentityWarGeneral.standard_xu_chu).init()

//     let context = new GameServerContext([player, player2, player3, player4, player5, player6, player7, player8], GameModeEnum.IdentityWarGame)

//     return context
// }