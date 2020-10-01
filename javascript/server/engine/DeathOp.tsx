import { PlayerInfo } from "../../common/PlayerInfo";
import { CardPos } from "../../common/transit/CardPos";
import Card from "../../common/cards/Card";
import { Operation } from "../Operation";
import GameManager from "../GameManager";
import DamageOp from "./DamageOp";

export enum DeathTimeline {
    /**
     * 显示身份前
     */
    BEFORE_REVEAL,
    /**
     * 显示身份后
     */
    AFTER_REVEAL,
    /**
     * 死亡时
     */
    IN_DEATH,
    /**
     * 死亡后
     */
    AFTER_DEATH
}

//this player is surely dead
//will send event for processing
export default class DeathOp extends Operation<void> {

    timeline = DeathTimeline.BEFORE_REVEAL
    //cards to drop
    //remove stuff from here (曹丕行殇?)
    toDrop: Array<[Card, CardPos]>

    public constructor(public readonly deceased: PlayerInfo, public readonly killer: PlayerInfo, public readonly dmanageOp: DamageOp) {
        super()
    }
    
    public async perform(manager: GameManager): Promise<void> {

        await manager.events.publish(this)

        //检查是否满足游戏结束条件
        this.timeline = DeathTimeline.AFTER_REVEAL
        await manager.events.publish(this)

        //行殇在此
        this.timeline = DeathTimeline.IN_DEATH
        await manager.events.publish(this)

        //physically discard everything
        this.deceased.getAllCards().forEach(cardAndPos => {
            cardAndPos[0].description = `${this.deceased.player.id} 阵亡弃牌`
            manager.sendToWorkflow(this.deceased.player.id, cardAndPos[1], [cardAndPos[0]])
        })

        //show player death. no need to sanitize anymore
        this.deceased.declareDeath()
        manager.broadcast(this.deceased)
        manager.log(this.killer? `${this.killer} 击杀了 ${this.deceased}` : `${this.deceased} 阵亡`)

        //处理奖惩
        this.timeline = DeathTimeline.AFTER_DEATH
        await manager.events.publish(this)

        //删除此武将的技能listeners
        manager.skillRegistry.onPlayerDead(this.deceased.player.id)
    }
}