

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
        public hint: ServerHint){}
}

export function forbids(hint: ServerHint, type: ForbiddenTypes) {
    return hint.forbiddenChoices && hint.forbiddenChoices.indexOf(type) >= 0
}

export type ForbiddenTypes = 'slash' | 'wine'

export type ServerHint = {
    hintType: HintType
    hintMsg: string

    /**
     * 取消操作按钮的文本
     * 若不提供则没有取消操作
     * 
     */
    abortButtonMsg?: string
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
     * 不能出杀了? 不能喝酒了?
     */
    forbiddenChoices?: ForbiddenTypes[]

    /**
     * 100 = 无限距离
     * -1 = 不能再出杀
     * 默认(undefined)可以出杀要看距离
     */
    slashReach?: number

    /**
     * 100 = 无限距离
     * -1 = 不能使用
     * 默认(undefined)使用默认距离
     */
    ruseReach?: number

    /**
     * 可以指定杀的目标
     * 一般为1，有特殊情况，例如拼点成功后的太史慈
     */
    slashNumber?: number

    /**
     * 弃牌如此多张
     */
    dropNumber?: number
}
