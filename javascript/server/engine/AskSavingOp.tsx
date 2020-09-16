import { PlayerInfo } from "../../common/PlayerInfo";
import GameManager from "../GameManager";
import { HintType } from "../../common/ServerHint";
import { Button } from "../../common/PlayerAction";

export class AskSavingAround {

    toAsk: PlayerInfo[]

    constructor(public deadman: PlayerInfo) {

    }

    public async perform(manager: GameManager) {
        let toAsk = manager.getSortedByCurr(true)

        //完杀?
        await manager.events.publish(this)

        for(let i = 0; i < toAsk.length && this.deadman.isDying(); ++i) {
            await new AskSavingOp(this.deadman, toAsk[i]).perform(manager)
        }
    }
}

/**
 * 濒死求桃
 * 本人可以出酒
 * 濒死技能可以在轮到你的时候发动
 *  - 不屈,涅槃,急救等等
 */
export default class AskSavingOp {

    public constructor(public deadman: PlayerInfo, public goodman: PlayerInfo) {

    }

    public async perform(manager: GameManager): Promise<void> {
        //不屈, 涅槃 等等 均在此发动        
        await manager.events.publish(this)

        let targetId = this.deadman.player.id

        //注意, 老版周泰不适合这种血量判断 (可以死血呆下去...)
        while (this.deadman.isDying()) {
            let require = 1 - this.deadman.hp
            let response = await manager.sendHint(this.goodman.player.id, {
                hintType: HintType.PEACH,
                hintMsg: `${this.goodman.player.id === targetId? '你' : targetId} 濒死求桃 (还需要${require}个)`,
                sourcePlayer: targetId,
                extraButtons: [Button.CANCEL]
            })
            //todo: put this in resolver
            if(!response.isCancel()) {
                await manager.resolver.onSaving(response, this, manager)
            } else {
                break
            }
        }
    }

}