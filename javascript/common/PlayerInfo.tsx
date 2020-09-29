import Card, { CardGenre, CardType } from "./cards/Card"
import { takeFromArray } from "./util/Util"
import {Player} from "./Player"
import { Gender, Faction } from "./General"
import { CardPos, isSharedPosition } from "./transit/CardPos"
import { ReactElement } from "react"
import { SkillButtonProp } from "../client/ui/UIMyPlayerCard"
import * as React from 'react'
import { isSuitRed } from "./cards/ICard"
import { OverlayTrigger, Tooltip } from "react-bootstrap"

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

//id to actual display
//玩家的特殊标记 (潜袭, 铁骑之类的)
export type Mark = {
    [key: string] : string
}

export type Sign = {
    enabled: boolean
    owner: 'player' | 'main' | 'sub'
    //限定技 / 可使用标记
    type: 'limit-skill' | 'usable-sign'
    displayName: string
}

//记号, 比如限定技, 珠联璧合, 阴阳鱼, 先驱啥的
//必须是单独一个字
//value是boolean, true -> 能够发动, false -> 发动过了
export type Signs = {
    [key: string] : Sign
}

export abstract class PlayerInfo {
    //一号位二号位?
    idx: number

    hp: number
    maxHp: number
    //翻面
    isTurnedOver: boolean = false
    //横置
    isChained: boolean = false
    //喝酒了吗
    isDrunk: boolean = false
    isDead: boolean = false

    //在别人想和你计算distance的时候用到
    //当你有 +1 马的时候别人计算与你的距离+1
    //当你有 -1 马的时候你与别人计算距离-1
    //当你有 马术 神曹操技能的时候也会计算这个
    distanceModTargetingOthers: number = 0

    distanceModTargetingMe: number = 0

    //当你计算你的攻击距离的时候用到. 吴六剑?
    reachModifier: number = 0

    cards = new Map<CardPos, Card[]>()

    //阴阳鱼,珠联璧合,先驱,限定技
    signs: Signs = {}

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

    abstract drawSelf(skillButtons: SkillButtonProp[]): ReactElement | ReactElement[];

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

    addCard(card: Card, pos: CardPos) {
        if(isSharedPosition(pos)) {
            throw `Invalid Position. Player can't get cards to position ${CardPos[pos]}`
        }
        if(pos === CardPos.JUDGE && !(card.as || card.type).isDelayedRuse()) {
            throw `必须加判定牌兄dei!!! ${card.id} ${card.as?.name} ${card.type.name}`
        }
        if(pos === CardPos.EQUIP && !card.type.isEquipment()) {
            throw `必须加装备牌兄dei!!! ${card.id} ${card.type.name}`
        }
        // console.log('Adding Card To ', this.player.id, card.id, CardPos[pos])
        let arr = this.cards.get(pos) || []
        arr.push(card)
        this.cards.set(pos, arr)
    }

    /**
     * Remove a card from a hidden position
     * because they are all dummies, just remove the first n ones.
     * @param pos 
     * @param size 
     */
    removeRandomly(pos: CardPos, size: number): Card[] {
        let removed = this.cards.get(pos).splice(0, size)
        if(removed.length !== size) {
            throw `not enough removed! ${size} ${ this.cards.get(pos)} ${removed}`
        }
        return removed
    }

    /**
     * 移除此人身上(手牌/装备/判定/挂着的)牌
     * 如果没能找到, throw error
     * @param cardId 
     * @param cardPos position to remove from
     */
    removeFromPos(cardId: string, cardPos: CardPos) {
        let removed = takeFromArray(this.cards.get(cardPos), c => c.id === cardId)
        if(!removed) {
            throw `Did not find such card! ${cardId} ${CardPos[cardPos]}`
        }
    }

    getReach(): number {
        let weapon = this.getCards(CardPos.EQUIP).find(c => c.type.genre === 'weapon')
        return (weapon? weapon.type.distance : 1) + this.reachModifier
    }

    getCards(pos: CardPos): Card[] {
        return this.cards.get(pos) || []
    }

    /**
     * 在手牌/装备/判定区中有牌的人
     */
    hasCards(): boolean {
        for(let kv of this.cards) {
            if(kv[0] === CardPos.HAND || kv[0] === CardPos.EQUIP || kv[0] === CardPos.JUDGE) {
                if(kv[1].length > 0) {
                    return true
                }
            }
        }
        return false
    }

    hasOwnCards(): boolean {
        for(let kv of this.cards) {
            if(kv[0] === CardPos.HAND || kv[0] === CardPos.EQUIP) {
                if(kv[1].length > 0) {
                    return true
                }
            }
        }
        return false
    }

    hasJudgeCard(type: CardType) {
        // console.log(this.player.id, '有这个延时锦囊??',  type.name, this.getCards(CardPos.JUDGE).find(c => (c.as || c.type).name === type.name))
        return !!this.getCards(CardPos.JUDGE).find(c => (c.as || c.type).name === type.name)
    }

    findCardAt(pos: CardPos, genre: CardGenre): Card {
        return this.cards.get(pos)?.find(c => c.type.genre === genre)
    }

    // findCard(cardId: string): Card {
    //     for(let kv of this.cards) {
    //         let c = kv[1].find(c => c.id === cardId)
    //         if(c) {
    //             return c
    //         }
    //     }
    //     return null
    // }

    isDying(): boolean {
        return this.hp <= 0
    }

    /**
     * return all the cards
     */
    declareDeath() {
        this.hp = 0
        this.isDead = true
        this.isChained = false
        this.isTurnedOver = false
    }

    getAllCards(): Array<[Card, CardPos]> {
        let cards: Array<[Card, CardPos]> = []
        this.cards.forEach((v, k)=>{
            v.forEach(cc => cards.push([cc, k]))
        })
        return cards
    }

    toString(): string {
        return '[' + this.player.id + ']'
    }

    //------------------- Serde -----------------
    static sanitize(info: PlayerInfo, sendTo?: string): PlayerInfo {
        let copy = info.sanitize(sendTo)
        delete copy.cards
        return copy
    }
}


type CardMarkProp = {
    cards: Card[]
    name: string
}

export function CardMark(p: CardMarkProp) {
    if(p.cards.length === 0) {
        return null
    }
    let overlay = (props: any) => <Tooltip {...props}>
                <div className='cards'>
                    {p.cards.map(c => {
                        return <div className={isSuitRed(c.suit)? 'red' : 'black'} key={c.id}>{c.toString()}</div>
                    })}
                </div>
            </Tooltip>

    return <OverlayTrigger placement='auto' overlay={overlay} delay={{show: 1000, hide: 200}}>
        <div className='mark-button'>
            {`${p.name} [${p.cards.length}]`}
        </div>
    </OverlayTrigger>
}