import { Operation } from "../Flow";
import { getFromAction, PlayerAction, UIPosition, Button, isCancel  } from "../../common/PlayerAction";
import { ICard } from "../../common/cards/ICard";
import GameManager from "../GameManager";
import { SingleRuse } from "./SingleRuseOp";
import { HintType } from "../../common/ServerHint";
import DamageOp, { DamageType } from "../flows/DamageOp";
import { PlayerInfo } from "../../common/PlayerInfo";

export default class JueDou extends SingleRuse<void> {

    public targetLost: boolean
    public damage: number = 1

    public constructor(
        public ruseAction: PlayerAction, 
        public ruseCard: ICard
    ) {
        super(ruseAction, ruseCard)
        this.targetLost = true
    }

    /**
     * Call this if you don't wanna go for WU_XIE or any abort
     * c.f. 貂蝉.离间
     * @param manager 
     */
    public async doPerform(manager: GameManager) {

        let targetPlayer = manager.context.getPlayer(this.target)
        let me = manager.context.getPlayer(this.ruseAction.actionSource)

        while(true) {
            let curr = this.targetLost? targetPlayer : me
            let issuer = this.targetLost? me: targetPlayer
            let resp = await manager.sendHint(curr.player.id, {
                hintType: HintType.SLASH,
                hintMsg: `${issuer.player.id}和你决斗, 请出杀`,
                extraButtons: [new Button(Button.CANCEL.id, '放弃')]
            })
            if(isCancel(resp)) {
                console.log('玩家放弃出杀, 掉血')
                manager.beforeFlowHappen.publish(this, this.ruseAction.actionSource)
                await new DamageOp(issuer, curr, this.damage, this.ruseAction, DamageType.NORMAL).perform(manager)
                break
            } else {
                console.log('又出了一个杀')
                this.targetLost = !this.targetLost
            }
        }
        
    }
}