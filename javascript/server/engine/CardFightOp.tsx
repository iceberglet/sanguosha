import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { HintType } from "../../common/ServerHint";
import { UIPosition } from "../../common/PlayerAction";
import { CardPos } from "../../common/transit/CardPos";
import Card from "../../common/cards/Card";
import { delay } from "../../common/util/Util";
import { CustomUIData, CardFightData } from "../../client/card-panel/CustomUIRegistry";
import { CardBeingDroppedEvent } from "./Generic";

//必须有手牌
export function canCardFight(a: string, b: string, manager: GameManager) {
    let me = manager.context.getPlayer(a)
    let target = manager.context.getPlayer(b)
    return me.getCards(CardPos.HAND).length > 0 && target.getCards(CardPos.HAND).length > 0
}
/**
 * Returns success
 */
export default class CardFightOp extends Operation<boolean> {

    initiatorCard: Card
    targetCard: Card
    private readonly title: string
    initiatorPoint: number
    targetPoint: number

    constructor(public readonly initiater: PlayerInfo, public readonly target: PlayerInfo, private msg: string){
        super()
        this.title = `${this.initiater.player.id} 拼点 ${this.target}(${msg})`
        if(initiater === target) {
            throw '拼点的对象不能是自己!!' + initiater + ' ' + target
        }
    }

    public async perform(manager: GameManager): Promise<boolean> {
        //1. broadcast the ui panel
        this.broadcast(manager)

        await Promise.all([
            manager.sendHint(this.initiater.player.id, {
                hintType: HintType.CHOOSE_CARD,
                hintMsg: '请选择你要拼点的牌',
                positions: [UIPosition.MY_HAND],
                quantity: 1
                // customRequest: true
            }).then(resp => {
                this.initiatorCard = resp.getSingleCardAndPos()[0]
                this.initiatorCard.description = `${this.initiater} ${this.msg} 拼点牌`
                this.broadcast(manager)
                console.log('[拼点] 发起方的牌为 ', this.initiatorCard.id)
            }),

            manager.sendHint(this.target.player.id, {
                hintType: HintType.CHOOSE_CARD,
                hintMsg: `请选择你要和 ${this.initiater.player.id} 拼点的牌`,
                positions: [UIPosition.MY_HAND],
                quantity: 1
                // customRequest: true
            }).then(resp => {
                this.targetCard = resp.getSingleCardAndPos()[0]
                this.targetCard.description = `${this.target} ${this.msg} 拼点牌`
                this.broadcast(manager)
                console.log('[拼点] 应战方的牌为 ', this.targetCard.id)
            }),
        ])

        //需要弃置这两张牌
        manager.sendToWorkflow(this.initiater.player.id, CardPos.HAND, [this.initiatorCard], false)
        await manager.events.publish(new CardBeingDroppedEvent(this.initiater.player.id, [[this.initiatorCard, CardPos.HAND]]))
        manager.sendToWorkflow(this.target.player.id, CardPos.HAND, [this.targetCard], false)
        await manager.events.publish(new CardBeingDroppedEvent(this.target.player.id, [[this.targetCard, CardPos.HAND]]))

        this.initiatorPoint = this.initiatorCard.size.size
        this.targetPoint = this.targetCard.size.size

        await manager.events.publish(this)
        let success = this.initiatorPoint > this.targetPoint
        console.log('[拼点] 结果成功?', success)
        this.broadcast(manager, false)

        await delay(2000)

        manager.broadcast(new CustomUIData(CustomUIData.STOP, null))
        return success
    }

    private broadcast(manager: GameManager, sanitize: boolean = true) {
        manager.broadcast(new CustomUIData<CardFightData>('card-fight', {
            title: this.title,
            cardLeft: this.initiatorCard,
            cardRight: this.targetCard,
            numberLeft: this.initiatorPoint,
            numberRight: this.targetPoint
        }), sanitize? this.sanitize: null)
    }
    
    private sanitize = (data: CustomUIData<CardFightData>, playerId: string) => {
        let copy =new CustomUIData<CardFightData>(data.type, {
            cardLeft: data.data.cardLeft,
            cardRight: data.data.cardRight,
            title: data.data.title
        })

        if(playerId !== this.initiater.player.id && data.data.cardLeft) {
            copy.data.cardLeft = Card.DUMMY
        }
        if(playerId !== this.target.player.id && data.data.cardRight) {
            copy.data.cardRight = Card.DUMMY
        }
        return copy
    }
}
