import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { UIPosition, Button } from "../../common/PlayerAction";
import { CardPos } from "../../common/transit/CardPos";
import { HintType, CardSelectionResult, ServerHint } from "../../common/ServerHint";
import { CardBeingDroppedEvent, gatherCards, findCard, cardAmountAt } from "./Generic";
import Card from "../../common/cards/Card";

export enum DropTimeline {
    BEFORE, AFTER
}
//弃牌阶段
export default class DropCardOp extends Operation<void> {

    limit = 0
    timeline: DropTimeline = DropTimeline.BEFORE
    dropped: Card[] = []

    public constructor(public player: PlayerInfo) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        let myId = this.player.player.id

        //默认玩家的手牌上限为体力值
        this.limit = this.player.hp

        await manager.events.publish(this);

        let amount = Math.max(this.player.getCards(CardPos.HAND).length - this.limit, 0)

        if(amount > 0) {
            let request = new DropCardRequest()
            await request.perform(myId, amount, manager, `弃牌阶段 请弃置${amount}张手牌`)
            this.dropped = request.dropped
        }
        
        this.timeline = DropTimeline.AFTER
        await manager.events.publish(this);
    }
}

/**
 * 
 * @param manager 
 * @param source player to select card
 * @param target player whose card to be selected
 * @param title hint title
 * @param poses where to select cards
 */
export async function SelectACardAt(manager: GameManager, source: PlayerInfo, target: PlayerInfo, title: string, ...poses: CardPos[]): Promise<[Card, CardPos]> {
    let targetPlayer = target
    let cards = gatherCards(targetPlayer, poses, source.player.id)
    if(!cards) {
        console.error('[选牌] 选不了, 此玩家没有牌可以弃置', target.player.id, poses.map(p => CardPos[p]))
        return null
    }
    
    let hint: ServerHint = {
        hintType: HintType.UI_PANEL,
        hintMsg: '请选择一张牌',
        customRequest: {
            mode: 'choose',
            data: {
                rowsOfCard: cards,
                title, // `过河拆桥 > ${this.target}`,
                chooseSize: 1
            }
        }
    }

    let resp = await manager.sendHint(source.player.id, hint)
    let res = resp.customData as CardSelectionResult
    let cardAndPos = findCard(targetPlayer, res)[0]
    let card = cardAndPos[0], pos = cardAndPos[1]
    return [card, pos]
} 

export class DropOthersCardRequest {
    public async perform(manager: GameManager, source: PlayerInfo, target: PlayerInfo, title: string, poses: CardPos[]): Promise<[Card, CardPos]> {
        let targetPlayer = target
        let cards = gatherCards(targetPlayer, poses, source.player.id)
        if(!cards) {
            console.error('[弃牌] 无法弃置, 此玩家没有牌可以弃置')
            return null
        }

        let hint: ServerHint = {
            hintType: HintType.UI_PANEL,
            hintMsg: '请选择一张牌',
            customRequest: {
                mode: 'choose',
                data: {
                    rowsOfCard: cards,
                    title, // `过河拆桥 > ${this.target}`,
                    chooseSize: 1
                }
            }
        }
        console.log('[弃牌] 请求弃牌', hint)
        let resp = await manager.sendHint(source.player.id, hint)
        console.log('[弃牌] 弃置成功!')
        let res = resp.customData as CardSelectionResult
        let cardAndPos = findCard(targetPlayer, res)[0]
        let card = cardAndPos[0], pos = cardAndPos[1]
        manager.log(`${source} 弃置了 ${target} 的 ${card}`)
        card.description = `${target.player.id} 被弃置`
        manager.sendToWorkflow(target.player.id, pos, [card])
        await manager.events.publish(new CardBeingDroppedEvent(target.player.id, [[card, pos]]))
        return cardAndPos
    }
}

export class DropCardRequest {

    dropped: Card[] = []

    /**
     * 若玩家取消, 返回false, 若玩家弃置, 返回true
     * @param targetId 
     * @param amount 需要弃置的牌数. 如果没有这么多则需要全弃 (取较小值)
     * @param manager 
     * @param hintMsg 
     * @param cancelable 
     */
    public async perform(targetId: string, amount: number, manager: GameManager, hintMsg: string, 
                        positions: UIPosition[] = [UIPosition.MY_HAND],
                        cancelable: boolean = false): Promise<boolean> {

        let size = Math.min(amount, cardAmountAt(manager.context.getPlayer(targetId), positions))
        if(size <= 0) {
            console.error('How???')
            return false
        }

        let resp = await manager.sendHint(targetId, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg,
            quantity: size,
            positions: positions,
            extraButtons: cancelable? [Button.CANCEL] : []
        })
        
        if(resp.isCancel()) {
            if(!cancelable) {
                throw 'How is this possible?'
            } else {
                return false
            }
        }

        //remove these cards
        let cardsAndPos = resp.getPosAndCards(CardPos.HAND, CardPos.EQUIP)
        console.log('玩家弃牌: ', targetId, cardsAndPos)

        for(let cp of cardsAndPos) {
            let p: CardPos = cp[0]
            let toDrop = cp[1].map(card => {
                delete card.as
                card.description = `[${targetId}] 弃置`
                this.dropped.push(card)
                return card
            })
            manager.sendToWorkflow(targetId, p, toDrop, false)
            await manager.events.publish(new CardBeingDroppedEvent(targetId, toDrop.map(d => [d, p])))
        }
        return true
    }
}