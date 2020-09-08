import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import HealOp from "./HealOp";
import { PlayerInfo } from "../../common/PlayerInfo";

export default class PeachOp extends Operation<void> {

    public constructor(private player: PlayerInfo) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        manager.broadcast(new TextFlashEffect(this.player.player.id, [], '桃'))
        await new HealOp(this.player, this.player, 1).perform(manager)
    }
    
}