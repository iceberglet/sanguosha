import { Operation } from "../Operation";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { WINE_TAKEN } from "../../common/RoundStat";
import { TextFlashEffect } from "../../common/transit/EffectTransit";

export default class WineOp extends Operation<void> {

    public constructor(private player: PlayerInfo) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        if(manager.roundStats.customData[WINE_TAKEN]) {
            throw '本回合已经吃过酒了! ' + this.player.player.id
        }
        this.player.isDrunk = true
        manager.broadcast(this.player, PlayerInfo.sanitize)
        manager.broadcast(new TextFlashEffect(this.player.player.id, [], '酒'))
        manager.roundStats.customData[WINE_TAKEN] = true
    }
    
}