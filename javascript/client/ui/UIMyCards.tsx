import UICardRow, { UIMarkRow } from "./UICardRow";
import UIEquipGrid from "./UIEquipGrid";
import { PlayerInfo } from "../../common/PlayerInfo";
import * as React from 'react'
import { CardPos } from "../../common/transit/CardPos";
import { Checker } from "./UIBoard";
import CardTransitManager, { CardAndCoor, CardEndpoint, InCardAndCoor, getCardCoor } from "./CardTransitManager";
import Card from "../../common/cards/Card";
import {v4 as uuidv4} from 'uuid'
import { CardTransit } from "../../common/transit/EffectTransit";

type Prop = {
    info: PlayerInfo,
    hideCards: boolean,
    equipChecker: Checker,
    cardsChecker: Checker,
    cardTransitManager: CardTransitManager
}

export default class UIMyCards extends React.Component<Prop, object> {

    dom: React.RefObject<HTMLDivElement> = React.createRef()
    cardRow: UICardRow

    constructor(p: Prop) {
        super(p)
    }

    componentDidMount() {
        console.log('UICardRow subscribing to card transit')
        let hand = this.props.info.getCards(CardPos.HAND)
        if(hand.length > 0){
            this.cardRow.performAddAnimation(hand.map(c => {
                return {
                    card: c, 
                    coor: null,
                    uuid: uuidv4(),
                    animDuration: 400
                }
            }))
        }

        let endpoint: CardEndpoint = {
            performAddAnimation: (cards: InCardAndCoor[], transit: CardTransit): void => {
                // this.props.info.removeCard()
                cards.forEach(c => this.props.info.addCard(c.card, transit.toPos))
                if(transit.toPos === CardPos.HAND) {
                    //delegate
                    this.cardRow.performAddAnimation(cards)
                } else {
                    this.forceUpdate()
                }
            },

            performRemovalAnimation: (cards: Card[], pos: CardPos, doNotRemove?: boolean): Array<CardAndCoor> => {
                if(!doNotRemove) {
                    // console.log('Removing Cards From Player', this.props.info.player.id, pos, cards)
                    cards.forEach(c => this.props.info.removeFromPos(c.id, pos))
                    //call so that player registers the change
                    this.forceUpdate()
                }
                if(pos === CardPos.HAND) {
                    //delegate
                    return this.cardRow.performRemovalAnimation(cards, pos, doNotRemove)
                }
                let coor = getCardCoor(this.dom.current)
                return cards.map(card => {
                    //take middle point
                    return {card, coor}
                })
            }
        }
        this.props.cardTransitManager.register(endpoint, this.props.info.player.id)
    }

    componentWillUnmount() {
        // console.log('UICardRow unsubscribing to card transit')
        this.props.cardTransitManager.register(null, this.props.info.player.id)
    }

    render() {
        let {info, hideCards, equipChecker, cardsChecker} = this.props
        return <div className='my-cards'>
            <div className='mid' ref={this.dom}>
                {/* 判定牌 */}
                <div className='my-judge'>
                    <UIMarkRow marks={info.getCards(CardPos.JUDGE)} />
                </div>
                {/* 装备牌 */}
                <div className='my-equip'>
                    <UIEquipGrid big={true} cards={info.getCards(CardPos.EQUIP)} checker={equipChecker} />
                </div>
            </div>
            {/* 手牌 */}
            <div className='my-cards'>
                <UICardRow isShown={!hideCards} checker={cardsChecker} ref={r => this.cardRow = r}/>
            </div>
        </div>
    }
}