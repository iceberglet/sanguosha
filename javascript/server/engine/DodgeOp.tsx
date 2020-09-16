import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { Button } from "../../common/PlayerAction";
import { HintType } from "../../common/ServerHint";
import { PlayerInfo } from "../../common/PlayerInfo";
import PlayerAct from "../context/PlayerAct";

export default class DodgeOp extends Operation<boolean> {

    public playedDodgeSomehow = false
    public dodgeResp: PlayerAct

    public constructor(public readonly target: PlayerInfo, 
                        public readonly source: PlayerInfo, 
                        public readonly numberRequired: number,
                        public readonly hintMsg: string){
        super()
    }

    public async perform(manager: GameManager): Promise<boolean> {

        let needed = this.numberRequired

        while(needed > 0) {
            this.playedDodgeSomehow = false
            //八卦? 倾国?
            await manager.events.publish(this)

            if(this.playedDodgeSomehow) {
                console.log('[Dodge OP] 被八卦啥的闪掉了?')
                needed--
                continue
            }

            console.log('[Dodge OP] 开始求闪')

            let hintMsg = this.hintMsg
            if(this.numberRequired > 1) {
                hintMsg += `(还需要${needed}张)`
            }

            this.dodgeResp = await manager.sendHint(this.target.player.id, {
                hintType: HintType.DODGE,
                hintMsg: hintMsg,
                extraButtons: [Button.CANCEL] //force cancel button
            })
    
            if(this.dodgeResp.isCancel()) {
                //player gave up on dodging
                //assume cancel is received?
                console.log('[Dodge OP] 闪避失败')
                return false
            } else {
                needed--
                console.log('[Dodge OP] 闪避成功')
                await manager.resolver.onDodge(this.dodgeResp, this, manager)
            }
        }

        return true
    }

}