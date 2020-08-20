import { Player } from "../Player"
import { Identity } from "../PlayerInfo"
import { General } from "../General"
import { GameModeEnum } from "../GameMode"


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
    QUAN,
    QI_XING
}

export function isSharedPosition(pos: CardPos) {
    return pos < CardPos.HAND
}

export function isCardPosHidden(pos: CardPos) {
    return pos === CardPos.HAND || pos === CardPos.QI_XING
}