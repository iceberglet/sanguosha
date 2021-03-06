import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { Button } from "../../common/PlayerAction";
import { HintType } from "../../common/ServerHint";
import { PlayerInfo } from "../../common/PlayerInfo";
import PlayerAct from "../context/PlayerAct";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import { CardPos } from "../../common/transit/CardPos";
import { CardType } from "../../common/cards/Card";
import { CardBeingUsedEvent } from "./Generic";

export default class DodgeOp extends Operation<boolean> {

    public playedDodgeSomehow = false
    public dodgeResp: PlayerAct

    public constructor(public readonly target: PlayerInfo, 
                        public readonly source: PlayerInfo, 
                        public readonly numberRequired: number,
                        public readonly hintMsg: string){
        super()
    }

    public async perform(manager: GameManager): Promise<boolean> {

        let needed = this.numberRequired

        while(needed > 0) {
            this.playedDodgeSomehow = false
            //八卦? 倾国?
            await manager.events.publish(this)

            if(this.playedDodgeSomehow) {
                console.log('[Dodge OP] 被八卦啥的闪掉了?')
                needed--
                await manager.events.publish(new DodgePlayed(this.target.player.id))
                continue
            }

            console.log('[Dodge OP] 开始求闪')

            let hintMsg = this.hintMsg
            if(this.numberRequired > 1) {
                hintMsg += `(还需要${needed}张)`
            }

            this.dodgeResp = await manager.sendHint(this.target.player.id, {
                hintType: HintType.DODGE,
                hintMsg: hintMsg,
                extraButtons: [Button.CANCEL] //force cancel button
            })
    
            if(this.dodgeResp.isCancel()) {
                //player gave up on dodging
                //assume cancel is received?
                console.log('[Dodge OP] 闪避失败')
                return false
            } else {
                needed--
                console.log('[Dodge OP] 闪避成功')

                if(this.dodgeResp.skill) {
                    await manager.resolver.onSkillAction(this.dodgeResp, this, manager)
                } else {
                    manager.broadcast(new TextFlashEffect(this.target.player.id, [this.source.player.id], '闪'))
                    //assume he played it
                    let cards = this.dodgeResp.getCardsAtPos(CardPos.HAND)
                    if(cards.length !== 1) {
                        throw `Player played dodge cards but not one card!!!! ${this.dodgeResp.source.player.id} ${cards}`
                    }
                    manager.log(`${this.dodgeResp.source} 打出了 ${cards}`)
                    cards[0].description = `${this.dodgeResp.source} 打出`
                    manager.sendToWorkflow(this.target.player.id, CardPos.HAND, [cards[0]])
                    await manager.events.publish(new CardBeingUsedEvent(this.dodgeResp.source.player.id, cards.map(c => [c, CardPos.HAND]), CardType.DODGE, false, false))
                }

                await manager.events.publish(new DodgePlayed(this.target.player.id))
            }
        }

        return true
    }

}

export class DodgePlayed {

    constructor(public readonly player: string) {

    }
}