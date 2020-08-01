import {PlayerActionDriver} from "../client/player-actions/PlayerActionDriver"
import GameContext from "./GameContext"
import { PlayerInfo } from "./PlayerInfo"


class SkillManagerClass {

    allAbilities: Map<string, Skill> = new Map()

    getAbilityByName(name: string) {
        let ab = this.allAbilities.get(name)
        if(!ab) {
            throw `Unknown Ability ${name}`
        }
    }
}

export const SkillManager = new SkillManagerClass()

export abstract class Skill {

    protected constructor(public id: string, public name: string, public desc: string) {
        SkillManager.allAbilities.set(name, this)
        console.log(`Registered Ability ${name}`)
    }

    /**
     * Invoked when this skill is added to a player
     * subsribe to server events here (e.g. 在特定条件下的触发)
     * 或者锁定技(你的酒都是杀之类的)
     * Cannot be called twice
     * @param context 
     * @param playerInfo 
     */
    public abstract onMount(context: GameContext, playerInfo: PlayerInfo): void

    /**
     * Invoked when this skill is removed from a player
     * 比如被蔡文姬断肠
     * unsubscribe to engine events
     * @param context 
     * @param playerInfo 
     */
    public abstract onDismount(context: GameContext, playerInfo: PlayerInfo): void
}

require.context('./abilities', true, /\.tsx$/).keys().forEach(element => {
    require(`./abilities${element.substring(1)}`)
});



/*

杀当闪，闪当杀 - 使用技能后你的牌性质变化
红牌当杀 - 发动技能后牌性变化
（锁定技）- 你的锦囊牌都是杀 - 牌性被锁定


仁德： 选择一张牌到两张牌 - 选择一个人 - 确定
        - 取消              - 取消   - 取消

激将： 选择技能 - 确定
        /      - 取消

武圣： 选择技能 - 选择一张红牌 - （选择目标） - 确定
        /           取消           取消      取消

咆哮： （被动）

观星： 选择确定发动 - 安置牌 - 确定
        取消            /      /

空城： 被动

龙胆： 选择技能 - 选择杀/闪 - （选择目标）- 确定
        /           取消       （取消）   取消

马术： （被动）
铁骑： 选择确定/取消

奇才： （被动）
集智： 选择确定/取消

反馈： 选择确定发动 - 选择一张牌 - 确定
          取消           /        /
鬼才： 选择确定发动 - 选择一张手牌 - 确定
          取消          取消       取消

双雄：- 选择确定发动/取消
      - 出牌阶段选择技能 - 选择花色牌 - 选择角色 - 确定
            /               取消        取消     取消

奇策： - 选择技能 - 选择锦囊牌 - 确定
            /         取消     取消

智愚： - 选择确定发动/取消
*/