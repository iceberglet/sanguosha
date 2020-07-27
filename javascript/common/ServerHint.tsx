

export type HintType = 'play-hand' | 'slash' | 'dodge' | 'peach' | 'skill' |
    'wu_xie'

export type ServerHint = {
    hintId: number  //unique, incremental number
    playerId: string
    isSecret: boolean
    hintType: HintType

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
    targetPlayer?: string[]

    /**
     * 若为true则无视距离
     */
    infiniteReach?: boolean

    /**
     * 可以指定杀的目标
     * 一般为1，有特殊情况，例如拼点成功后的太史慈
     */
    slashNumber?: number
}
