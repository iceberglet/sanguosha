import UICardRow, { UIMarkRow } from "./UICardRow";
import UIEquipGrid from "./UIEquipGrid";
import { PlayerInfo } from "../../common/PlayerInfo";
import * as React from 'react'
import { CardPos, CardPosChangeEvent } from "../../common/transit/CardPos";
import { Checker, ElementStatus } from "./UIBoard";
import CardTransitManager, { CardAndCoor, CardEndpoint, InCardAndCoor, getCardCoor } from "./CardTransitManager";
import Card from "../../common/cards/Card";
import {v4 as uuidv4} from 'uuid'
import { CardTransit } from "../../common/transit/EffectTransit";
import { ClassFormatter } from "../../common/util/Togglable";
import { wrapSign } from "./UIPlayerCard";

type Prop = {
    info: PlayerInfo,
    hideCards: boolean,
    equipChecker: Checker,
    cardsChecker: Checker,
    signsChecker: Checker,
    cardTransitManager: CardTransitManager,
    onCardsShifted: (shift: CardPosChangeEvent)=>void
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

    // componentWillUnmount() {
    //     // console.log('UICardRow unsubscribing to card transit')
    //     this.props.cardTransitManager.register(null, this.props.info.player.id)
    // }

    render() {
        let {info, hideCards, equipChecker, cardsChecker, signsChecker, onCardsShifted } = this.props
        return <div className='my-cards'>
            <div className='mid' ref={this.dom}>
                {/* 标记 */}
                <div className='my-signs'>
                    {Object.keys(info.signs).map(s => {
                        let sign = info.signs[s]
                        let status = signsChecker.getStatus(s)
                        let canSelect = status.isSelectable && sign.enabled
                        let clazz = new ClassFormatter('sign center')
                                            .and(sign.enabled, 'enabled')
                                            .and(canSelect, 'selectable')
                                            .and(status === ElementStatus.SELECTED, 'selected')
                                            .done()
                        return wrapSign(<div key={s} className={clazz} onClick={()=>{
                                    if(canSelect) {
                                        signsChecker.onClicked(s)
                                    }
                                }}>{s}</div>, sign)
                    })}
                </div>
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
                <UICardRow isShown={!hideCards} checker={cardsChecker} ref={r => this.cardRow = r} myName={info.player.id} onCardsShifted={onCardsShifted}/>
            </div>
        </div>
    }
}