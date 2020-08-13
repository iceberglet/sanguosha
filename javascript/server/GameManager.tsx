import GameContext from "../common/GameContext";
import { enumValues } from "../common/util/Util";
import Card, { CardManager, CardSize, CardType } from "../common/cards/Card"
import { PlayerInfo, Identity } from "../common/PlayerInfo"
import Flow, { PlayerDeadInHisRound } from "./Flow";
import RoundStat from "./RoundStat";
import { PlayerRegistry, Sanitizer } from "./PlayerRegistry";
import { ServerHint } from "../common/ServerHint";
import JudgeComputer from "./engine/JudgeComputer";
import ArrayList from "../common/util/ArrayList";
import { SequenceAwarePubSub } from "../common/util/PubSub";
import { PlayerAction } from "../common/PlayerAction";
import { CardPos } from "../common/transit/CardPos";
import { Stage } from "../common/Stage";
import IdentityWarGeneral from "../game-mode-identity/IdentityWarGenerals";
import { GameMode, GameModeEnum } from "../common/GameMode";
import GameServerContext from "./engine/GameServerContext";
import IdentityWarPlayerInfo from "../game-mode-identity/IdentityWarPlayerInfo";


//Manages the rounds
export default class GameManager {

    //index of GameContext#playerInfos
    public currentPlayer: number = 0
    public currentStage: Stage = Stage.ROUND_BEGIN
    public roundStats: RoundStat
    //events go here
    public beforeFlowHappen : SequenceAwarePubSub
    public afterFlowDone : SequenceAwarePubSub
    // public pubsub = new Pubsub()

    private currentFlows = new ArrayList<Flow>()

    public constructor(public context: GameServerContext, private registry: PlayerRegistry) {
        this.beforeFlowHappen = new SequenceAwarePubSub((id, ids)=>context.sortFromPerspective(id, ids).map(p => p.player.id))
        this.afterFlowDone = new SequenceAwarePubSub((id, ids)=>context.sortFromPerspective(id, ids).map(p => p.player.id))
    }

    public async startGame() {
        while(true) {
            //go to next round
            let player = this.context.playerInfos[this.currentPlayer]
            if(player.isTurnedOver) {
                player.isTurnedOver = false
                this.goToNextPlayer()
                continue;
            } else {
                try {
                    this.roundStats = new RoundStat()
                    this.processRoundStart()
                    this.roundStats.skipJudge && await this.processJudgingStage()
                    this.roundStats.skipTakeCard && await this.processTakeCardStage()
                    this.roundStats.skipUseCard && await this.processUseCardStage()
                    this.roundStats.skipDropCard && await this.processDropCardStage()
                    this.processRoundEnd()
                } catch (err) {
                    if(err instanceof PlayerDeadInHisRound) {
                        console.log('Player died in his round. Proceeding to next player...')
                        return
                    }
                    throw err
                }
            }
        }
    }

    public async sendHint(player: string, hint: ServerHint): Promise<PlayerAction> {
        return await this.registry.sendServerAsk(player, hint)
    }

    public broadcast<F extends object>(obj: F, sanitizer: Sanitizer<F> = null) {
        this.registry.broadcast(obj, sanitizer)
    }

    public prependFlows(...flows: Flow[]) {
        //add to the first of array
        this.currentFlows.addToFront(...flows)
    }

    public getCurrentState(forPlayer: string) {
        let context = new GameContext(this.context.playerInfos, this.context.gameMode)
        return context.sanitize(forPlayer)
    }

    public cardManager(): CardManager {
        return this.context.getGameMode().cardManager
    }

    private async processRoundStart() {

    }

    private async processJudgingStage() {
        //todo: 判定开始阶段listener
        let p = this.currPlayer()
        let processor = new JudgeComputer(p, this, this.context)
    }

    private async processTakeCardStage() {
        //todo: 摸排开始阶段listener
    }

    private async processUseCardStage() {

    }

    private async processDropCardStage() {

    }

    private async processRoundEnd() {

    }

    private async processFlows() {
        while(this.currentFlows.size() > 0) {
            let flow = this.currentFlows.get(0)
            let flowIsDone = await flow.doNext(this)
            if(flowIsDone) {
                //因为我们可能加入了新的flow, 所以需要搜回之前的flow
                this.currentFlows.remove(flow)
            }
        }
    }

    private goToNextPlayer() {
        this.currentPlayer = (this.currentPlayer + 1) % this.context.playerInfos.length
        this.currentStage = Stage.ROUND_BEGIN
    }

    private currPlayer(): PlayerInfo {
        return this.context.playerInfos[this.currentPlayer]
    }

}





export function sampleContext() {
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