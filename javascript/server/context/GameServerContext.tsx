import Deck from "../Deck"
import ArrayList from "../../common/util/ArrayList"
import { PlayerInfo } from "../../common/PlayerInfo"
import GameContext from "../../common/GameContext"
import { CardPos } from "../../common/transit/CardPos"
import Card, { CardManager } from "../../common/cards/Card"
import { GameMode } from "../../common/GameMode"
import { GameModeEnum } from "../../common/GameModeEnum"


export default class GameServerContext extends GameContext {

    deck: Deck
    workflowCards = new ArrayList<Card>()
    public readonly cardManager: CardManager

    constructor(playerInfos: PlayerInfo[], gamemode: GameModeEnum, updateCb: (size: number)=>void) {
        super(playerInfos, gamemode)
        this.cardManager = GameMode.get(gamemode).cardManager
        for(let i = 0; i < playerInfos.length; ++i) {
            playerInfos[i].idx = i
        }
        this.deck = new Deck(this.cardManager, updateCb)
    }

    //将牌从玩家身上扔进workflow堆中(打出或者弃置的牌)
    sendToWorkflow(fromPlayer: string, fromPos: CardPos, cards: Card[]) {
        this.removeFrom(fromPlayer, fromPos, cards)
        cards.forEach(this.workflowCards.add)
    }

    /**
     * 尝试从 workflow 处拿牌, 返回拿到的
     * @param toPlayer 
     * @param toPos 
     * @param cards 
     */
    takeFromWorkflow(toPlayer: string, toPos: CardPos, cards: Card[]): Card[] {
        let res: Card[] = []
        cards.forEach(c => {
            if(this.workflowCards.removeThat(w => w.id === c.id)) {
                console.log('[牌堆] 从Workflow中取出', c.id)
                this.addTo(toPlayer, toPos, [c])
                res.push(c)
            }
        })
        if(cards.length !== res.length) {
            console.error('[牌堆] 没有拿到期待的牌:', cards.map(c => c.id), res.map(c => c.id))
        }
        return res
    }

    //将workflow里面的牌扔进弃牌堆
    dropWorkflowCards() {
        this.addTo(null, CardPos.DROPPED, this.workflowCards._data)
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
    transferCards(fromPlayer: string, toPlayer: string, from: CardPos, to: CardPos, cards: Card[]) {
        this.removeFrom(fromPlayer, from, cards)
        this.addTo(toPlayer, to, cards)
    }

    private removeFrom(fromPlayer: string, from: CardPos, cards: Card[]) {
        try {
            if(cards.length === 0) {
                return
            }
            if(fromPlayer) {
                cards.forEach(c => this.getPlayer(fromPlayer).removeFromPos(c.id, from))
            } else {
                switch(from) {
                    case CardPos.WORKFLOW:
                        cards.forEach(c => {
                            if(!this.workflowCards.removeThat(x => x.id === c.id)) {
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

    private addTo(toPlayer: string, to: CardPos, cards: Card[]) {
        if(toPlayer) {
            cards.forEach(c => this.getPlayer(toPlayer).addCard(c, to))
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
                    this.deck.dropped.push(...cards.map(c => {
                        let card = this.cardManager.getCard(c.id)
                        delete card.as
                        delete card.description
                        return card
                    }))
                    break
                default: 
                    throw 'Not Possible to send cards to ' + CardPos[to]
            }
        }
    }

}