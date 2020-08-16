import { Stage } from "./Stage"


export type ForbiddenTypes = 'slash' | 'wine'

export default class RoundStat {

    skipStages = new Map<Stage, boolean>()

    //出杀的次数
    slashCount: number = 1

    /**
     * 可以指定杀的目标
     * 一般为1，有特殊情况，例如拼点成功后的太史慈
     */
    slashNumber: number = 1

    /**
     * 100 = 无限距离
     * -1 = 不能再出杀
     * 默认(0)距离 > 用武器决定
     */
    slashReach: number = 0

    /**
     * 100 = 无限距离
     * -1 = 不能使用
     * 默认(1)使用默认距离
     */
    ruseReach: number = 1

    /**
     * 不能出杀了? 不能喝酒了?
     */
    forbiddenChoices: ForbiddenTypes[] = []

}