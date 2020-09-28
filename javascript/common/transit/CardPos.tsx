import { UIPosition } from "../PlayerAction"

export enum CardPos {
    //手牌？ 判定？ 装备？ 
    DECK_TOP,
    DECK_BTM,
    DROPPED,
    WORKFLOW,
    HAND,
    EQUIP,
    JUDGE,

    //田, 创, 空城牌等等
    ON_GENERAL_CARD,
    //额外的因ability的地方: 田？ 权？ 七星？
    TIAN,
}

export function isSharedPosition(pos: CardPos) {
    return pos < CardPos.HAND
}

/**
 * True if this card position is not visible to other players
 * @param pos 
 */
export function isCardPosHidden(pos: CardPos) {
    return pos !== null && pos !== undefined && 
            (pos === CardPos.DECK_TOP || pos === CardPos.DECK_BTM || 
                pos === CardPos.HAND)
}

/**
 * 当玩家把牌搞来搞去的时候发射
 */
export class CardPosChangeEvent {

    public constructor(public readonly pos: UIPosition,
                        public readonly player: string,
                        public readonly from: number,
                        public readonly to: number) {}

}

export class CardRearrangeRequest {
    public constructor(public readonly requester: string){}
}