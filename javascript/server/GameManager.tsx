import GameContext from "../common/GameContext";
import Card, { CardManager, CardSize, CardType } from "../common/cards/Card"
import { PlayerInfo, Identity } from "../common/PlayerInfo"
import Flow, { PlayerDeadInHisRound } from "./Flow";
import RoundStat from "../common/RoundStat";
import { PlayerRegistry, Sanitizer } from "./PlayerRegistry";
import { ServerHint, HintType } from "../common/ServerHint";
import ArrayList from "../common/util/ArrayList";
import { SequenceAwarePubSub } from "../common/util/PubSub";
import { PlayerAction, Button, UIPosition } from "../common/PlayerAction";
import { CardPos } from "../common/transit/CardPos";
import { Stage } from "../common/Stage";
import IdentityWarGeneral from "../game-mode-identity/IdentityWarGenerals";
import { GameMode, GameModeEnum } from "../common/GameMode";
import GameServerContext from "./engine/GameServerContext";
import IdentityWarPlayerInfo from "../game-mode-identity/IdentityWarPlayerInfo";
import FactionPlayerInfo from "../game-mode-faction/FactionPlayerInfo";
import FactionWarGeneral from "../game-mode-faction/FactionWarGenerals";
import { Faction } from "../common/General";
import { StageStartFlow, StageEndFlow } from "./flows/StageFlows";
import TakeCardOp from "./flows/TakeCardOp";
import DropCardOp from "./flows/DropCardOp";
import { CurrentPlayerEffect } from "../common/transit/EffectTransit";


//Manages the rounds
export default class GameManager {

    //index of GameContext#playerInfos
    private currentPlayer: number = 0
    public roundStats: RoundStat
    //events go here
    public beforeFlowHappen : SequenceAwarePubSub
    public afterFlowDone : SequenceAwarePubSub
    // public pubsub = new Pubsub()

    private currentFlows = new ArrayList<Flow>()
    private currEffect: CurrentPlayerEffect

    public constructor(public context: GameServerContext, private registry: PlayerRegistry) {
        this.beforeFlowHappen = new SequenceAwarePubSub((id, ids)=>context.sortFromPerspective(id, ids).map(p => p.player.id))
        this.afterFlowDone = new SequenceAwarePubSub((id, ids)=>context.sortFromPerspective(id, ids).map(p => p.player.id))
    }

    public async startGame() {
        while(true) {
            //go to next round
            let player = this.currPlayer()
            if(player.isTurnedOver) {
                player.isTurnedOver = false
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
                } catch (err) {
                    if(err instanceof PlayerDeadInHisRound) {
                        console.log('Player died in his round. Proceeding to next player...')
                        continue;
                    }
                    throw err
                } finally {
                    this.goToNextPlayer()
                }
            }
        }
    }


    //--------------- network interaction -------------------
    public async sendHint(player: string, hint: ServerHint): Promise<PlayerAction> {
        hint.roundStat = this.roundStats
        return await this.registry.sendServerAsk(player, hint)
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
        this.registry.onPlayerReconnected(player)
    }

    public cardManager(): CardManager {
        return this.context.getGameMode().cardManager
    }

    public currPlayer(): PlayerInfo {
        return this.context.playerInfos[this.currentPlayer]
    }
    

    //////////////////////// Card Movement ///////////////////////
    
    public sendToWorkflow(fromPlayer: string, fromPos: CardPos, cards: string[]) {
        this.context.transferCards(fromPlayer, null, fromPos, CardPos.WORKFLOW, cards)
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
    public transferCards(fromPlayer: string, toPlayer: string, from: CardPos, to: CardPos, cards: string[]) {
        this.context.transferCards(fromPlayer, toPlayer, from, to, cards)
    }

    private dropWorkflowCards() {
        this.context.transferCards(null, null, CardPos.WORKFLOW, CardPos.DROPPED, this.context.workflowCards._data)
    }


    /////////////////////// Flows ////////////////////////

    private async processJudgingStage() {
        let p = this.currPlayer()
    }

    private async processTakeCardStage() {
        await new TakeCardOp(this.currPlayer(), 2).perform(this)
    }

    private async processUseCardStage() {
        while(true) {
            let resp = await this.sendHint(this.currPlayer().player.id, {
                hintType: HintType.PLAY_HAND,
                hintMsg: '请出牌',
                roundStat: this.roundStats,
                extraButtons: [new Button('abort', '结束出牌')]
            })
            if(resp.actionData[UIPosition.BUTTONS][0] === 'abort') {
                //进入弃牌阶段
                break;
            }
            //process this action
        }
    }

    private async processDropCardStage() {
        await new DropCardOp(this.currPlayer()).perform(this)
    }

    private async processStage(info: PlayerInfo, stage: Stage, midProcessor: () => Promise<void> = null) {
        console.log(`[Game Manager] Enter ${info.player.id} ${stage.name}`)
        this.currentFlows.addToFront(new StageStartFlow(info, stage))
        await this.processFlows()
        if(!this.roundStats.skipStages.get(stage)) {
            this.broadcast(new CurrentPlayerEffect(this.currPlayer().player.id, stage))
            if(midProcessor) {
                await midProcessor()
            }
        }
        this.currentFlows.addToFront(new StageEndFlow(info, stage))
        await this.processFlows()
        console.log(`[Game Manager] Leave ${info.player.id} ${stage.name}`)
    }

    private async processFlows() {
        while(this.currentFlows.size() > 0) {
            let flow = this.currentFlows.get(0)
            let flowIsDone = await flow.doNext(this)
            if(flowIsDone) {
                //因为我们可能加入了新的flow, 所以需要搜回之前的flow
                this.currentFlows.remove(flow)
                //将workflow中的牌扔进弃牌堆
                this.dropWorkflowCards()
            }
        }
    }

    private goToNextPlayer() {
        do {
            this.currentPlayer = (this.currentPlayer + 1) % this.context.playerInfos.length
        } while(this.currPlayer().isDead)
        console.log('进入下一个玩家的回合:', this.currPlayer().player.id)
    }

}


