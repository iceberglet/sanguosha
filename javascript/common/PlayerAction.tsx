import { ServerHint, CardSelectionResult, GeneralSelectionResult } from "./ServerHint"
import { CardPos } from "./transit/CardPos"


export enum UIPosition {
    // 玩家手牌
    MY_HAND,
    // 玩家技能
    MY_SKILL,
    // 玩家装备牌
    MY_EQUIP,
    // 玩家判定牌
    MY_JUDGE,
    // 玩家标记牌
    // MY_TOP,
    // 玩家 或 其他玩家
    PLAYER,

    // 置于你武将牌上的牌
    ON_MY_GENERAL,
    ON_MY_SUB_GENERAL,
    // 确定 / 取消 / 技能选项
    BUTTONS,
    // 标记 （阴阳鱼，先驱，珠联璧合）
    SIGNS
}

export function isPositionForCard(ui: UIPosition) {
    return ui !== UIPosition.MY_SKILL && ui !== UIPosition.PLAYER && ui !== UIPosition.BUTTONS
}

export type PlayerUIAction = {
    actionArea: UIPosition
    itemId: string
}

export class Button {

    public static OK = new Button('ok', '确定')
    public static CANCEL = new Button('cancel', '取消')
    /**
     * Direct buttons always ends player action and submits data
     */
    public isDirect = true

    public constructor(public readonly id: string, public readonly display: string, public enabled: boolean = true) {

    }

    public disable() {
        this.enabled = false
        return this
    }

    public inDirect() {
        this.isDirect = false
        return this
    }
}

export class PlayerActionTransit {
    public constructor(public hintId: number, public action: PlayerAction) {
        
    }
}


/**
 * 每个玩家的操作都是一个Player Action
 * 操作必须在服务器有提示的情况下才可以发生
 * 操作一般需要点确定才可以完结发给服务器
 * 操作可以取消以便重新选
 * 
 * ServerHint:出牌阶段 > 选择杀 > 选择一名角色 > 确定 => 发给服务器操作
 * ServerHint:出牌阶段 > 选择桃 > 确定 => 发给服务器操作
 * ServerHint:闪 > 选择技能 / 防具(八卦) / 手牌 > 确定 => 发给服务器操作
 */
export type PlayerAction = {
    serverHint: ServerHint
    actionSource: string
    actionData: {[key in UIPosition]?: string[]}
    //this can be anything
    //五谷丰登会返回卡牌名
    customData?: CardSelectionResult | GeneralSelectionResult | string
}
