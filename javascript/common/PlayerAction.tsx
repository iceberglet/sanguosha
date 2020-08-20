import { ServerHint } from "./ServerHint"


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

    // 其他玩家标记牌
    // PLAYER_TOP,
    // 任意 （诸葛观星）
    AD_HOC,
    // 确定 / 取消 / 技能选项
    BUTTONS
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

    public enabled: boolean = true

    public constructor(public readonly id: string, public readonly display: string) {

    }

    public disable() {
        this.enabled = false
        return this
    }
}

export class PlayerActionTransit {
    public constructor(public hintId: number, public action: PlayerAction) {
        
    }
}

/**
 * 决定这个牌/点击的东西是使用了还是弃置了
 */
export enum Marker {
    USE,   //使用
    DROP,  //弃置
    INVOKE //技能, 装备特性
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
    markers: {[key in UIPosition]?: Marker}
    //this can be anything
    customData?: any
}

/**
 * Get all cards that are marked as "USE"
 * @param action 
 */
export function getCardsUsed(action: PlayerAction): string[] {
    let res: string[] = []
    Object.keys(action.markers).forEach((p: any) => {
        let pos = p as UIPosition
        if(action.markers[pos] === Marker.USE) {
            res.push(...action.actionData[pos])
        }
    })
    return res
}

export function getFromAction(action: PlayerAction, pos: UIPosition): string[] {
    return action.actionData[pos] || []
}

export function isCancel(action: PlayerAction) {
    let buttons = action.actionData[UIPosition.BUTTONS]
    if(buttons.length === 1) {
        return buttons[0] === Button.CANCEL.id
    } else {
        throw `Did not find any button or more than one buttons clicked in player action!! is this even allowed? ${action}`
    }
}