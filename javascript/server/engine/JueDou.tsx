import { PlayerAction, Button, isCancel, getFromAction, UIPosition  } from "../../common/PlayerAction";
import GameManager from "../GameManager";
import { SingleRuse } from "./SingleRuseOp";
import { HintType } from "../../common/ServerHint";
import DamageOp, { DamageType } from "../flows/DamageOp";
import { CardType } from "../../common/cards/Card";
import { CardPos } from "../../common/transit/CardPos";
import { SlashOp } from "../flows/SlashOp";

export default class JueDou extends SingleRuse<void> {

    public targetLost: boolean
    public damage: number = 1

    public constructor(
        public ruseAction: PlayerAction
    ) {
        super(ruseAction, CardType.JUE_DOU)
        this.targetLost = true
    }

    /**
     * Call this directly if you don't wanna go for WU_XIE or any abort
     * c.f. 貂蝉.离间
     * @param manager 
     */
    public async doPerform(manager: GameManager) {

        let targetPlayer = manager.context.getPlayer(this.target)
        let me = manager.context.getPlayer(this.ruseAction.actionSource)

        while(true) {
            let curr = this.targetLost? targetPlayer : me
            let issuer = this.targetLost? me: targetPlayer
            let slashed = await new SlashOp(curr, issuer, `${issuer.player.id}和你决斗, 请出杀`).perform(manager)
            if(!slashed) {
                console.log('玩家决斗放弃出杀, 掉血')
                await manager.beforeFlowHappen.publish(this)
                await new DamageOp(issuer, curr, this.damage, this.ruseAction, DamageType.NORMAL).perform(manager)
                break
            } else {
                console.log('又出了一个杀')
                //吕布无双咋办???
                this.targetLost = !this.targetLost
            }
        }
        
    }
}