import Card, { cardManager } from "./cards/Card";
import { shuffle, takeFromArray } from "./util/Util";
import { PlayerInfo } from "./PlayerInfo";



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
