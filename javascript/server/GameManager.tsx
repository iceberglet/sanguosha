import GameContext from "../common/GameContext";
import { enumValues } from "../common/util/Util";
import Card, { cardManager, CardSize, CardType } from "../common/cards/Card"
import { PlayerInfo, Identity } from "../common/PlayerInfo"
import { General } from "../common/GeneralManager"
import GameTransit from "../common/transit/GameTransit";
import Flow, { PlayerDeadInHisRound } from "./Flow";
import RoundStat from "./RoundStat";
import { PlayerRegistry } from "./PlayerRegistry";
import { ServerHint } from "../common/ServerHint";
import JudgeComputer from "./engine/JudgeComputer";
import ArrayList from "../common/util/ArrayList";
import Pubsub from "../common/util/PubSub";
import { PlayerAction } from "../common/PlayerAction";
import { CardPos } from "../common/transit/ContextTransit";

export enum Stage {
    //回合开始阶段
    ROUND_BEGIN,
    //判定阶段
    JUDGE,
    //摸牌阶段
    TAKE_CARD,
    //出牌阶段
    USE_CARD,
    //弃牌阶段
    DROP_CARD,
    //回合结束阶段
    ROUND_END
}

const stages = enumValues(Stage)

//Manages the rounds
export default class GameManager {

    //index of GameContext#playerInfos
    public currentPlayer: number = 0
    public currentStage: Stage = Stage.ROUND_BEGIN
    public roundStats: RoundStat
    //events go here
    public pubsub: Pubsub

    private currentFlows = new ArrayList<Flow>()

    public constructor(public context: GameContext, private registry: PlayerRegistry) {
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

    public broadcast(obj: any) {
        this.registry.broadcast(obj)
    }

    public prependFlows(...flows: Flow[]) {
        //add to the first of array
        this.currentFlows.addToFront(...flows)
    }

    public getCurrentState(forPlayer: string): GameTransit {
        return new GameTransit(sampleContext().toTransit(forPlayer))
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





function sampleContext() {
    let p = {id: '青青子吟'}
    let cards = cardManager.getShuffledDeck()
    let player = new PlayerInfo(p, Identity.ZHU_GONG, General.standard_zhang_liao)
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
    
    let player2 = new PlayerInfo({id: '欧阳挠挠'}, Identity.ZHONG_CHEN, General.forest_dong_zhuo)
    player2.addCard(cardManager.getShuffledDeck()[0], CardPos.HAND)
    player2.addCard(new Card('spade', CardSize.QUEEN, CardType.ZHANG_BA), CardPos.EQUIP)
    player2.addCard(new Card('spade', CardSize.KING, CardType.DA_YUAN), CardPos.EQUIP)
    player2.addCard(new Card('diamond', CardSize.KING, CardType.HUA_LIU), CardPos.EQUIP)
    player2.addCard(new Card('diamond', CardSize.ACE, CardType.ZHU_QUE), CardPos.JUDGE, 'le_bu')
    player2.hp = 2;

    let player3 = new PlayerInfo({id: '东郭旭銮'}, Identity.FAN_ZEI, General.standard_cao_cao)
    player3.addCard(cardManager.getShuffledDeck()[0], CardPos.HAND)
    player3.addCard(new Card('heart', CardSize.KING, CardType.ZHUA_HUANG), CardPos.EQUIP)

    let player4 = new PlayerInfo({id: '新荷'}, Identity.FAN_ZEI, General.standard_huang_gai)
    player4.addCard(new Card('club', CardSize.JACK, CardType.TIE_SUO), CardPos.JUDGE, 'bing_liang')
    player4.hp = 1

    let player5 = new PlayerInfo({id: 'Iceberglet'}, Identity.FAN_ZEI, General.standard_guan_yu)
    
    let player6 = new PlayerInfo({id: '广东吴彦祖'}, Identity.FAN_ZEI, General.standard_ma_chao)
    player6.addCard(new Card('club', CardSize.TWO, CardType.BA_GUA), CardPos.EQUIP)
    
    let player7 = new PlayerInfo({id: '豫章铁锅'}, Identity.FAN_ZEI, General.standard_zhang_fei)
    player7.hp = 3

    let player8 = new PlayerInfo({id: 'tester-8'}, Identity.FAN_ZEI, General.standard_xu_chu)

    let context = new GameContext([player, player2, player3, player4, player5, player6, player7, player8])

    return context
}