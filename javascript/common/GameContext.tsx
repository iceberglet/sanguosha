import Player, { Identity } from "./Player";
import { General } from "./GeneralManager";
import Card, { cardManager, CardGenre } from "./cards/Card";
import { shuffle, takeFromArray } from "./util/Util";



/**
 * Contains current state of the game
 * All players' situations, card holdings, hp
 * Remaining Deck, dropped cards
 * 
 */
export default class GameContext {

    deck: Card[]
    dropped: Card[]

    //------------- listeners -------------------
    

    //------------- flow queue ------------------

    constructor(public readonly playerInfos: PlayerInfo[]) {

    }

    init() {
        this.deck = cardManager.getShuffledDeck()
        this.dropped = []
        //todo: assign identities
        //todo: let players choose heroes

        // this.roundManager = new RoundManager(this)

        //todo: start the flow

    }

    computeDistance(fromPlayer: string, toPlayer: string): number {
        if(fromPlayer === toPlayer) {
            return 0
        }
        let living = this.playerInfos.filter(p => !p.isDead)
        let from = living.findIndex(p => p.player.id === fromPlayer)
        let to = living.findIndex(p => p.player.id === toPlayer)
        if(from === -1 || to === -1) {
            throw `Can't find these two people, they are dead or don't exist! ${this.playerInfos}, ${fromPlayer}, ${toPlayer}`
        }
        let pFrom = living[from]
        let pTo = living[to]
        let delta = 0
        if(pFrom.findCardAt('equip', 'horse-1')) {
            delta -= 1
        }
        if(pTo.findCardAt('equip', 'horse+1')) {
            delta += 1
        }

        if(from <= to) {
            //we can go by left or go by right
            return Math.min(to - from, this.playerInfos.length - to + from) + delta
        } else {
            return Math.min(from - to, this.playerInfos.length - from + to) + delta
        }
    }

    getPlayer(id: string): PlayerInfo {
        return this.playerInfos.find(p => p.player.id === id)
    }

    getCardsFromDeck(amount: number): Card[] {
        if(amount > this.deck.length) {
            let res = this.deck
            this.deck = shuffle(this.dropped)
            this.dropped = []
            res.push(...this.getCardsFromDeck(amount - res.length))
            return res
        } else {
            return this.deck.splice(0, amount)
        }
    }

    getCardsFromDropped(cardIds: string[]): Card[] {
        return cardIds.map(i => {
            let c = takeFromArray(this.dropped, c => c.id === i)
            if(!c) {
                throw `Unable to find card in dropped pile! ${i}`
            }
            return c
        })
    }

    //也就观星用用吧？？
    placeCardsAtDeckBtm(ids: number[]) {

    }
}

//手牌？ 判定？ 装备？ 田？ 权？ 七星？
export type CardPos = 'deckTop' | 'deckBtm' | 'dropped' | 'workflow' | 'hand' | 'equip' | 'judge' | 'field' | 'power' | 'star'

export class PlayerInfo {
    hp: number
    maxHp: number
    cards = new Map<CardPos, Card[]>()
    isTurnedOver: boolean = false
    isDead: boolean = false

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

    addCard(card: Card, pos: CardPos) {
        if(pos === 'deckTop' || pos ==='deckBtm' || pos === 'dropped') {
            throw `Invalid Position. Player can't get cards to position ${pos}`
        }
        //todo: validate for equip + judge cards
        let arr = this.cards.get(pos) || []
        arr.push(card)
        this.cards.set(pos, arr)
    }

    removeCard(cardId: string) {
        let found = false
        this.cards.forEach(cs => {
            if(takeFromArray(cs, c => c.id === cardId)) {
                found = true
            }
        })

        if(!found) {
            throw `Cannot find card to remove ${cardId} in player ${this}`
        }
    }

    findCardAt(pos: CardPos, genre: CardGenre): Card {
        return this.cards.get(pos)?.find(c => c.type.genre === genre)
    }

    findCard(cardId: string): Card {
        this.cards.forEach(cs => {
            let c = cs.find(c => c.id === cardId)
            if(c) {
                return c
            }
        })
        return null
    }

    isDying(): boolean {
        return this.hp <= 0
    }
}