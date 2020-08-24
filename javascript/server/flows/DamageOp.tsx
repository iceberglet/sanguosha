import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { PlayerAction } from "../../common/PlayerAction";
import { DamageEffect } from "../../common/transit/EffectTransit";
import DeathOp from "./DeathOp";
import AskSavingOp from "./AskSavingOp";
import { CardType } from "../../common/cards/Card";

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

export class DyingEvent {
    public constructor(public who: string){}
}

export default class DamageOp extends Operation<void> {

    public readonly originalDamage: number

    public constructor(public source: PlayerInfo, 
        public target: PlayerInfo, 
        public amount: number,
        public cause: PlayerAction,
        public type: DamageType = DamageType.NORMAL,
        public doChain: boolean = true) {
        super()
        this.originalDamage = amount
    }

    public async perform(manager: GameManager): Promise<void> {
        let targetId = this.target.player.id

        //藤甲伤害加深?
        await manager.beforeFlowHappen.publish(this)

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
            let toAsk = manager.context.getRingFromPerspective(manager.currPlayer().player.id, true, false)
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
        await manager.afterFlowDone.publish(this)

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
                    await new DamageOp(this.source, player, this.originalDamage, this.cause, this.type, false).perform(manager)
                }
            }
        }
    }
    
}