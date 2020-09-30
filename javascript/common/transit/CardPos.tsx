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

    //田, 创, 空城, 千幻牌
    ON_GENERAL,
    ON_SUB_GENERAL
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


export const TOP = 'top'
export const BTM = 'btm'

export class CardMovementEvent {
    public constructor(public readonly item: string,
                        public readonly fromPos: string,
                        public readonly toPos: string,
                        public readonly from: number,
                        public readonly to: number) {}

    public applyToTopBtm<T>(top: Array<T>, btm: Array<T>) {
        let leave = this.fromPos === TOP? top : btm
        let item = leave.splice(this.from, 1)
        let toAdd = this.toPos === TOP? top: btm
        toAdd.splice(this.to, 0, item[0])
    }
}

export class CardRearrangeRequest {
    public constructor(public readonly requester: string){}
}