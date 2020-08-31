import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { isCancel, UIPosition, Button, getCardsFromAction } from "../../common/PlayerAction";
import { CardPos } from "../../common/transit/CardPos";
import { HintType, CardSelectionResult, ServerHint } from "../../common/ServerHint";
import { CardBeingDroppedEvent, gatherCards, findCard } from "./Generic";
import { flattenMap } from "../../common/util/Util";

//弃牌阶段
export default class DropCardOp extends Operation<void> {

    amount = 0

    public constructor(public player: PlayerInfo) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        let myId = this.player.player.id

        this.amount = Math.max(this.player.getCards(CardPos.HAND).length - this.player.hp, 0)

        await manager.events.publish(this);

        if(this.amount > 0) {
            await new DropCardRequest().perform(myId, this.amount, manager, `弃牌阶段 请弃置${this.amount}张手牌`)
        }
    }
}

export class DropOthersCardRequest {
    public async perform(manager: GameManager, source: string, target: string, title: string, poses: CardPos[]) {
        let targetPlayer = manager.context.getPlayer(target)

        let hint: ServerHint = {
            hintType: HintType.UI_PANEL,
            hintMsg: '请选择对方一张牌',
            customRequest: {
                mode: 'choose',
                data: {
                    rowsOfCard: gatherCards(targetPlayer, poses),
                    title, // `过河拆桥 > ${this.target}`,
                    chooseSize: 1
                }
            }
        }
        console.log('[弃牌] 请求弃牌', hint)
        let resp = await manager.sendHint(source, hint)
        console.log('[弃牌] 弃置成功!', resp)
        let res = resp.customData as CardSelectionResult
        let cardAndPos = findCard(targetPlayer, res)[0]
        let card = cardAndPos[0], pos = cardAndPos[1]
        card.description = `${target} 被弃置`
        manager.sendToWorkflow(target, pos, [card])
        await manager.events.publish(new CardBeingDroppedEvent(target, [[card, pos]]))
    }
}

export class DropCardRequest {

    /**
     * 若玩家取消, 返回false, 若玩家弃置, 返回true
     * @param targetId 
     * @param amount 
     * @param manager 
     * @param hintMsg 
     * @param cancelable 
     */
    public async perform(targetId: string, amount: number, manager: GameManager, hintMsg: string, 
                        positions: UIPosition[] = [UIPosition.MY_HAND],
                        cancelable: boolean = false): Promise<boolean> {
        let resp = await manager.sendHint(targetId, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg,
            quantity: amount,
            positions: positions,
            extraButtons: cancelable? [Button.CANCEL] : []
        })
        
        if(isCancel(resp)) {
            if(!cancelable) {
                throw 'How is this possible?'
            } else {
                return false
            }
        }

        //remove these cards
        let cards = getCardsFromAction(resp, UIPosition.MY_HAND, UIPosition.MY_EQUIP)
        console.log('玩家弃牌: ', targetId, cards)

        for(let kv of flattenMap(cards)) {
            let p = kv[0]
            let toDrop = kv[1].map(c => {
                let card = manager.getCard(c)
                delete card.as
                card.description = `[${targetId}] 弃置`
                return card
            })
            manager.sendToWorkflow(targetId, p, toDrop, true)
            await manager.events.publish(new CardBeingDroppedEvent(targetId, toDrop.map(d => [d, p])))
        }
        return true
    }
}