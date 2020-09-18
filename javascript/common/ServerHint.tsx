import RoundStat from "./RoundStat"
import { Button, UIPosition } from "./PlayerAction"
import Card, { Suit } from "./cards/Card"
import { General } from "./General"
import { GameStats } from "../server/GameStatsCollector"


export enum HintType {
    PLAY_HAND,
    //单纯弃牌
    CHOOSE_CARD,
    //对指定目标出杀, 或没有指定目标的情况下选择目标 
    // 如果有技能之类的可以额外指定杀的目标...
    // 
    PLAY_SLASH,
    //单纯出杀, 无目标 (南蛮 / 决斗)
    SLASH,
    //单纯出闪(目标确定)
    DODGE,
    //若是对濒死的人的hint则可以使用酒
    PEACH,
    WU_XIE,

    SPECIAL,

    /**
     * 选择一名或多名玩家发动技能
     */
    CHOOSE_PLAYER,
    /**
     * 在多个选项中选一个
     */
    MULTI_CHOICE,
    /**
     * Custom UI Panel
     * - 过拆之类的
     */
    UI_PANEL
}

export class ServerHintTransit {
    constructor(
        //unique, incremental number
        public hintId: number, 
        public toPlayer: string, 
        public hint: ServerHint){}
}

//direct buttons are always enabled
//if this button is provided by server AND marked direct (by default) 
//or if this button is not (OK/CANCEL)
//then it's enabled
export function isDirectButton(hint: ServerHint, button: Button): Button {
    let extra = hint.extraButtons?.find(b => b.id === button.id)
    if(extra) {
        return extra.isDirect? extra: null
    }
    if(button.id !== Button.OK.id && button.id !== Button.CANCEL.id && button.isDirect) {
        return button
    }
}

export class Rescind {  
}

export type CardSelectionHint = {
    title: string,
    rowsOfCard: {[key: string]: Array<Card>},
    chooseSize: number
}

export type DuoCardSelectionHint = {
    title: string,
    titleLeft: string,
    titleRight: string,
    rowsOfCard: {[key: string]: [Array<Card>, Array<Card>]},
    chooseSize: number,
    canCancel: boolean
}

export type GeneralSelectionHint = {
    generals: General[]
}

export type DisplayHint = {
    title: string,
    items: Array<Card | General>,
    mode: 'card' | 'general'
}

export type CardSelectionResult = Array<{
    rowName: string,
    idx: number
}>

export type DuoCardSelectionResult = Array<{
    rowName: string,
    idx: number,
    isLeft: boolean
}>
    
//just the ids
export type GeneralSelectionResult = Array<string>

export type CardChoices = {
    cards: {
        [key: string]: Card
    }
    //过河拆桥? 观星?
    mode: 'choose-1' | 'move-around',
    msg: number
}

export type ServerHint = {
    hintType: HintType
    hintMsg: string

    //to invoke custom providers (skills / others)
    specialId?: string

    /**
     * 放了optional?但其实是一定会发的
     */
    roundStat?: RoundStat

    /**
     * 取消操作按钮的文本
     * 若不提供则没有取消操作
     * 
     */
    extraButtons?: Button[]
    /**
     * 令你出此操作的人
     * - 濒死求桃的人
     */
    sourcePlayer?: string
    /**
     * 你的操作对象
     * e.g. 
     */
    targetPlayers?: string[]

    /**
     * 至少需要选择的牌数, 比如弃牌
     * 或者需要选择的玩家数
     */
    minQuantity?: number
    /**
     * 需要选择的牌数, 比如弃牌
     * 或者需要选择的玩家数
     * 弃牌如此多张
     */
    quantity?: number

    /**
     * 选择自己牌的位置
     * 一般只有手牌 / 装备 或者两者都在
     */
    positions?: UIPosition[]

    /**
     * 可以用的花色
     * 火攻 / 张角改判定 / 庞统重铸 会用到
     */
    suits?: Suit[]

    /**
     * 不可以选择的人 / 卡牌
     */
    forbidden?: string[]


    /**
     * 当需要 - 过河拆桥 / 顺手牵羊 / 获得这个牌拿走那个牌 的时候
     * 就要走这个了!
     */
    customRequest?: CustomRequest
}

export type CustomRequest = {
    mode: 'choose' | 'duo-choose' | 'display' | 'game-end'
    //过拆 
    //展示手牌
    //选将
    //牌局结束数据
    //单纯给个true允许你操作
    data: CardSelectionHint | DuoCardSelectionHint | DisplayHint | GeneralSelectionHint | GameStats | boolean
}
