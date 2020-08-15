import RoundStat, { ForbiddenTypes } from "./RoundStat"
import { Button } from "./PlayerAction"


export enum HintType {
    PLAY_HAND,
    //单纯弃牌
    DROP_CARDS,
    //单纯出杀(目标确定)
    SLASH,
    //单纯出闪(目标确定)
    DODGE,
    //若是对濒死的人的hint则可以使用酒
    PEACH,
    WU_XIE,
    SKILL,

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
    return hint.extraButtons?.find(b => b.id === buttonId)
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
     * 弃牌如此多张
     */
    dropNumber?: number
}
