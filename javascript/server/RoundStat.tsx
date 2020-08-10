
export default class RoundStat {

    //是否跳过判定阶段
    skipJudge: boolean = false

    //是否跳过摸牌阶段
    skipTakeCard: boolean = false

    //是否跳过出牌阶段
    skipUseCard: boolean = false

    //是否跳过弃牌阶段
    skipDropCard: boolean = false

    //出杀的次数
    slashCount: number = 1

}