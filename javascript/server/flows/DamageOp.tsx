import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { DamageEffect } from "../../common/transit/EffectTransit";
import DeathOp from "./DeathOp";
import AskSavingOp from "./AskSavingOp";
import Card from "../../common/cards/Card";

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

export enum DamageTimeline {
    DOING_DAMAGE, //造成伤害时
    TAKING_DAMAGE, //受到伤害时
    DID_DAMAGE, //造成伤害后
    TAKEN_DAMAGE, //受到伤害后
}

export enum DamageSource {
    SLASH, DUEL, NAN_MAN, WAN_JIAN, SKILL, SHAN_DIAN, HUO_GONG
}

// function fromSlash(type: CardType) {
//     switch(type) {
//         //slash
//         case CardType.SLASH: return DamageType.NORMAL;
//         case CardType.SLASH_FIRE: return DamageType.FIRE;
//         case CardType.SLASH_THUNDER: return DamageType.THUNDER;
//         default: throw 'Donno'
//     }
// }

function isElemental(type: DamageType) {
    return type === DamageType.FIRE || type === DamageType.THUNDER
}

export default class DamageOp extends Operation<void> {

    public timeline: DamageTimeline = DamageTimeline.DOING_DAMAGE

    public constructor(public source: PlayerInfo, //nullable 闪电无伤害来源
                        public target: PlayerInfo, 
                        public amount: number,
                        public cards: Card[], //cards that caused this, can be null / empty
                        public damageSource: DamageSource,
                        public type: DamageType = DamageType.NORMAL,
                        public doChain: boolean = true) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        let targetId = this.target.player.id

        //藤甲伤害加深?
        await manager.events.publish(this)
        if(this.amount <= 0) {
            console.log('[伤害结算] 伤害被防止, 停止结算')
            return
        }

        this.timeline = DamageTimeline.TAKING_DAMAGE
        await manager.events.publish(this)

        //伤害可以被防止(曹冲? 沮授?)
        // if(this.amount <= 0) {
        //     console.log('[伤害结算] 伤害被防止, 停止结算')
        //     return
        // }


        this.target.damage(this.amount)
        
        //what's done is done
        manager.broadcast(new DamageEffect(targetId))
        manager.broadcast(this.target, PlayerInfo.sanitize)

        //死没死?
        if(this.target.isDying()) {
            //求桃
            let toAsk = manager.getSortedByCurr(true)
            for(let i = 0; i < toAsk.length && this.target.isDying(); ++i) {
                await new AskSavingOp(this.target, toAsk[i]).perform(manager)
            }

            //拯救不力, 还是死了
            if(this.target.isDying()) {
                //this will throw an error and to be caught by game manager
                await new DeathOp(this.target, this.source, this).perform(manager)
            }
        }

        //https://sgs.fandom.com/zh/wiki/%E4%BA%8B%E4%BB%B6%E6%B5%81%E7%A8%8B%EF%BC%9A%E4%BC%A4%E5%AE%B3
        //遗计? 反馈? 刚烈?
        //注意死亡的角色不会触发技能
        this.timeline = DamageTimeline.DID_DAMAGE
        await manager.events.publish(this)
        this.timeline = DamageTimeline.TAKEN_DAMAGE
        await manager.events.publish(this)

        //铁索连环
        if(isElemental(this.type) && this.target.isChained && this.doChain) {
            console.log('[伤害结算] 触发铁索连环')
            this.target.isChained = false
            manager.broadcast(this.target, PlayerInfo.sanitize)

            let chained = manager.context.getRingFromPerspective(this.target.player.id, false).filter(p => p.isChained)
            console.log('[伤害结算] 触发铁索连环于', chained.map(c => c.player.id))
            for(let player of chained) {
                //player might die half way...
                if(!player.isDead) {
                    console.log('[伤害结算] 连环伤害:', player.player.id)
                    player.isChained = false
                    await new DamageOp(this.source, player, this.amount, this.cards, this.damageSource, this.type, false).perform(manager)
                }
            }
        }
    }
    
}