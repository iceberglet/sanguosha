import Flow from "../Flow";
import GameManager from "../GameManager";
import { PlayerAction, UIPosition, isCancel, getCards } from "../../common/PlayerAction";
import { PlayerInfo } from "../../common/PlayerInfo";
import DamageOp from "./DamageOp";
import { HintType } from "../../common/ServerHint";
import Card from "../../common/cards/Card";

//marks the fact that this person played 'Dodge'
export class DodgeEvent {
    public constructor(
        public readonly cards: Card[],
        public readonly player: PlayerInfo,
        public readonly against: PlayerInfo){}
}

export default class SlashFlow extends Flow {

    public dodgeRequired = 1
    public abort = false
    public hintMsg: string
    
    public constructor(public readonly action: PlayerAction, public readonly target: PlayerInfo) {
        super()
        this.hintMsg = `[${action.actionSource}] 对你出杀, 请出闪`
    }

    public async doNext(manager: GameManager): Promise<boolean> {
        //todo: 确定可以指定他为目标?
        //会不会
        //会不会转移目标? (游离)
        //雌雄双股剑? > 弃牌然后空城
        //leave to the listeners
        await manager.beforeFlowHappen.publish(this, this.action.actionSource)

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
                let dmg = 1
                if(source.isDrunk) {
                    source.isDrunk = false
                    manager.broadcast(source, PlayerInfo.sanitize)
                    dmg = 2
                }
                await new DamageOp(source, this.target, dmg, this.action).perform(manager)
                //remove the card from 'flow' position
                break
            }
            //assume cancel is received?
            let dodgeEvent = new DodgeEvent(getCards(this.action, UIPosition.MY_HAND, manager.cardManager()), this.target, source)
            await manager.afterFlowDone.publish(dodgeEvent, this.target.player.id)
        }
        return true
    }
}