export function sampleFactionWarContext() {
    let cardManager = GameMode.get(GameModeEnum.FactionWarGame).cardManager
    let p = {id: '青青子吟'}
    let cards = cardManager.getShuffledDeck()
    let player = new FactionPlayerInfo(p, FactionWarGeneral.xiao_qiao, FactionWarGeneral.xu_sheng).init()
    player.addCard(cards.find(c => c.type === CardType.SLASH), CardPos.HAND)
    player.addCard(cards.find(c => c.type === CardType.WAN_JIAN), CardPos.HAND)
    player.addCard(cards.find(c => c.type === CardType.ZHI_JI), CardPos.HAND)
    player.addCard(cards.find(c => c.type === CardType.YUAN_JIAO), CardPos.HAND)
    player.addCard(cards.find(c => c.type === CardType.HUO_GONG), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.SHUN_SHOU), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.GUO_HE), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.JUE_DOU), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.TIE_SUO), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.BING_LIANG), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.LE_BU), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.SHAN_DIAN), CardPos.HAND)
    player.addCard(cards.find(c => c.type === CardType.ZHANG_BA), CardPos.EQUIP)
    player.addCard(cards.find(c => c.type === CardType.REN_WANG), CardPos.EQUIP)
    player.addCard(cards.find(c => c.type === CardType.JUE_YING), CardPos.EQUIP)
    player.addCard(new Card('spade', CardSize.SIX, CardType.LE_BU), CardPos.JUDGE)
    player.addCard(new Card('heart', CardSize.QUEEN, CardType.SHAN_DIAN), CardPos.JUDGE)
    player.isGeneralRevealed = true
    player.isSubGeneralRevealed = true
    player.hp = 2;
    // player.declareDeath()
    
    let player2 = new FactionPlayerInfo({id: '欧阳挠挠'}, FactionWarGeneral.dong_zhuo, FactionWarGeneral.diao_chan).init()
    player2.addCard(cardManager.getShuffledDeck()[0], CardPos.HAND)
    player2.addCard(new Card('spade', CardSize.QUEEN, CardType.ZHANG_BA), CardPos.EQUIP)
    player2.addCard(new Card('spade', CardSize.KING, CardType.DA_YUAN), CardPos.EQUIP)
    player2.addCard(new Card('diamond', CardSize.KING, CardType.HUA_LIU), CardPos.EQUIP)
    player2.addCard(new Card('diamond', CardSize.ACE, CardType.ZHU_QUE), CardPos.JUDGE, 'le_bu')
    player2.declareDeath()

    let player3 = new FactionPlayerInfo({id: '东郭旭銮'}, FactionWarGeneral.lu_xun, FactionWarGeneral.gan_ning).init()
    player3.addCard(cardManager.getShuffledDeck()[0], CardPos.HAND)
    player3.addCard(new Card('heart', CardSize.KING, CardType.ZHUA_HUANG), CardPos.EQUIP)
    player3.isGeneralRevealed = true
    player3.isSubGeneralRevealed = true

    let player4 = new FactionPlayerInfo({id: '新荷'}, FactionWarGeneral.wo_long, FactionWarGeneral.zhu_ge_liang).init()
    player4.addCard(new Card('club', CardSize.JACK, CardType.TIE_SUO), CardPos.JUDGE, 'bing_liang')
    player4.hp = 1
    player4.faction = Faction.YE
    player4.isGeneralRevealed = true
    player4.isSubGeneralRevealed = true

    let player5 = new FactionPlayerInfo({id: 'Iceberglet'}, FactionWarGeneral.zhang_ren, FactionWarGeneral.lv_bu).init()
    player5.isGeneralRevealed = true
    player5.isSubGeneralRevealed = true
    
    let player6 = new FactionPlayerInfo({id: '广东吴彦祖'}, FactionWarGeneral.hua_tuo, FactionWarGeneral.jia_xu).init()
    player6.addCard(new Card('club', CardSize.TWO, CardType.BA_GUA), CardPos.EQUIP)
    player6.isGeneralRevealed = true

    let context = new GameServerContext([player, player2, player3, player4, player5, player6], GameModeEnum.FactionWarGame)
    context.init()

    return context
}


