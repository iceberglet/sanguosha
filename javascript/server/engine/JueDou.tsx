import { Operation } from "../Flow";
import { getFromAction, PlayerAction, UIPosition, Button, isCancel  } from "../../common/PlayerAction";
import { ICard } from "../../common/cards/ICard";
import GameManager from "../GameManager";
import { askForWuXie, SingleRuse } from "./SingleRuseOp";
import { HintType } from "../../common/ServerHint";
import DamageOp, { DamageType } from "../flows/DamageOp";
import { PlayerInfo } from "../../common/PlayerInfo";

export default class JueDou extends Operation<void> implements SingleRuse {

    public me: PlayerInfo
    public target: PlayerInfo
    public targetLost: boolean
    public damage: number = 1

    public constructor(
        public ruseAction: PlayerAction, 
        public ruseCard: ICard
    ) {
        super()
        this.targetLost = true
    }

    public async perform(manager: GameManager) {
        if(!await askForWuXie(this, manager)) {
            await this.actionOnly(manager)
        }
    }

    public async actionOnly(manager: GameManager) {

        this.target = manager.context.getPlayer(getFromAction(this.ruseAction, UIPosition.PLAYER)[0])
        this.me = manager.context.getPlayer(this.ruseAction.actionSource)

        manager.beforeFlowHappen.publish(this, this.ruseAction.actionSource)

        while(true) {
            let curr = this.targetLost? this.target : this.me
            let issuer = this.targetLost? this.me: this.target
            let resp = await manager.sendHint(curr.player.id, {
                hintType: HintType.SLASH,
                hintMsg: `你和${issuer}的决斗, 请出杀`,
                extraButtons: [new Button(Button.CANCEL.id, '放弃')]
            })
            if(isCancel(resp)) {
                console.log('玩家放弃出杀, 掉血')
                manager.beforeFlowHappen.publish(this, this.ruseAction.actionSource)
                await new DamageOp(issuer, curr, this.damage, this.ruseAction, DamageType.NORMAL).perform(manager)
                break
            } else {
                this.targetLost = !this.targetLost
            }
        }
        
    }
}