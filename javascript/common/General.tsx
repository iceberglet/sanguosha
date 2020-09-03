export type Gender = 'M' | 'F' | 'Nil'


export class Faction {

    public static WEI = new Faction('魏', 'wei')
    public static SHU = new Faction('蜀', 'shu')
    public static WU = new Faction('吴', 'wu')
    public static QUN = new Faction('群', 'qun')

    public static YE = new Faction('野', 'ye')
    //未验明, 未知
    public static UNKNOWN = new Faction('未知', 'unknown')

    public static SHEN = new Faction('神', 'shen')

    private constructor(public readonly name: string, public readonly image: string) {

    }
}

export function factionDiffers(a: Faction, b: Faction) {
    if(a.name === Faction.YE.name || a.name === Faction.UNKNOWN.name || b.name === Faction.YE.name || b.name === Faction.UNKNOWN.name) {
        return true
    }
    return a.name !== b.name
}

export function factionsSame(a: Faction, b: Faction) {
    if(a.name === Faction.YE.name || a.name === Faction.UNKNOWN.name || b.name === Faction.YE.name || b.name === Faction.UNKNOWN.name) {
        return false
    }
    return a.name === b.name
}

type UIOffSet = {
    top: string,
    left: string
}

export class General {

    public gender: Gender
    public uiOffset: UIOffSet

    /**
     * @param id used to locate the resource
     * @param name name in Chinese
     * @param faction faction
     * @param hp HP value
     * @param abilities default abilities with this General
     */
    protected constructor(public readonly id: string, public readonly name: string, public readonly faction: Faction, public readonly hp: number, 
        public readonly abilities: string[]) {
        this.gender = 'M'
        this.uiOffset = {
            top: '-10%',
            left: '-0%'
        }
    }

    public asFemale(): General {
        this.gender = 'F'
        return this
    }

    public withOffset(top: number, left: number) {
        this.uiOffset = {
            top: top + '%',
            left: left + '%'
        }
        return this
    }
}



export function toGeneralCardStyle(id: string) {

    return {
        backgroundImage: `url('generals/${id}.png')`, 
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        width: '100%',
        height: '100%'
    }
}