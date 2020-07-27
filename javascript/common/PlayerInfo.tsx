import Card, { CardGenre } from "./cards/Card"
import { takeFromArray } from "./util/Util"
import Player, { Identity } from "./Player"
import { General } from "./GeneralManager"

//手牌？ 判定？ 装备？ 田？ 权？ 七星？
export type CardPos = 'deckTop' | 'deckBtm' | 'dropped' | 'workflow' | 'hand' | 'equip' | 'judge' | 'field' | 'power' | 'star'

type DelayedRuse = 'le_bu' | 'bing_liang' | 'shan_dian'
export type Mark = {
    card: Card,
    as: DelayedRuse
}

export class PlayerInfo {
    hp: number
    maxHp: number
    private cards = new Map<CardPos, Card[]>()
    private judges: Mark[] = []
    isTurnedOver: boolean = false
    isDead: boolean = false
    isChained: boolean = false
    skills: string[]

    constructor(
        public player: Player, 
        public identity: Identity, 
        public general: General) {
        this.hp = general.hp
        this.maxHp = general.hp
    }

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
        if(pos === 'deckTop' || pos ==='deckBtm' || pos === 'dropped') {
            throw `Invalid Position. Player can't get cards to position ${pos}`
        }
        if(pos === 'judge') {
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
            if(takeFromArray(cs, c => c.id === cardId)) {
                found = true
            }
        })
        if(!found) {
            takeFromArray(this.judges, m => m.card.id === cardId)
        }

        if(!found) {
            throw `Cannot find card to remove ${cardId} in player ${this}`
        }
    }

    getReach(): number {
        let weapon = this.getCards('equip').find(c => c.type.genre === 'weapon')
        return weapon? weapon.type.distance : 1
    }

    getCards(pos: CardPos): Card[] {
        return this.cards.get(pos) || []
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
}