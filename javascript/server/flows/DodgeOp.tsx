import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerAction, Button, isCancel, getFromAction, UIPosition } from "../../common/PlayerAction";
import { HintType } from "../../common/ServerHint";
import { PlayerInfo } from "../../common/PlayerInfo";
import { CardPos } from "../../common/transit/CardPos";
import { TextFlashEffect } from "../../common/transit/EffectTransit";

export default class DodgeOp extends Operation<boolean> {

    public success = false

    public constructor(public readonly target: PlayerInfo, public readonly slashAction: PlayerAction, public readonly numberRequired: number){
        super()
    }

    public async perform(manager: GameManager): Promise<boolean> {

        await manager.beforeFlowHappen.publish(this, this.target.player.id)

        if(!this.success) {

            let hintMsg = `[${this.slashAction.actionSource}] 对你出杀, 请出闪`
            if(this.numberRequired > 1) {
                hintMsg += `(共需要${this.numberRequired}张)`
            }

            let response = await manager.sendHint(this.target.player.id, {
                hintType: HintType.DODGE,
                hintMsg: hintMsg,
                extraButtons: [Button.CANCEL] //force cancel button
            })
    
            if(isCancel(response)) {
                //player gave up on dodging
                //assume cancel is received?
                this.success = false
            } else {
                manager.broadcast(new TextFlashEffect(this.target.player.id, [this.slashAction.actionSource], '闪'))
                //assume he played it
                let cards = getFromAction(response, UIPosition.MY_HAND).map(id => manager.getCard(id))
                if(cards.length !== 1) {
                    throw `Player played dodge cards but not one card!!!! ${response.actionSource} ${cards}`
                }

                manager.sendToWorkflow(this.target.player.id, CardPos.HAND, [{cardId: cards[0].id, source: response.actionSource}])
                this.success = true
            }
        }

        await manager.afterFlowDone.publish(this, this.target.player.id)
        return this.success
    }

}