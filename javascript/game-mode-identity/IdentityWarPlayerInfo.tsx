import { PlayerInfo, Identity } from "../common/PlayerInfo";
import { General } from "../common/General";
import { Player } from "../common/Player";
import * as React from "react";
import './identity-war.scss'

export default class IdentityWarPlayerInfo extends PlayerInfo {

    public constructor(player: Player,
        public identity: Identity,
        public general: General) {
        super(player)
    }
    
    init(): IdentityWarPlayerInfo {
        this.hp = this.general.hp
        this.maxHp = this.general.hp
        return this
    }

    getGender() {
        return this.general.gender
    }

    sanitize(to: string): IdentityWarPlayerInfo {
        if(to === this.player.id || this.isDead) {
            return this
        }
        let copy = new IdentityWarPlayerInfo(this.player, this.identity, this.general)
        Object.assign(copy, this)
        copy.identity = null
        return copy
    }

    getFaction() {
        return this.general.faction
    }

    draw(): React.ReactElement {
        return <div className='identity-war overflow-hidden'>
            <div className='card-avatar' 
                style={{backgroundImage: `url('generals/${this.general.id}.png')`, ...this.general.uiOffset}} />
            <div className='player-name'>{this.player.id}</div>
            <div className='general-name'>{this.general.name}</div>
            <div className='faction' style={{backgroundImage: `url('icons/${this.general.faction.image}.png')`}} />
            {this.identity && <div className='identity' style={{backgroundImage: `url('icons/${this.identity.id}.png')`}}/>}
        </div>
    }

    drawSelf() {
        return this.draw()
    }

}