import FactionWarGeneral from "./FactionWarGenerals"
import { Faction, Gender, factionDiffers, factionsSame } from '../common/General'
import { Player } from "../common/Player"
import { PlayerInfo } from "../common/PlayerInfo"
import * as React from "react"
import './faction-war.scss'
import { toFactionWarAvatarStyle } from "./FactionWarGeneralUiOffset"
import { ClassFormatter } from "../common/util/Togglable"


export default class FactionPlayerInfo extends PlayerInfo {

    public isGeneralRevealed = false
    public isSubGeneralRevealed = false
    //can be overriden, e.g. as 野心家
    public faction: Faction
    
    constructor(
        player: Player,
        public general: FactionWarGeneral,
        public subGeneral: FactionWarGeneral) {
        super(player)
    }

    init() {
        if(!this.subGeneral || !this.general) {
            throw `WTF`
        }
        if(this.general.faction.name !== this.subGeneral.faction.name) {
            throw `WTF?? Factions don't match leh`
        }
        this.hp = Math.floor(this.general.hp + this.subGeneral.hp)
        this.maxHp = this.hp
        this.faction = this.general.faction
        return this
    }

    getGender(): Gender {
        if(this.isGeneralRevealed) {
            return this.general.gender
        }
        if(this.isSubGeneralRevealed) {
            return this.subGeneral.gender
        }
        return 'Nil'
    }

    /**
     * 返回明置的势力
     */
    getFaction() {
        if(!this.isRevealed()) {
            return Faction.UNKNOWN
        }
        return this.faction
    }

    sanitize(to: string): FactionPlayerInfo {
        let copy = new FactionPlayerInfo(this.player, this.general, this.subGeneral)
        Object.assign(copy, this)
        if(this.isDead || to === this.player.id) {
            return copy
        }
        copy.general = this.isGeneralRevealed && this.general
        copy.subGeneral = this.isSubGeneralRevealed && this.subGeneral
        return copy
    }

    renderGeneral(g: FactionWarGeneral, isBig: boolean) {
        if(!g) {
            //not revealed yet
            return <div className='card-avatar' 
                    style={{backgroundImage: `url('generals/back.png')`, backgroundPosition: '-30px -20px', filter: 'grayscale(70%)'}} />
        } else {
            return <div className='card-avatar' style={toFactionWarAvatarStyle(g.id, isBig)} />
        }
    }

    draw(): React.ReactElement[] {
        let clazz = new ClassFormatter('faction-war').and(this.isDead, 'dead').done()
        let main = this.general? this.general.name : '主将'
        let sub = this.subGeneral? this.subGeneral.name : '副将'
        return [<div className={clazz} key={'pics'}>
            <div className='general' style={{letterSpacing: main.length > 2 ? '-4px' : '0px'}}>
                {this.renderGeneral(this.general, false)}
                <div className='general-name'>{main}</div>
            </div>
            <div className='general' style={{letterSpacing: sub.length > 2 ? '-4px' : '0px'}}>
                {this.renderGeneral(this.subGeneral, false)}
                <div className='general-name'>{sub}</div>
            </div>
            <div className='player-name'>{this.player.id}</div>
        </div>,
        <FactionMark key={'faction-mark'} info={this}/>]
    }

    drawSelf() {
        let color = Color[this.getFaction().image]
        let clazz = new ClassFormatter('faction-war').and(this.isDead, 'dead').done()
        return <div className={clazz}>
            <div className={'general ' + (this.isGeneralRevealed || 'hidden')}>
                {this.renderGeneral(this.general, true)}
                <div className='general-name' style={{background: color, letterSpacing: this.general.name.length > 2 ? '-4px' : '0px'}}>
                    {this.general.name}
                    <div className='general-name-after' style={{borderLeft: `9px solid ${color}`}}/>
                </div>
                <div className='title'>主</div>
            </div>
            <div className={'general ' + (this.isSubGeneralRevealed || 'hidden')}>
                {this.renderGeneral(this.subGeneral, true)}
                <div className='general-name' style={{background: color}}>
                    {this.subGeneral.name}
                    <div className='general-name-after' style={{borderLeft: `9px solid ${color}`}}/>
                </div>
                <div className='title'>副</div>
            </div>
            {/* <div className='player-name'>{this.player.id}</div> */}
        </div>
        // <div className={'faction-mark myself' + this.faction.image}>
        //     {this.faction.name}
        // </div>]
    }

    isRevealed() {
        return this.isGeneralRevealed || this.isSubGeneralRevealed
    }

    declareDeath() {
        this.isGeneralRevealed = true
        this.isSubGeneralRevealed = true
        super.declareDeath()
    }

    /**
     * 返回两人是否不同阵营:
     * 要求: 
     * - 均明置武将
     * - 阵营不同
     * @param a 
     * @param b 
     */
    static factionDifferent(a: FactionPlayerInfo, b: FactionPlayerInfo): boolean {
        return factionDiffers(a.getFaction(), b.getFaction())
    }

    static factionSame(a: FactionPlayerInfo, b: FactionPlayerInfo): boolean {
        return factionsSame(a.getFaction(), b.getFaction())
    }
}

const Color: {[key: string]: string} = {
    wei: '#3c3cf7aa',
    shu: '#ff6060aa',
    qun: '#f1d23aaa',
    wu: '#228c22aa',
    ye: '#902090aa'
}

type FactionMarkProp = {
    info: FactionPlayerInfo
}

function FactionMark(p: FactionMarkProp) {
    let info = p.info
    let [wei, setWei] = React.useState<boolean>(true)
    let [shu, setShu] = React.useState<boolean>(true)
    let [wu, setWu] = React.useState<boolean>(true)
    let [qun, setQun] = React.useState<boolean>(true)

    if(info.isRevealed()) {
        //return a simple one
        return <div className={'faction-mark ' + info.getFaction().image}>
            {info.getFaction().name}
        </div>
    }

    return <div className='faction-dynamic-mark'>
        <div className={new ClassFormatter('mark').and(wei, 'wei').done()} onClick={()=>setWei(!wei)}></div>
        <div className={new ClassFormatter('mark').and(qun, 'qun').done()} onClick={()=>setQun(!qun)}></div>
        <div className={new ClassFormatter('mark').and(shu, 'shu').done()} onClick={()=>setShu(!shu)}></div>
        <div className={new ClassFormatter('mark').and(wu, 'wu').done()} onClick={()=>setWu(!wu)}></div>
    </div>
}