import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { DamageEffect } from "../../common/transit/EffectTransit";
import DeathOp from "./DeathOp";
import AskSavingOp from "./AskSavingOp";
import Card, { CardType } from "../../common/cards/Card";

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

export enum Timeline {
    DOING_DAMAGE, //造成伤害时
    TAKING_DAMAGE, //受到伤害时
    DID_DAMAGE, //造成伤害后
    TAKEN_DAMAGE, //受到伤害后
}

function fromSlash(type: CardType) {
    switch(type) {
        //slash
        case CardType.SLASH: return DamageType.NORMAL;
        case CardType.SLASH_FIRE: return DamageType.FIRE;
        case CardType.SLASH_THUNDER: return DamageType.THUNDER;
        default: throw 'Donno'
    }
}

function isElemental(type: DamageType) {
    return type === DamageType.FIRE || type === DamageType.THUNDER
}

export default class DamageOp extends Operation<void> {

    public readonly originalDamage: number
    public timeline: Timeline = Timeline.DOING_DAMAGE

    public constructor(public source: PlayerInfo, 
        public target: PlayerInfo, 
        public amount: number,
        public cards: Card[], //cards that caused this
        public type: DamageType = DamageType.NORMAL,
        public doChain: boolean = true) {
        super()
        this.originalDamage = amount
    }

    public async perform(manager: GameManager): Promise<void> {
        let targetId = this.target.player.id

        //藤甲伤害加深?
        await manager.events.publish(this)
        this.timeline = Timeline.TAKING_DAMAGE
        await manager.events.publish(this)

        //伤害可以被防止(曹冲? 沮授?)
        if(this.amount <= 0) {
            return
        }


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
                await new DeathOp(this.target, this).perform(manager)
            }
        }

        //遗计? 反馈? 刚烈?
        this.timeline = Timeline.DID_DAMAGE
        await manager.events.publish(this)
        this.timeline = Timeline.TAKING_DAMAGE
        await manager.events.publish(this)

        //铁索连环
        if(isElemental(this.type) && this.target.isChained && this.doChain) {
            console.log('触发铁索连环')
            this.target.isChained = false
            manager.broadcast(this.target, PlayerInfo.sanitize)

            let chained = manager.context.getRingFromPerspective(this.target.player.id, false).filter(p => p.isChained)
            console.log('触发铁索连环于', chained.map(c => c.player.id))
            for(let player of chained) {
                //player might die half way...
                if(!player.isDead) {
                    console.log('连环伤害:', player.player.id)
                    this.target.isChained = false
                    await new DamageOp(this.source, player, this.originalDamage, this.cards, this.type, false).perform(manager)
                }
            }
        }
    }
    
}