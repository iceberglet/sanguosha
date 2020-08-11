
export class Stage {
    //回合开始阶段
    static ROUND_BEGIN = new Stage('回合开始', 'rgba(128,128,128,0.5)')
    //判定阶段
    static JUDGE = new Stage('判定阶段', 'rgba(255,0,0,0.5)')
    //摸牌阶段
    static TAKE_CARD = new Stage('摸牌阶段', 'rgba(0,255,0,0.5)')
    //出牌阶段
    static USE_CARD = new Stage('出牌阶段', 'rgba(0,255,0,0.5)')
    //弃牌阶段
    static DROP_CARD = new Stage('弃牌阶段', 'rgba(255,0,0,0.5)')
    //回合结束阶段
    static ROUND_END = new Stage('回合结束', 'rgba(128,128,128,0.5)')

    private constructor(public readonly name: string, public readonly color: string) {

    }
}