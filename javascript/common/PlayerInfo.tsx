import Card, { CardGenre } from "./cards/Card"
import { takeFromArray } from "./util/Util"
import {Player} from "./Player"
import { General, Gender, Faction } from "./General"
import { ICard } from "./cards/ICard"
import { DelayedRuse, CardPos, isSharedPosition, isCardPosHidden } from "./transit/CardPos"
import { ReactElement } from "react"


export type Mark = {
    card: Card,
    as: DelayedRuse
}

export class Identity {

    public static ZHU_GONG = new Identity('zhu_gong', '主公')
    public static FAN_ZEI = new Identity('fan_zei', '反贼')
    public static ZHONG_CHEN = new Identity('zhong_chen', '忠臣')
    public static NEI_JIAN = new Identity('nei_jian', '内奸')
    //means we donno yet
    public static UNKNOWN = new Identity('unknown', '未知')
    //means we dont care in this game (国战无身份)
    public static NULL = new Identity('null', '无')


    private constructor(public readonly id: string, public readonly name: string) {

    }
}

/**
 * 用于某些锁定技
 * 如: 天香(你的黑桃都是红桃)
 * 禁酒(你的酒都是杀)
 */
export type CardInterpreter =(card: ICard) => ICard

export const NoopInterpreter: CardInterpreter = (c)=>c

export abstract class PlayerInfo {
    hp: number
    maxHp: number
    //翻面
    isTurnedOver: boolean = false
    //横置
    isChained: boolean = false
    //喝酒了吗
    isDrunk: boolean = false
    isDead: boolean = false
    skills: string[]

    protected cards = new Map<CardPos, Card[]>()
    protected judges: Mark[] = []
    attributes: {[key: string]: any}
    
    cardInterpreter: CardInterpreter = NoopInterpreter

    constructor(public player: Player) {
    }

    /**
     * Called once at game start only, by server
     */
    abstract init(): PlayerInfo

    /**
     * Called when server sends it to players
     */
    abstract sanitize(to: string): PlayerInfo

    /**
     * Get gender of the player
     */
    abstract getGender(): Gender

    /**
     * Get the faction of a player that is NOT us!
     */
    abstract getFaction(): Faction

    /**
     * Used to draw on canvas
     * Container will be pre-defined
     */
    abstract draw(): ReactElement | ReactElement[];

    abstract drawSelf(): ReactElement | ReactElement[];


    heal(amount: number) {
        //sometimes max hp changes O.o
        this.hp = Math.min(this.maxHp, this.hp + amount)
    }

    damage(amount: number) {
        this.hp = this.hp - amount
    }

    changeMax(delta: number) {
        this.maxHp += delta
        this.hp = Math.min(this.hp, this.maxHp)
    }

    addCard(card: Card, pos: CardPos, as: DelayedRuse = null) {
        if(isSharedPosition(pos)) {
            throw `Invalid Position. Player can't get cards to position ${pos}`
        }
        if(pos === CardPos.JUDGE) {
            if(as) {
                this.judges.push({card, as})
            } else if(card.type.isDelayedRuse()) {
                this.judges.push({card, as: card.type.id as DelayedRuse})
            } else {
                throw `Invalid... trying to add judge card but it's not a judge card nor pretending to be one [${card}] [${as}]`
            }
        } else {
            //todo: validate for equip cards
            let arr = this.cards.get(pos) || []
            arr.push(card)
            this.cards.set(pos, arr)
        }
    }

    removeCard(cardId: string) {
        let found = false
        this.cards.forEach(cs => {
            found = !!takeFromArray(cs, c => c.id === cardId)
        })
        if(!found) {
            found = !!takeFromArray(this.judges, m => m.card.id === cardId)
        }
        if(!found) {
            throw `Cannot find card to remove ${cardId} in player ${this}`
        }
    }

    getReach(): number {
        let weapon = this.getCards(CardPos.EQUIP).find(c => c.type.genre === 'weapon')
        return weapon? weapon.type.distance : 1
    }

    getCards(pos: CardPos): Card[] {
        return this.cards.get(pos) || []
    }

    hasCards(): boolean {
        for(let kv of this.cards) {
            if(kv[1].length > 0) {
                return true
            }
        }
        return this.getJudgeCards().length > 0
    }

    getJudgeCards(): Mark[] {
        return this.judges || []
    } 

    findCardAt(pos: CardPos, genre: CardGenre): Card {
        return this.cards.get(pos)?.find(c => c.type.genre === genre)
    }

    findCard(cardId: string): Card {
        for(let kv of this.cards) {
            let c = kv[1].find(c => c.id === cardId)
            if(c) {
                return c
            }
        }
        return null
    }

    isDying(): boolean {
        return this.hp <= 0
    }

    /**
     * return all the cards
     */
    declareDeath() {
        this.hp = 0
        this.isDead = true
    }

    getAllCards(): Array<[Card, CardPos]> {
        let cards: Array<[Card, CardPos]> = []
        this.cards.forEach((v, k)=>{
            v.forEach(cc => cards.push([cc, k]))
        })
        this.judges.forEach(m => {
            cards.push([m.card, CardPos.JUDGE])
        })
        return cards
    }

    //------------------- Serde -----------------
    static sanitize(info: PlayerInfo, sendTo: string): PlayerInfo {
        let copy = info.sanitize(sendTo)
        copy.cards.forEach((v, k, m) => v.forEach((c, i) => {
            if(isCardPosHidden(k) && sendTo !== info.player.id) {
                v.splice(i, 1, Card.DUMMY)
            }
        }))
        return copy
    }
}