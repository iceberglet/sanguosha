import { Stage } from "./Stage"

export const WINE_TAKEN = 'WINE_TAKEN'

export default class RoundStat {

    skipStages = new Map<Stage, boolean>()

    //出杀的次数
    slashCount: number = 0

    //最多出杀的次数 (技能/连弩可以增加这个)
    slashMax: number = 1

    /**
     * 可以指定杀的目标
     * 一般为1，有特殊情况，例如拼点成功后的太史慈
     */
    slashNumber: number = 1

    /**
     * 100 = 无限距离
     * 默认(0)距离 > 用武器决定
     */
    slashReach: number = 0

    /**
     * 100 = 无限距离
     * -1 = 不能使用
     * 默认(1)使用默认距离
     */
    shunshouReach: number = 1

    /**
     * 100 = 无限距离
     * -1 = 不能使用
     * 默认(1)使用默认距离
     */
    binLiangReach: number = 1

    /**
     * 不能喝酒了?
     * 一回合一次的技能?
     */
    customData: {[key: string]: any} = {}

}