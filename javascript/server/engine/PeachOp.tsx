import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import HealOp from "../flows/HealOp";

export default class PeachOp extends Operation<void> {

    public constructor(private player: string) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        let info = manager.context.getPlayer(this.player)
        manager.broadcast(new TextFlashEffect(this.player, [], '桃'))
        await new HealOp(info, info, 1).perform(manager)
    }
    
}