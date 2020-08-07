

export type HintType = 'play-hand' | 'slash' | 'dodge' | 'peach' | 'wu_xie' | 'skill' | 'drop-cards'

export class ServerHintTransit {
    constructor(public hint: ServerHint){}
}

export type ServerHint = {
    hintId: number  //unique, incremental number
    playerId: string
    isSecret: boolean
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
