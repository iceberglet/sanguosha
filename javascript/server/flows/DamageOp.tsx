import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { PlayerAction, isCancel, Button } from "../../common/PlayerAction";
import { DamageEffect } from "../../common/transit/EffectTransit";
import { HintType } from "../../common/ServerHint";
import HealOp from "./HealOp";
import DeathOp from "./DeathOp";
import { TextFlashEffect } from "../../common/transit/EffectTransit";

export enum DamageType {
    /**
     * 无属性
     */
    NORMAL,
    /**
     * 火属性
     */
    FIRE,
    /**
     * 雷属性
     */
    THUNDER,
    /**
     * 体力流失
     */
    ENERGY
}

export class DyingEvent {
    public constructor(public who: string){}
}

export default class DamageOp extends Operation<void> {

    public constructor(public source: PlayerInfo, 
        public target: PlayerInfo, 
        public amount: number,
        public cause: PlayerAction,
        public type: DamageType = DamageType.NORMAL) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        let targetId = this.target.player.id

        //裸衣? 伤害加深?
        await manager.beforeFlowHappen.publish(this, targetId)

        //伤害可以被防止
        if(this.amount > 0) {
            this.target.damage(this.amount)
            //todo: 铁索连环
            
            //what's done is done
            manager.broadcast(new DamageEffect(targetId))
            manager.broadcast(this.target, PlayerInfo.sanitize)

            //死没死?
            if(this.target.isDying()) {
                //求桃
                let toAsk = manager.context.getRingFromPerspective(manager.currPlayer().player.id, true, false)
                for(let i = 0; i < toAsk.length && this.target.isDying(); ++i) {
                    let p = toAsk[i]
                    let thisPersonAgree = false
                    do {
                        let require = 1 - this.target.hp
                        let response = await manager.sendHint(p.player.id, {
                            hintType: HintType.PEACH,
                            hintMsg: `${p.player.id === targetId? '你' : targetId} 濒死求桃 (还需要${require}个)`,
                            sourcePlayer: targetId,
                            extraButtons: [Button.CANCEL]
                        })
                        if(!isCancel(response)) {
                            //金主爸爸!!
                            thisPersonAgree = true
                            manager.broadcast(new TextFlashEffect(p.player.id, [targetId], '桃'))
                            await new HealOp(p, this.target, 1, response).perform(manager)
                        } else {
                            thisPersonAgree = false
                        }
                    } while (this.target.isDying() && thisPersonAgree)
                }

                //拯救不力, 还是死了
                if(this.target.isDying()) {
                    //this will throw an error and to be caught by game manager
                    await new DeathOp(this.target, this).perform(manager)
                }
            }

            //遗计? 反馈? 刚烈?
            await manager.afterFlowDone.publish(this, targetId)
        }

    }

    
}