import { shuffle, takeFromArray } from "../common/util/Util"
import Card, { cardManager } from "../common/cards/Card"

export default class Deck {

    deck: Card[]
    dropped: Card[] = []

    constructor(cards: Card[]){
        this.deck = cards
    }

    getCardsFromTop(amount: number): Card[] {
        if(amount > this.deck.length) {
            let res = this.deck
            this.deck = shuffle(this.dropped)
            this.dropped = []
            res.push(...this.getCardsFromTop(amount - res.length))
            return res
        } else {
            return this.deck.splice(0, amount)
        }
    }

    placeCardsAtTop(ids: string[]) {
        this.deck.unshift(...(ids.map(id => cardManager.getCard(id))))
    }

    //也就观星用用吧？？
    placeCardsAtBtm(ids: string[]) {
        this.deck.push(...(ids.map(id => cardManager.getCard(id))))
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

}