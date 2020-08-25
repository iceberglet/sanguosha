import { PlayerInfo } from "../../common/PlayerInfo";
import GameManager from "../GameManager";
import { HintType } from "../../common/ServerHint";
import { Button, UIPosition, getFromAction, isCancel } from "../../common/PlayerAction";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import HealOp from "./HealOp";
import { CardPos } from "../../common/transit/CardPos";

export default class AskSavingOp {

    public constructor(public deadman: PlayerInfo, public goodman: PlayerInfo) {

    }

    public async perform(manager: GameManager): Promise<void> {
        let refused = false
        //急救??
        await manager.events.publish(this)

        let targetId = this.deadman.player.id
        while (this.deadman.isDying()) {
            let require = 1 - this.deadman.hp
            let response = await manager.sendHint(this.goodman.player.id, {
                hintType: HintType.PEACH,
                hintMsg: `${this.goodman.player.id === targetId? '你' : targetId} 濒死求桃 (还需要${require}个)`,
                sourcePlayer: targetId,
                extraButtons: [Button.CANCEL]
            })
            if(!isCancel(response)) {
                //金主爸爸!!
                let card = manager.getCard(getFromAction(response, UIPosition.MY_HAND)[0]);
                //桃, 或者酒
                manager.broadcast(new TextFlashEffect(this.goodman.player.id, [targetId], card.type.name))
                //桃牌扔进workflow
                card.description = `${this.goodman.player.id} 对 ${targetId} 使用 ${card.type.name}`
                manager.sendToWorkflow(this.goodman.player.id, CardPos.HAND, [card])
                await new HealOp(this.goodman, this.deadman, 1, response).perform(manager)
            } else {
                break
            }
        }
    }

}