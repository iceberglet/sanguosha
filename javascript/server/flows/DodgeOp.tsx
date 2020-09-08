import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { Button, isCancel } from "../../common/PlayerAction";
import { HintType } from "../../common/ServerHint";
import { PlayerInfo } from "../../common/PlayerInfo";

export default class DodgeOp extends Operation<boolean> {

    public playedDodgeSomehow = false

    public constructor(public readonly target: PlayerInfo, 
                        public readonly source: string, 
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
                needed--
                continue
            }

            console.log('[Dodge OP] 开始求闪')

            let hintMsg = this.hintMsg
            if(this.numberRequired > 1) {
                hintMsg += `(还需要${this.numberRequired}张)`
            }

            let response = await manager.sendHint(this.target.player.id, {
                hintType: HintType.DODGE,
                hintMsg: hintMsg,
                extraButtons: [Button.CANCEL] //force cancel button
            })
    
            if(isCancel(response)) {
                //player gave up on dodging
                //assume cancel is received?
                return false
            } else {
                needed--
                await manager.resolver.onDodge(response, this, manager)
            }
        }

        return true
    }

}