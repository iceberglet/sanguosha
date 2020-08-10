import Flow from "../Flow";
import GameContext from "../../common/GameContext";
import GameManager from "../GameManager";
import { PlayerAction, UIPosition, isCancel } from "../../common/PlayerAction";
import { PlayerInfo } from "../../common/PlayerInfo";
import DamageFlow from "./DamageFlow";
import { HintType } from "../../common/ServerHint";


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
        //leave to the listeners
        manager.pubsub.publish(this)

        //被什么弄无效了? 藤甲/仁王盾? 游离了?
        if(this.abort) {
            return true
        }
        //开始杀的结算, 要求出闪
        let response = await manager.sendHint(this.target.player.id, {
            hintType: HintType.DODGE,
            hintMsg: this.hintMsg
        })

        //player gave up on dodging
        if(isCancel(response)) {
            //proceed with damage
            manager.prependFlows(new DamageFlow(manager.context.getPlayer(this.action.actionSource), this.target, 1, this.action))
            //remove the card from 'flow' position
            return true
        } else {

        }
    }

}