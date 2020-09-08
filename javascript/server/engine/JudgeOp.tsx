import { Operation } from "../Operation";
import GameManager from "../GameManager";
import Card from "../../common/cards/Card";
import { CardTransit } from "../../common/transit/EffectTransit";
import { delay } from "../../common/util/Util";

export enum JudgeTimeline {

    BEGIN, //开始判定, 还没拿出判定牌
    CONFIRMING, //生效中, 可以改判
    CONFIRMED //生效了!

}
/**
 * 一个判定的过程
 * 返回判定牌
 * 1. 展示判定牌 (进入workflow)
 * 2. 等待改判, 改判的判定牌进入workflow, 被替换的判定牌可以被拿走或扔进弃牌堆, 取决于改判者的技能
 * 3. 判定牌生效, 返回最终判定牌
 */
export default class JudgeOp extends Operation<Card> {

    public judgeCard: Card = null
    public timeline: JudgeTimeline = JudgeTimeline.BEGIN

    constructor(public readonly judgeCardMsg: string,
                public readonly owner: string) {
        super()
    }

    public async perform(manager: GameManager): Promise<Card> {
        await manager.events.publish(this)

        this.judgeCard = manager.context.deck.getCardsFromTop(1)[0]

        this.judgeCard.description = this.judgeCardMsg
        let transit = CardTransit.deckToWorkflow([this.judgeCard])
        transit.specialEffect = 'flip'
        manager.broadcast(transit)
        //and send it to workflow for dropping
        manager.context.workflowCards.add(this.judgeCard)
        await delay(600)

        //改判定??
        this.timeline = JudgeTimeline.CONFIRMING
        await manager.events.publish(this)

        //判定结束了, 发布结果
        let result = this.judgeCard

        //天妒 可在此从workflow拿走判定牌
        this.timeline = JudgeTimeline.CONFIRMED
        await manager.events.publish(this)

        await delay(600)
        return result
    }

}