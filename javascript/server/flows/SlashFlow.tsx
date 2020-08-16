import Flow from "../Flow";
import GameManager from "../GameManager";
import { PlayerAction, UIPosition, isCancel, getFromAction } from "../../common/PlayerAction";
import { PlayerInfo } from "../../common/PlayerInfo";
import DamageOp, { DamageType } from "./DamageOp";
import { HintType } from "../../common/ServerHint";
import Card from "../../common/cards/Card";

//marks the fact that this person played 'Dodge'
export class DodgeEvent {
    public constructor(
        public readonly cards: Card[],
        public readonly player: PlayerInfo,
        public readonly against: PlayerInfo){}
}

//玩家出杀的行动
export default class SlashFlow extends Flow {

    public dodgeRequired = 1
    public abort = false
    public hintMsg: string
    public damage = 1
    
    public constructor(public readonly action: PlayerAction, public target: PlayerInfo, public damageType: DamageType) {
        super()
        this.hintMsg = `[${action.actionSource}] 对你出杀, 请出闪`
    }

    public async doNext(manager: GameManager): Promise<boolean> {
        //todo: 确定可以指定他为目标?
        //裸衣增加伤害?
        //会不会转移目标? (游离)
        //雌雄双股剑? > 弃牌然后空城
        //leave to the listeners
        await manager.beforeFlowHappen.publish(this, this.action.actionSource)

        let actor = manager.context.getPlayer(this.action.actionSource)
        if(actor.isDrunk) {
            this.damage += 1
            actor.isDrunk = false
            manager.broadcast(actor, PlayerInfo.sanitize)
            //broadcast this fact
        }


        //被什么弄无效了? 藤甲/仁王盾? 游离了?
        if(this.abort) {
            return true
        }

        //开始杀的结算, 要求出闪
        while(this.dodgeRequired > 0) {
            let response = await manager.sendHint(this.target.player.id, {
                hintType: HintType.DODGE,
                hintMsg: this.hintMsg
            })
            let source = manager.context.getPlayer(this.action.actionSource)
    
            //player gave up on dodging
            if(isCancel(response)) {
                //proceed with damage
                await new DamageOp(source, this.target, this.damage, this.action, this.damageType).perform(manager)
                //remove the card from 'flow' position
                break
            }
            //assume cancel is received?
            let cards = getFromAction(this.action, UIPosition.MY_HAND).map(id => manager.cardManager().getCard(id))
            let dodgeEvent = new DodgeEvent(cards, this.target, source)
            await manager.afterFlowDone.publish(dodgeEvent, this.target.player.id)
        }
        return true
    }
}