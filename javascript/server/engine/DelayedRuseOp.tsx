import { Operation, UseEventOperation, RuseOp } from "../Operation";
import GameManager from "../GameManager";
import { WuXieContext } from "./WuXieOp";
import { PlayerInfo } from "../../common/PlayerInfo";
import Card, { CardType } from "../../common/cards/Card";
import DamageOp, { DamageType, DamageSource } from "./DamageOp";
import { checkThat, delay } from "../../common/util/Util";
import { CardPos } from "../../common/transit/CardPos";
import JudgeOp from "./JudgeOp";
import { Stage } from "../../common/Stage";


export class UseDelayedRuseOp extends RuseOp<void> {


    constructor(public readonly card: Card,
                public readonly source: PlayerInfo,
                public readonly sourcePos: CardPos,
                public readonly target: PlayerInfo) {
        super(target, [card], card.as || card.type)
        checkThat(this.ruseType.isDelayedRuse(), '必须得是延时锦囊!!')
    }

    public async doPerform(manager: GameManager) {
        let s = this.source.player.id
        let t = this.target.player.id
        console.log(`${s} 对 ${t} 使用了延时锦囊 ${this.card.id} : ${this.card.as}`)

        //show card in workflow
        manager.sendToWorkflow(s, this.sourcePos, [this.card], true, true)
        //transfer card to judge area
        await manager.transferCards(s, t, this.sourcePos, CardPos.JUDGE, [this.card])
    }
    
    public async onAborted(manager: GameManager): Promise<void> {
        //谦逊? 帷幕?
        //go into junk
        this.card.description = '失效弃置'
        manager.sendToWorkflow(this.source.player.id, this.sourcePos, [this.card])
    }

}

/**
 * 判定开始了!
 * 1. 展示需要判定的延时锦囊
 * 2. 寻求无懈
 * 3. (JudgeOp) 若没有无懈, 展示判定牌 (进入workflow)
 * 4. (JudgeOp) 等待改判, 改判的判定牌进入workflow, 被替换的判定牌可以被拿走
 * 5. (JudgeOp) 判定牌生效, 返回最终判定牌
 * 6. 拿到判定牌, 给入workflow并加入生效/无效effect
 * 7. 进入结果
 */
export class JudgeDelayedRuseOp extends Operation<void> {

    constructor(public readonly player: PlayerInfo,
                public readonly card: Card) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        let type = this.card.as || this.card.type
        let isShanDian = type.name === CardType.SHAN_DIAN.name
        let p = this.player.player.id
        let wuxie = new WuXieContext(manager, type)
        await wuxie.init()
        //闪电则只是 show 一下
        this.card.description = `即将判定 ${p} 的 ${type.name}`
        manager.log(`即将判定 ${p} 的 ${type.name}`)
        manager.sendToWorkflow(p, CardPos.JUDGE, [this.card], true, isShanDian)

        await delay(1000)

        if(await wuxie.doOneRound(this.player)) {
            //被无懈掉了
            console.log(`[延迟锦囊] 被无懈 ${type.name} ${p}`)
            if(type === CardType.SHAN_DIAN) {
                let candidates = manager.getSortedByCurr(false).filter(p => !p.hasJudgeCard(CardType.SHAN_DIAN))
                let next = candidates.length > 0? candidates[0] : this.player
                await new UseDelayedRuseOp(this.card, this.player, CardPos.JUDGE, next).perform(manager)
            } else {
                //drop it
                delete this.card.description
            }
        } else {
            //开始结算
            console.log(`[延迟锦囊] 进入判定 ${type.name} ${p}`)

            let card = await new JudgeOp(`${p} 的 ${type.name} 判定`, p).perform(manager)
            let icard = manager.interpret(p, card)
            console.log(`[延迟锦囊] 判定牌为 ${p} ${card.id} > ${icard.suit}`)

            switch(type) {
                case CardType.LE_BU: 
                    if(icard.suit !== 'heart') {
                        console.log(`[延迟锦囊] 乐不思蜀生效 ${p} ${card.id} > ${icard.suit}`)
                        manager.log(`${p} 的乐不思蜀生效`)
                        manager.roundStats.skipStages.set(Stage.USE_CARD, true)
                    } else {
                        manager.log(`${p} 的乐不思蜀失效`)
                    }
                    break;
                case CardType.BING_LIANG: 
                    if(icard.suit !== 'club') {
                        console.log(`[延迟锦囊] 兵粮寸断生效 ${p} ${card.id} > ${icard.suit}`)
                        manager.log(`${p} 的兵粮寸断生效`)
                        manager.roundStats.skipStages.set(Stage.TAKE_CARD, true)
                    } else {
                        manager.log(`${p} 的兵粮寸断失效`)
                    }
                    break;
                case CardType.SHAN_DIAN: 
                    if(icard.suit === 'spade' && icard.size.size >= 2 && icard.size.size <= 9) {
                        console.log(`[延迟锦囊] 闪电生效 ${p} ${card.id} > ${icard.suit} ${icard.size.size}`)
                        manager.log(`${p} 的闪电生效`)
                        //闪电需要被真正拿下来一下
                        this.card.description = `${p} 的闪电生效!`
                        manager.sendToWorkflow(p, CardPos.JUDGE, [this.card])
                        await new DamageOp(null, manager.context.getPlayer(p), 3, [card], DamageSource.SHAN_DIAN, DamageType.THUNDER).perform(manager)
                    } else {
                        let candidates = manager.getSortedByCurr(false).filter(p => !p.hasJudgeCard(CardType.SHAN_DIAN))
                        let next = candidates.length > 0? candidates[0] : this.player
                        manager.log(`${p} 的闪电失效`)
                        console.log(`[延迟锦囊] 闪电失效, 移给 ${next.player.id}`)
                        await new UseDelayedRuseOp(this.card, this.player, CardPos.JUDGE, next).perform(manager)
                    }
                    break;
                default:
                    throw `未知的延时锦囊??? ${type} ${card.id} ${card.as}`
            }
        }
    }

}