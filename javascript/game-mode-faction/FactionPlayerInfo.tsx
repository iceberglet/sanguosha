import FactionWarGeneral from "./FactionWarGenerals"
import { Player } from "../common/Player"
import { PlayerInfo } from "../common/PlayerInfo"
import { ReactElement } from "react"


export default class FactionPlayerInfo extends PlayerInfo {

    public isGeneralRevealed = false
    public isSubGeneralRevealed = false
    
    constructor(
        player: Player,
        public general: FactionWarGeneral,
        public subGeneral: FactionWarGeneral) {
        super(player)
    }

    init() {
        if(this.subGeneral) {
            this.hp = Math.floor(this.general.hp + this.subGeneral.hp)
            this.maxHp = this.general.hp
        } else {
            this.hp = this.general.hp
            this.maxHp = this.general.hp
            //todo: init skills and all...
        }
        return this
    }

    sanitize(to: string): FactionPlayerInfo {
        if(to === this.player.id) {
            return this
        }
        let copy = new FactionPlayerInfo(this.player, null, null)
        Object.assign(copy, this)
        copy.general = null
        copy.subGeneral = null
        return copy
    }

    draw(): ReactElement {
        return null
    }

}