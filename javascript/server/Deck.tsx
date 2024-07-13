import { shuffle, takeFromArray } from "../common/util/Util"
import {Card, CardManager} from "../common/cards/Card"
import GameEnding from "./GameEnding"

export default class Deck {

    deck: Card[]
    dropped: Card[] = []

    /**
     * 
     * @param cardManager card manager
     * @param updateCb used to notify the number of cards left in deck (not counting dropped pile)
     */
    constructor(cardManager: CardManager, private updateCb: (size: number)=>void){
        this.deck = cardManager.getShuffledDeck()
    }

    getCardsFromTop(amount: number): Card[] {
        //failure = 平局
        if(amount > this.deck.length + this.dropped.length) {
            console.log('牌堆被拿光光了...平局')
            throw new GameEnding([])
        }
        if(amount > this.deck.length) {
            let res = this.deck
            this.deck = shuffle(this.dropped)
            this.dropped = []
            res.push(...this.getCardsFromTop(amount - res.length))
            this.updateCb(this.deck.length)
            return res
        } else {
            let res = this.deck.splice(0, amount)
            this.updateCb(this.deck.length)
            return res
        }
    }

    placeCardsAtTop(cards: Card[]) {
        this.deck.unshift(...cards)
        this.updateCb(this.deck.length)
    }

    //也就观星用用吧？？
    placeCardsAtBtm(cards: Card[]) {
        this.deck.push(...cards)
        this.updateCb(this.deck.length)
    }

    private getCardsFromDropped(cardIds: string[]): Card[] {
        return cardIds.map(i => {
            let c = takeFromArray(this.dropped, c => c.id === i)
            if(!c) {
                throw `Unable to find card in dropped pile! ${i}`
            }
            this.updateCb(this.deck.length)
            return c
        })
    }

    size() {
        return this.deck.length + this.dropped.length
    }
}