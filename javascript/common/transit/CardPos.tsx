
export enum CardPos {
    //手牌？ 判定？ 装备？ 
    DECK_TOP,
    DECK_BTM,
    DROPPED,
    WORKFLOW,
    HAND,
    EQUIP,
    JUDGE,

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