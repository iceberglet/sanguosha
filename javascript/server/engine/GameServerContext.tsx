import Deck from "../Deck"
import ArrayList from "../../common/util/ArrayList"
import { PlayerInfo } from "../../common/PlayerInfo"
import { GameModeEnum } from "../../common/GameMode"
import GameContext from "../../common/GameContext"
import { CardPos } from "../../common/transit/CardPos"
import Card from "../../common/cards/Card"


export default class GameServerContext extends GameContext {

    deck: Deck
    workflowCards = new ArrayList<Card>()

    constructor(playerInfos: PlayerInfo[], gameMode: GameModeEnum) {
        super(playerInfos, gameMode)
        for(let i = 0; i < playerInfos.length; ++i) {
            playerInfos[i].idx = i
        }
    }
    
    init() {
        this.deck = new Deck(this.getGameMode().cardManager)
        //todo: assign identities
        //todo: let players choose heroes

        // this.roundManager = new RoundManager(this)

        //todo: start the flow

    }

    //将牌从玩家身上扔进workflow堆中(打出或者弃置的牌)
    sendToWorkflow(fromPlayer: string, fromPos: CardPos, cards: Card[]) {
        this.removeFrom(fromPlayer, fromPos, cards.map(w => w.id))
        cards.forEach(this.workflowCards.add)
    }

    takeFromWorkflow(toPlayer: string, toPos: CardPos, cards: string[]) {
        cards.forEach(c => {
            this.workflowCards.removeThat(w => w.id === c)
        })
        this.addTo(toPlayer, toPos, cards)
    }

    //将workflow里面的牌扔进弃牌堆
    dropWorkflowCards() {
        this.addTo(null, CardPos.DROPPED, this.workflowCards._data.map(w => w.id))
        this.workflowCards.clear()
    }
    
    /**
     * 仅改变卡牌的位置, 不作其他动作
     * Move selected cards from one place to another
     * @param fromPlayer null for shared positions
     * @param toPlayer null for shared positions
     * @param from from position
     * @param to to position. 
     * @param cards cards. Sequence depends on this position
     */
    transferCards(fromPlayer: string, toPlayer: string, from: CardPos, to: CardPos, cards: string[]) {
        this.removeFrom(fromPlayer, from, cards)
        this.addTo(toPlayer, to, cards)
    }

    private removeFrom(fromPlayer: string, from: CardPos, cards: string[]) {
        try {
            if(cards.length === 0) {
                return
            }
            if(fromPlayer) {
                cards.forEach(c => this.getPlayer(fromPlayer).removeFromPos(c, from))
            } else {
                switch(from) {
                    case CardPos.WORKFLOW:
                        cards.forEach(c => {
                            if(!this.workflowCards.removeThat(x => x.id === c)) {
                                throw `Unable to find card ${c} in workflow cards!`
                            }
                        })
                        break;
                    default:
                        throw `Can't take cards from this weird position! ${CardPos[from]}`
                }
            }
        } catch (err) {
            console.error('Failed to remove', fromPlayer, from, cards, err)
            console.trace()
        }
    }

    private addTo(toPlayer: string, to: CardPos, cards: string[]) {
        if(toPlayer) {
            cards.forEach(c => this.getPlayer(toPlayer).addCard(this.getGameMode().cardManager.getCard(c), to))
        } else {
            switch(to) {
                case CardPos.DECK_TOP:
                    this.deck.placeCardsAtTop(cards)
                    break
                case CardPos.DECK_BTM:
                    this.deck.placeCardsAtBtm(cards)
                    break
                // case CardPos.WORKFLOW:
                //     cards.forEach(c => this.workflowCards.add(c))
                //     break
                case CardPos.DROPPED:
                    this.deck.dropped.push(...cards.map(this.getGameMode().cardManager.getCard))
                    break
                default: 
                    throw 'Not Possible to send cards to ' + CardPos[to]
            }
        }
    }

}