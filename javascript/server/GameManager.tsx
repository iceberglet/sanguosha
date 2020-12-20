import GameContext from "../common/GameContext";
import Card from "../common/cards/Card"
import { PlayerInfo } from "../common/PlayerInfo"
import { PlayerDeadInHisRound } from "./Operation";
import RoundStat from "../common/RoundStat";
import { PlayerRegistry, Sanitizer } from "./PlayerRegistry";
import { ServerHint, HintType } from "../common/ServerHint";
import Pubsub, { SequenceAwarePubSub, EventRegistry, GameEventListener, CompositeListener } from "../common/util/PubSub";
import { Button } from "../common/PlayerAction";
import { CardPos } from "../common/transit/CardPos";
import { Stage } from "../common/Stage";
import GameServerContext from "./context/GameServerContext";
import { StageStartFlow, StageEndFlow, InStageStart, InStageEnd } from "./engine/StageFlows";
import TakeCardOp, { TakeCardStageOp } from "./engine/TakeCardOp";
import DropCardOp from "./engine/DropCardOp";
import { CurrentPlayerEffect, CardTransit, PlaySound, LogTransit } from "../common/transit/EffectTransit";
import PlayerActionResolver, { ActionResolver } from "./context/PlayerActionResolver";
import { ICard } from "../common/cards/ICard";
import { JudgeDelayedRuseOp } from "./engine/DelayedRuseOp";
import GameEnding from "./GameEnding";
import GameStatsCollector from "./GameStatsCollector";
import { EventRegistryForSkills } from "../common/Skill";
import { CardBeingUsedEvent, CardObtainedEvent, CardBeingTakenEvent, turnOver } from "./engine/Generic";
import PlayerAct from "./context/PlayerAct";
import { Gender } from "../common/General";


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

    public readonly currEffect: CurrentPlayerEffect = new CurrentPlayerEffect(null, null, new Set<string>(), 0)
    public resolver: PlayerActionResolver
    public manualEnding: GameEnding

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
        adminRegistry.onGeneral<CardBeingUsedEvent>(CardBeingUsedEvent, this.processCardEvent)
    }

    sortByCurrent (players: PlayerInfo[]) {
        return this.context.sortFromPerspective(this.currPlayer().player.id, players.map(p => p.player.id))
    }

    processCardEvent = async (event: CardBeingUsedEvent): Promise<void> => {
        if(!event.as || event.as.isEquipment()) {
            return
        }
        if(event.isFromSkill) {
            // console.log('[Game Manager] Not playing sound as this is from a skill', event.as, event.cards)
            return
        }
        let gender = this.context.getPlayer(event.player).getGender()
        let soundName = event.as.id
        this.playSound(gender, soundName)
    }

    playSound(gender: Gender, soundName: string) {
        //no gender -> defaults to male (for unrevealed players)
        let genderFolder = gender === 'F'? 'female' : 'male'
        console.log('[Game Manager] Play Sound ', `audio/card/${genderFolder}/${soundName}.ogg`)
        this.broadcast(new PlaySound(`audio/card/${genderFolder}/${soundName}.ogg`))
    }

    public async startGame(): Promise<string[]> {
        console.log('[Game Manager] 开始发牌, 进入游戏!')
        //cards for everyone
        await Promise.all(this.context.playerInfos.map(async p => await new TakeCardOp(p, 4).perform(this)))
        
        while(true) {
            try {
                await this.doOneRound()
                if(this.queue.length > 0) {
                    console.log('[Game Manager] 存在插队者...')
                    let onHold = this.currentPlayer
                    while(this.queue.length > 0) {
                        let p = this.queue.shift()
                        let idx = this.context.playerInfos.findIndex(i => i === p)
                        console.log('[Game Manager] 插队者回合', p.player.id)
                        this.currentPlayer = idx
                        await this.doOneRound()
                    }
                    this.currentPlayer = onHold
                }
                this.goToNextPlayer()
            } catch (err) {
                if(err instanceof PlayerDeadInHisRound) {
                    console.log('Player died in his round. Proceeding to next player...')
                    //为了发动戚乱尚需要最后来这么一下
                    await this.events.publish(new StageEndFlow(this.currPlayer(), Stage.ROUND_END))
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
                this.goToNextPlayer()
                //try continue
                // throw err
            }
        }
    }

    public queue: PlayerInfo[] = []

    public cutQueue(p: PlayerInfo) {
        console.log('[Game Manager] 插入一个玩家的回合', p.player.id)
        this.queue.push(p)
    }

    private async doOneRound() {
        //go to next round
        let player = this.currPlayer()
        if(player.isTurnedOver) {
            player.isTurnedOver = false
            console.log(`Player is turned back ${player.player.id}`)
            this.log(`${player.player.id} 将自己的武将牌翻回正面`)
            this.broadcast(player, PlayerInfo.sanitize)
            return
        } else {
            this.log(`---------- 进入 ${player} 的回合 --------`)
            this.roundStats = new RoundStat()
            await this.processStage(player, Stage.ROUND_BEGIN)
            await this.processStage(player, Stage.JUDGE, async ()=>await this.processJudgingStage())
            await this.processStage(player, Stage.TAKE_CARD, async ()=>await this.processTakeCardStage())
            await this.processStage(player, Stage.USE_CARD, async ()=>await this.processUseCardStage())
            await this.processStage(player, Stage.DROP_CARD, async ()=>await this.processDropCardStage())
            await this.processStage(player, Stage.ROUND_END)
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

    public reissue() {
        this.registry.reissue()
    }

    public send(anyone: string, anything: any) {
        this.registry.send(anyone, anything)
    }

    public pubsub(): Pubsub {
        return this.registry.pubsub
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

    public setDeckRemain(size: number) {
        this.currEffect.deckRemain = size
        this.broadcast(this.currEffect)
    }


    /**
     * Rescind all server hints. ignore their responses, if any
     */
    public async rescindAll() {
        this.setPending([])
        //clear our cache
        this.registry.rescindAll()
    }

    public broadcast<F extends object>(obj: F, sanitizer: Sanitizer<F> = null) {
        this.registry.broadcast(obj, sanitizer)
    }

    public log(str: string) {
        this.broadcast(new LogTransit(str))
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
        return this.context.playerInfos.filter(p => !p.isDead && p.player.id !== id)
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

    public async takeFromWorkflow(toPlayer: string, toPos: CardPos, cards: Card[]): Promise<Card[]> {
        // if(!this.stillInWorkflow(cards)) {
        //     console.error('Workflow 没有这些卡了!')
        // }
        // this.broadcast(new TransferCardEffect(null, toPlayer, cards))
        let cardos = this.context.takeFromWorkflow(toPlayer, toPos, cards)
        this.broadcast(CardTransit.fromWorkflow(toPlayer, toPos, cardos))
        await this.events.publish(new CardObtainedEvent(toPlayer, cards.map(c => [c, toPos])))
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
    public async transferCards(fromPlayer: string, toPlayer: string, from: CardPos, to: CardPos, cards: Card[]) {
        this.context.transferCards(fromPlayer, toPlayer, from, to, cards)
        this.broadcast(new CardTransit(fromPlayer, from, toPlayer, to, cards, 1000), CardTransit.defaultSanitize)
        await this.events.publish(new CardBeingTakenEvent(fromPlayer, cards.map(c => [c, from])))
        await this.events.publish(new CardObtainedEvent(toPlayer, cards.map(c => [c, to])))
    }

    public interpret(forPlayer: string, card: ICard): ICard {
        return this.context.interpretCard(forPlayer, card)
    }


    /////////////////////// Flows ////////////////////////

    private async processJudgingStage() {
        let p = this.currPlayer()
        let judgeCards = [...p.getCards(CardPos.JUDGE)].reverse()
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
            this.checkDeath()
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
            //即使没出杀也需要醒酒
            this.currPlayer().isDrunk = false
            this.broadcast(this.currPlayer(), PlayerInfo.sanitize)
        }
    }

    private async processDropCardStage() {
        await new DropCardOp(this.currPlayer()).perform(this)
    }

    private async processStage(info: PlayerInfo, stage: Stage, midProcessor: () => Promise<void> = null) {
        console.log(`[Game Manager] Enter ${info.player.id} ${stage.name} 场上卡牌数 ${this.countAllCards()}`)
        this.checkDeath()
        await new StageStartFlow(info, stage).perform(this)
        this.checkDeath()
        if(!this.roundStats.skipStages.get(stage)) {
            let inStageStart = new InStageStart(info, stage)
            await inStageStart.perform(this)
            if(!inStageStart.endStage) {
                this.setPlayerAndStage(this.currPlayer().player.id, stage)
                this.broadcast(this.currEffect)
                if(midProcessor) {
                    await midProcessor()
                }
                await new InStageEnd(info, stage).perform(this)
            }
        }
        this.checkDeath()
        await new StageEndFlow(info, stage).perform(this)
        this.context.dropWorkflowCards()
        console.log(`[Game Manager] Leave ${info.player.id} ${stage.name}`)
    }

    private checkDeath() {
        if(this.manualEnding) {
            throw this.manualEnding
        }
        if(this.currPlayer().isDead) {
            throw new PlayerDeadInHisRound()
        }
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