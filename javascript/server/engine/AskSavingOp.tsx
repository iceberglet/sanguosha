import { PlayerInfo } from "../../common/PlayerInfo";
import GameManager from "../GameManager";
import { HintType } from "../../common/ServerHint";
import { Button } from "../../common/PlayerAction";
import { CardPos } from "../../common/transit/CardPos";
import { CardBeingUsedEvent } from "./Generic";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import HealOp from "./HealOp";

export class AskSavingAround {

    toAsk: PlayerInfo[]

    constructor(public deadman: PlayerInfo) {

    }

    public async perform(manager: GameManager) {
        let toAsk = manager.getSortedByCurr(true)

        //完杀?
        await manager.events.publish(this)

        for(let i = 0; i < toAsk.length && this.deadman.isDying(); ++i) {
            await new AskSavingOp(this.deadman, toAsk[i]).perform(manager)
        }
    }
}

/**
 * 濒死求桃
 * 本人可以出酒
 * 濒死技能可以在轮到你的时候发动
 *  - 不屈,涅槃,急救等等
 */
export default class AskSavingOp {

    public constructor(public deadman: PlayerInfo, public goodman: PlayerInfo) {

    }

    public async perform(manager: GameManager): Promise<void> {
        //不屈, 涅槃 等等 均在此发动        
        await manager.events.publish(this)

        let targetId = this.deadman.player.id

        //注意, 老版周泰不适合这种血量判断 (可以死血呆下去...)
        while (this.deadman.isDying()) {
            let require = 1 - this.deadman.hp
            let response = await manager.sendHint(this.goodman.player.id, {
                hintType: HintType.PEACH,
                hintMsg: `${this.goodman.player.id === targetId? '你' : targetId} 濒死求桃 (还需要${require}个)`,
                sourcePlayer: targetId,
                extraButtons: [Button.CANCEL]
            })
            //todo: put this in resolver
            if(!response.isCancel()) {
                if(response.skill) {
                    await manager.resolver.onSkillAction(response, this, manager)
                } if(response.signChosen) {
                    await manager.resolver.onSignAction(response, this, manager)
                } else {
                    //金主爸爸!!
                    let card = response.getSingleCardAndPos()[0];
                    //桃, 或者酒
                    let goodman = this.goodman.player.id
                    let deadman = this.deadman.player.id
                    manager.broadcast(new TextFlashEffect(goodman, [deadman], card.type.name))
                    card.description = `${goodman} 对 ${deadman} 使用 ${card.type.name}`                
                    //桃牌扔进workflow
                    manager.sendToWorkflow(goodman, CardPos.HAND, [card])
                    await manager.events.publish(new CardBeingUsedEvent(goodman, [[card, CardPos.HAND]], card.type, false, false))
                    await new HealOp(this.goodman, this.deadman, 1).perform(manager)
                }
            } else {
                break
            }
        }
    }

}