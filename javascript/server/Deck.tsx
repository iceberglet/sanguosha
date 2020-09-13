import { shuffle, takeFromArray } from "../common/util/Util"
import Card, {CardManager} from "../common/cards/Card"

export default class Deck {

    deck: Card[]
    dropped: Card[] = []

    constructor(private cardManager: CardManager, private updateCb: (size: number)=>void){
        this.deck = cardManager.getShuffledDeck()
    }

    getCardsFromTop(amount: number): Card[] {
        //todo: failure = 平局
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