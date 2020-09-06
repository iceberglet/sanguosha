import { shuffle, takeFromArray } from "../common/util/Util"
import Card, {CardManager} from "../common/cards/Card"

export default class Deck {

    deck: Card[]
    dropped: Card[] = []

    constructor(private cardManager: CardManager){
        this.deck = cardManager.getShuffledDeck()
    }

    getCardsFromTop(amount: number): Card[] {
        //todo: failure = 平局
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

    placeCardsAtTop(cards: Card[]) {
        this.deck.unshift(...cards)
    }

    //也就观星用用吧？？
    placeCardsAtBtm(cards: Card[]) {
        this.deck.push(...cards)
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

    size() {
        return this.deck.length + this.dropped.length
    }
}