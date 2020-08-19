import Flow from "../Flow";
import GameManager from "../GameManager";
import { PlayerAction } from "../../common/PlayerAction";
import { PlayerInfo } from "../../common/PlayerInfo";
import DamageOp, { DamageType } from "./DamageOp";
import DodgeOp from "./DodgeOp";

//玩家出杀的行动
export default class SlashFlow extends Flow {

    public dodgeRequired = 1
    public abort = false
    public damage = 1
    
    public constructor(public readonly action: PlayerAction, 
                        public target: PlayerInfo, 
                        public damageType: DamageType) {
        super()
    }

    public async doNext(manager: GameManager): Promise<boolean> {
        manager.roundStats.slashCount--;

        //todo: 确定可以指定他为目标?
        //裸衣增加伤害? 最后一张手牌,方天画戟询问增加目标?
        //会不会转移目标? (游离)
        //雌雄双股剑? > 弃牌然后空城
        //leave to the listeners
        await manager.beforeFlowHappen.publish(this, this.action.actionSource)

        let actor = manager.context.getPlayer(this.action.actionSource)

        //醒酒
        if(actor.isDrunk) {
            this.damage += 1
            actor.isDrunk = false
            manager.broadcast(actor, PlayerInfo.sanitize)
        }


        //被什么弄无效了? 藤甲/仁王盾? 游离了?
        if(this.abort) {
            console.log('Aborting Slash Action')
            return true
        }

        //开始杀的结算, 要求出闪
        while(this.dodgeRequired > 0) {
            let success = await new DodgeOp(this.target, this.action, this.dodgeRequired).perform(manager)
            if(!success) {
                let source = manager.context.getPlayer(this.action.actionSource)
                await new DamageOp(source, this.target, this.damage, this.action, this.damageType).perform(manager)
                break
            }
            this.dodgeRequired--
        }
        return true
    }
}