export function sampleIdentityWarContext() {
    let cardManager = GameMode.get(GameModeEnum.IdentityWarGame).cardManager
    let p = {id: '青青子吟'}
    let cards = cardManager.getShuffledDeck()
    let player = new IdentityWarPlayerInfo(p, Identity.ZHU_GONG, IdentityWarGeneral.standard_zhang_liao).init()
    player.addCard(cards.find(c => c.type === CardType.SLASH), CardPos.HAND)
    player.addCard(cards.find(c => c.type === CardType.WAN_JIAN), CardPos.HAND)
    player.addCard(cards.find(c => c.type === CardType.DODGE), CardPos.HAND)
    player.addCard(cards.find(c => c.type === CardType.PEACH), CardPos.HAND)
    player.addCard(cards.find(c => c.type === CardType.HUO_GONG), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.SHUN_SHOU), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.GUO_HE), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.JUE_DOU), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.TIE_SUO), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.BING_LIANG), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.LE_BU), CardPos.HAND)
    // player.addCard(cards.find(c => c.type === CardType.SHAN_DIAN), CardPos.HAND)
    player.addCard(new Card('diamond', CardSize.FIVE, CardType.GUAN_SHI), CardPos.EQUIP)
    player.addCard(new Card('spade', CardSize.SIX, CardType.LE_BU), CardPos.JUDGE)
    player.addCard(new Card('heart', CardSize.QUEEN, CardType.SHAN_DIAN), CardPos.JUDGE)
    player.hp = 2;
    
    let player2 = new IdentityWarPlayerInfo({id: '欧阳挠挠'}, Identity.ZHONG_CHEN, IdentityWarGeneral.forest_dong_zhuo).init()
    player2.addCard(cardManager.getShuffledDeck()[0], CardPos.HAND)
    player2.addCard(new Card('spade', CardSize.QUEEN, CardType.ZHANG_BA), CardPos.EQUIP)
    player2.addCard(new Card('spade', CardSize.KING, CardType.DA_YUAN), CardPos.EQUIP)
    player2.addCard(new Card('diamond', CardSize.KING, CardType.HUA_LIU), CardPos.EQUIP)
    player2.addCard(new Card('diamond', CardSize.ACE, CardType.ZHU_QUE), CardPos.JUDGE, 'le_bu')
    player2.hp = 2;

    let player3 = new IdentityWarPlayerInfo({id: '东郭旭銮'}, Identity.FAN_ZEI, IdentityWarGeneral.standard_cao_cao).init()
    player3.addCard(cardManager.getShuffledDeck()[0], CardPos.HAND)
    player3.addCard(new Card('heart', CardSize.KING, CardType.ZHUA_HUANG), CardPos.EQUIP)

    let player4 = new IdentityWarPlayerInfo({id: '新荷'}, Identity.FAN_ZEI, IdentityWarGeneral.standard_huang_gai).init()
    player4.addCard(new Card('club', CardSize.JACK, CardType.TIE_SUO), CardPos.JUDGE, 'bing_liang')
    player4.hp = 1

    let player5 = new IdentityWarPlayerInfo({id: 'Iceberglet'}, Identity.FAN_ZEI, IdentityWarGeneral.standard_guan_yu).init()
    
    let player6 = new IdentityWarPlayerInfo({id: '广东吴彦祖'}, Identity.FAN_ZEI, IdentityWarGeneral.standard_ma_chao).init()
    player6.addCard(new Card('club', CardSize.TWO, CardType.BA_GUA), CardPos.EQUIP)
    
    let player7 = new IdentityWarPlayerInfo({id: '豫章铁锅'}, Identity.FAN_ZEI, IdentityWarGeneral.standard_zhang_fei).init()
    player7.hp = 3

    let player8 = new IdentityWarPlayerInfo({id: 'tester-8'}, Identity.FAN_ZEI, IdentityWarGeneral.standard_xu_chu).init()

    let context = new GameServerContext([player, player2, player3, player4, player5, player6, player7, player8], GameModeEnum.IdentityWarGame)

    return context
}