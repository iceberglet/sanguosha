

// export type Action = '摸排'

type ServerHint = {
    playerId: string
    isSecret: boolean

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
type PlayerAction = {
    actionType: 'slash' | 'dodge' | 'use-equipment' | 'use-skill'
    actionSource: string
    actionTargets: string[]
    sourceCards?: string[]
    sourceSkill: string
}

/**
 * 每个ServerHint产生一个PlayerActionDriver
 * Driver需要控制哪些东西玩家可以点，哪些玩家不能点
 * Driver收集完玩家的input之后产生一个Operation发送给Server
 * 
 * - 手牌
 * - 装备牌
 * - 技能
 * - 其他人
 * - 其他人的牌* (顺手牵羊，过河拆桥，反馈)
 * - 观星
 */
export class PlayerActionDriver {

}