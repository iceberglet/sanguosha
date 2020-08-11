import Card, { cardManager } from "./cards/Card";
import { PlayerInfo } from "./PlayerInfo";
import Deck from "../server/Deck";
import { ContextTransit, CardPos } from "./transit/ContextTransit";
import e = require("express");

/**
 * Contains current state of the game
 * All players' situations, card holdings, hp
 * Remaining Deck, dropped cards
 * 
 */
export default class GameContext {

    deck: Deck
    workflowCards = new Set<string>()

    //------------- listeners -------------------
    

    constructor(public readonly playerInfos: PlayerInfo[]) {

    }

    init() {
        this.deck = new Deck(cardManager.getShuffledDeck())
        //todo: assign identities
        //todo: let players choose heroes

        // this.roundManager = new RoundManager(this)

        //todo: start the flow

    }

    /**
     * Move selected cards from one place to another
     * @param fromPlayer null for shared positions
     * @param toPlayer null for shared positions
     * @param from from position
     * @param to to position. 
     * @param cards cards. Sequence depends on this position
     */
    transferCards(fromPlayer: string, toPlayer: string, from: CardPos, to: CardPos, cards: string[]) {
        if(fromPlayer) {
            cards.forEach(c => this.getPlayer(fromPlayer).removeCard(c))
        } else {
            switch(from) {
                case CardPos.WORKFLOW:
                    cards.forEach(c => {
                        if(!this.workflowCards.delete(c)) {
                            throw `Unable to find card ${c} in workflow cards!`
                        }
                    })
                default:
                    throw `Can't take cards from this weird position! ${from}`
            }
        }
        if(toPlayer) {
            cards.forEach(c => this.getPlayer(toPlayer).addCard(cardManager.getCard(c), to))
        } else {
            switch(to) {
                case CardPos.WORKFLOW:
                    cards.forEach(c => this.workflowCards.add(c))
                    break
                case CardPos.DECK_TOP:
                    this.deck.placeCardsAtTop(cards)
                    break
                case CardPos.DECK_BTM:
                    this.deck.placeCardsAtBtm(cards)
                    break
                case CardPos.DROPPED:
                    this.deck.dropped.push(...cards.map(cardManager.getCard))
            }
        }
    }

    //todo: 马术？神曹操？公孙瓒？
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
        if(pFrom.findCardAt(CardPos.EQUIP, 'horse-1')) {
            delta -= 1
        }
        if(pTo.findCardAt(CardPos.EQUIP, 'horse+1')) {
            delta += 1
        }

        if(from <= to) {
            //we can go by left or go by right
            return Math.min(to - from, this.playerInfos.length - to + from) + delta
        } else {
            return Math.min(from - to, this.playerInfos.length - from + to) + delta
        }
    }

    /**
     * 根据当前玩家视角给出其余玩家的排序
     * @param playerId 
     * @param inclusive 是否包含当前玩家. 默认false
     */
    getRingFromPerspective(playerId: string, inclusive: boolean = false): PlayerInfo[] {
        let idx = this.playerInfos.findIndex(p => p.player.id === playerId)
        return [...this.playerInfos.slice(inclusive? idx : idx + 1), ...this.playerInfos.slice(0, idx)]
    }

    /**
     * 根据当前玩家视角排序,用以决定结算顺序
     * @param playerId 当前玩家ID
     * @param ids 需要排序的玩家, 可以包含playerId
     */
    sortFromPerspective(playerId: string, ids: string[]): PlayerInfo[] {
        return this.getRingFromPerspective(playerId, true).filter(info => ids.indexOf(info.player.id) >= 0)
    }

    getPlayer(id: string): PlayerInfo {
        let p = this.playerInfos.find(p => p.player.id === id)
        if(!p) {
            throw `Player Not Found!! ${id}. Available: ${this.playerInfos.map(p => p.player.id)}`
        }
        return p
    }

    toTransit(sendTo: string): ContextTransit {
        return {
            players: this.playerInfos.map(p => PlayerInfo.toTransit(p, sendTo))
        }
    }
}
