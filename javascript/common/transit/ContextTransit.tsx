import { Player } from "../Player"
import { Identity } from "../PlayerInfo"
import { General } from "../GeneralManager"


//手牌？ 判定？ 装备？ 田？ 权？ 七星？
export type CardPos = 'deckTop' | 'deckBtm' | 'dropped' | 'workflow' | 'hand' | 'equip' | 'judge' | 'field' | 'power' | 'star'

export type DelayedRuse = 'le_bu' | 'bing_liang' | 'shan_dian'

export type CardTransit = {
    cardId: string
    pos: CardPos
    ruse?: DelayedRuse
}

export type PlayerTransit = {
    player: Player
    identity: Identity
    general: General
    //todo: skills
    skills: string[]

    cards: CardTransit[]
    //e.g. 发动过了锁定技了? 觉醒了? 暴怒标记?
    attributes: {[key: string]: any}

    hp: number
    maxHp: number
    isTurnedOver: boolean
    isChained: boolean
    isDead: boolean
}

export type ContextTransit = {
    players: Array<PlayerTransit>
}