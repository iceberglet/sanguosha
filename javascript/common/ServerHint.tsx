import RoundStat, { ForbiddenTypes } from "./RoundStat"
import { Button, UIPosition } from "./PlayerAction"
import Card, { Suit } from "./cards/Card"


export enum HintType {
    PLAY_HAND,
    //单纯弃牌
    CHOOSE_CARD,
    //对指定目标出杀, 如果有技能之类的可以额外指定杀的目标...
    PLAY_SLASH,
    //单纯出杀, 无目标 (南蛮 / 决斗)
    SLASH,
    //单纯出闪(目标确定)
    DODGE,
    //若是对濒死的人的hint则可以使用酒
    PEACH,
    WU_XIE,


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

export function forbids(hint: ServerHint, type: ForbiddenTypes) {
    return hint.roundStat.forbiddenChoices && hint.roundStat.forbiddenChoices.indexOf(type) >= 0
}

export function isDirectButton(hint: ServerHint, buttonId: string): Button {
    let extra = hint.extraButtons?.find(b => b.id === buttonId)
    if(extra) {
        return extra
    }
    if(buttonId !== Button.OK.id && buttonId !== Button.CANCEL.id) {
        return new Button(buttonId, 'hackish')
    }
}

export class Rescind {  
}

export type CardSelectionHint = {
    title: string,
    rowsOfCard: {[key: string]: Array<Card>},
    mode: 'choose' | 're-arrange'
    numberOnTop?: number
}

export type CardSelectionResult = {
    rowName: string,
    idx: number
}

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
     */
    sourcePlayer?: string
    /**
     * 你的操作对象
     * e.g. 
     * - 濒死求桃的人
     * - 被决斗求无懈可击的人
     */
    targetPlayers?: string[]
    /**
     * 需要选择的牌数, 比如弃牌
     * 弃牌如此多张
     */
    cardNumbers?: number

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
     * 当需要 - 过河拆桥 / 顺手牵羊 / 获得这个牌拿走那个牌 的时候
     * 就要走这个了!
     */
    cardSelectHint?: CardSelectionHint
}
