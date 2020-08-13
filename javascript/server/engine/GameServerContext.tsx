import Deck from "../Deck"
import ArrayList from "../../common/util/ArrayList"
import { PlayerInfo } from "../../common/PlayerInfo"
import { GameModeEnum } from "../../common/GameMode"
import GameContext from "../../common/GameContext"
import { CardPos } from "../../common/transit/CardPos"

export default class GameServerContext extends GameContext {

    deck: Deck
    workflowCards = new ArrayList<string>()

    constructor(playerInfos: PlayerInfo[], gameMode: GameModeEnum) {
        super(playerInfos, gameMode)
    }
    
    init() {
        this.deck = new Deck(this.getGameMode().cardManager)
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
                        if(!this.workflowCards.remove(c)) {
                            throw `Unable to find card ${c} in workflow cards!`
                        }
                    })
                default:
                    throw `Can't take cards from this weird position! ${from}`
            }
        }
        if(toPlayer) {
            cards.forEach(c => this.getPlayer(toPlayer).addCard(this.getGameMode().cardManager.getCard(c), to))
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
                    this.deck.dropped.push(...cards.map(this.getGameMode().cardManager.getCard))
            }
        }
    }

}