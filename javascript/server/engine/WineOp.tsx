import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { WINE_TAKEN } from "../../common/RoundStat";
import { TextFlashEffect } from "../../common/transit/EffectTransit";

export default class WineOp extends Operation<void> {

    public constructor(private player: string) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        if(manager.roundStats.customData[WINE_TAKEN]) {
            throw '本回合已经吃过酒了! ' + this.player
        }
        let player = manager.context.getPlayer(this.player)
        player.isDrunk = true
        manager.broadcast(player, PlayerInfo.sanitize)
        manager.broadcast(new TextFlashEffect(this.player, [], '酒'))
        manager.roundStats.customData[WINE_TAKEN] = true
    }
    
}