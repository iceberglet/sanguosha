import { shuffle, Suits } from "../util/Util"
import { ICard } from "./ICard"

export type SuperGenre = 'basic' | 'ruse' | 'equipment'

export type CardGenre = 'basic' | 'single-immediate-ruse' | 'single-delay-ruse' | 'group-ruse' | 'horse+1' | 'horse-1' | 'weapon' | 'shield' | 'none'

export type Suit = 'club' | 'spade' | 'heart' | 'diamond' | 'none'

export type Color = 'red' | 'black' | 'n.a.'

export class CardSize {
    public static MAX = 13
    public static MIN = 1
    public static ACE = new CardSize('A', 1)
    public static TWO = new CardSize('2', 2)
    public static THREE = new CardSize('3', 3)
    public static FOUR = new CardSize('4', 4)
    public static FIVE = new CardSize('5', 5)
    public static SIX = new CardSize('6', 6)
    public static SEVEN = new CardSize('7', 7)
    public static EIGHT = new CardSize('8', 8)
    public static NINE = new CardSize('9', 9)
    public static TEN = new CardSize('10', 10)
    public static JACK = new CardSize('J', 11)
    public static QUEEN = new CardSize('Q', 12)
    public static KING = new CardSize('K', 13)
    constructor(public readonly symbol: string, public readonly size: number) {}
}

export class CardType {

    public static BACK = new CardType('back', '背面', 'none')

    public static SLASH = new CardType('slash', '杀', 'basic')
    public static SLASH_FIRE = new CardType('slash_fire', '火杀', 'basic')
    public static SLASH_THUNDER = new CardType('slash_thunder', '雷杀', 'basic')
    public static DODGE = new CardType('dodge', '闪', 'basic')
    public static PEACH = new CardType('peach', '桃', 'basic')
    public static WINE = new CardType('wine', '酒', 'basic')

    public static TENG_JIA = new CardType('teng_jia', '藤甲', 'shield')
    public static BA_GUA = new CardType('ba_gua', '八卦阵', 'shield')
    public static SILVER_LION = new CardType('silver_lion', '白银狮子', 'shield')
    public static REN_WANG = new CardType('ren_wang', '仁王盾', 'shield')

    public static ZHANG_BA = new CardType('zhang_ba', '丈八蛇矛', 'weapon').withDistance(3)
    public static QING_LONG = new CardType('qing_long', '青龙偃月刀', 'weapon').withDistance(3)
    public static QING_GANG = new CardType('qing_gang', '青釭剑', 'weapon').withDistance(2)
    public static CI_XIONG = new CardType('ci_xiong', '雌雄双股剑', 'weapon').withDistance(2)
    public static GU_DING = new CardType('gu_ding', '古锭刀', 'weapon').withDistance(2)
    public static ZHU_QUE = new CardType('zhu_que', '朱雀羽扇', 'weapon').withDistance(4)
    public static GUAN_SHI = new CardType('guan_shi', '贯石斧', 'weapon').withDistance(3)
    public static LIAN_NU = new CardType('lian_nu', '诸葛连弩', 'weapon').withDistance(1)
    public static FANG_TIAN = new CardType('fang_tian', '方天画戟', 'weapon').withDistance(4)
    public static HAN_BING = new CardType('han_bing', '寒冰剑', 'weapon').withDistance(2)
    public static QI_LIN = new CardType('qi_lin', '麒麟弓', 'weapon').withDistance(5)

    public static DA_YUAN = new CardType('da_yuan', '大宛', 'horse-1')
    public static ZHUA_HUANG = new CardType('zhua_huang', '爪黄飞电', 'horse+1')
    public static DI_LU = new CardType('di_lu', '的卢', 'horse+1')
    public static ZI_XING = new CardType('zi_xing', '紫骍', 'horse-1')
    public static JUE_YING = new CardType('jue_ying', '绝影', 'horse+1')
    public static CHI_TU = new CardType('chi_tu', '赤兔', 'horse-1')
    public static HUA_LIU = new CardType('hua_liu', '骅骝', 'horse+1')

    public static JIE_DAO = new CardType('jie_dao', '借刀杀人', 'single-immediate-ruse')
    public static GUO_HE = new CardType('guo_he', '过河拆桥', 'single-immediate-ruse')
    public static SHUN_SHOU = new CardType('shun_shou', '顺手牵羊', 'single-immediate-ruse').withDistance(1)
    public static WU_XIE = new CardType('wu_xie', '无懈可击', 'single-immediate-ruse')
    public static WU_ZHONG = new CardType('wu_zhong', '无中生有', 'single-immediate-ruse')
    public static JUE_DOU = new CardType('jue_dou', '决斗', 'single-immediate-ruse')
    public static HUO_GONG = new CardType('huo_gong', '火攻', 'single-immediate-ruse')
    public static TIE_SUO = new CardType('tie_suo', '铁索连环', 'single-immediate-ruse')

    public static TAO_YUAN = new CardType('tao_yuan', '桃园结义', 'group-ruse')
    public static WAN_JIAN = new CardType('wan_jian', '万箭齐发', 'group-ruse')
    public static NAN_MAN = new CardType('nan_man', '南蛮入侵', 'group-ruse')
    public static WU_GU = new CardType('wu_gu', '五谷丰登', 'group-ruse')

    public static LE_BU = new CardType('le_bu', '乐不思蜀', 'single-delay-ruse')
    public static BING_LIANG = new CardType('bing_liang', '兵粮寸断', 'single-delay-ruse').withDistance(1)
    public static SHAN_DIAN = new CardType('shan_dian', '闪电', 'single-delay-ruse')

    ////////// ----------------- 国战 -----------------------//////////////////
    public static YI_YI = new CardType('yi_yi', '以逸待劳', 'group-ruse').withPackage('国战')
    public static ZHI_JI = new CardType('zhi_ji', '知己知彼', 'single-immediate-ruse').withPackage('国战')
    public static YUAN_JIAO = new CardType('yuan_jiao', '远交近攻', 'single-immediate-ruse').withPackage('国战')
    public static WU_LIU = new CardType('wu_liu', '吴六剑', 'weapon').withDistance(2).withPackage('国战')
    public static SAN_JIAN = new CardType('san_jian', '三尖两刃刀', 'weapon').withDistance(3).withPackage('国战')
    public static WU_XIE_GUO = new CardType('wu_xie_guo', '无懈可击·国', 'single-immediate-ruse').withPackage('国战')

    public distance: number = -1
    public package: string = '普通'

    private withDistance(dist: number) {
        this.distance = dist
        return this
    }

    private withPackage(pack: string) {
        this.package = pack
        return this
    }

    private constructor(
        //todo: is this id even needed?
        public id: string,
        public name: string, 
        public genre: CardGenre
        ) {}

    public isEquipment(): boolean {
        return this.genre === 'horse+1' || this.genre === 'horse-1' || this.genre === 'weapon' || this.genre === 'shield'
    }

    public isRuse(): boolean {
        return this.genre === 'single-delay-ruse' || this.genre === 'single-immediate-ruse' || this.genre === 'group-ruse'
    }

    public isWuxie(): boolean {
        return this.id === CardType.WU_XIE.id || this.id === CardType.WU_XIE_GUO.id
    }

    public isHorse(): boolean {
        return this.genre === 'horse+1' || this.genre === 'horse-1'
    }

    public isNonDelayedRuse(): boolean {
        return this.genre === 'single-immediate-ruse' || this.genre === 'group-ruse'
    }

    public isDelayedRuse(): boolean {
        return this.genre === 'single-delay-ruse'
    }

    public isSlash(): boolean {
        return this === CardType.SLASH || this === CardType.SLASH_FIRE || this === CardType.SLASH_THUNDER
    }

    public isBasic(): boolean {
        return this.genre === 'basic'
    }

    public toString(): string {
        return this.name
    }

    public getSuperGenre(): SuperGenre {
        if(this.isBasic()) {
            return 'basic'
        }
        if(this.isEquipment()) {
            return 'equipment'
        }
        return 'ruse'
    }
}

export function cardSorter(a: Card, b: Card) {
    return cardWeight(a) - cardWeight(b)
}

function cardWeight(icard: ICard) {
    let weight = 0
    if(icard.type.isRuse()) {
        weight += 200
    }
    if(icard.type.isEquipment()) {
        weight += 100
    }
    weight += icard.size.size * 4
    switch(icard.suit) {
        case 'heart': weight += 0
        case 'spade': weight += 1
        case 'diamond': weight += 2
        case 'club': weight += 3
    }
    return weight
}

export function cleanDescription(...cards: Card[]) {
    cards.forEach(c => delete c.description)
}

export class Card implements ICard {
    static DUMMY = new Card('none', null, CardType.BACK)
    static counter = 0
    public id: string
    
    //imposed as a different card
    public as?: CardType
    public description?: string

    public constructor(public readonly suit: Suit, public readonly size: CardSize, public readonly type: CardType){
        this.id = [suit, size?.symbol, type?.name].join('_')
    }
    public isOneOf(...types: CardType[]) {
        for(let t of types) {
            if(this.type === t) {
                return true
            }
        }
        return false
    }
    public isDummy() {
        return this.id === Card.DUMMY.id
    }

    public toString() {
        return `[${Suits[this.suit]} ${this.size?.symbol} ${this.type?.name}]`
    }
}


export class CardManager {
    cards = new Map<string, Card>()
    constructor(private deck: Card[]) {
        deck.forEach(c => {
            let count = 0
            while(this.cards.has(c.id)) {
                c.id += (count++)
            }
            this.cards.set(c.id, c)
        })
        this.cards.set(Card.DUMMY.id, Card.DUMMY)
    }

    getCard = (id: string): Card => {
        return this.cards.get(id);
    }

    cleanCard = (card: Card) => {
        let c = this.getCard(card.id)
        c.as = card.as
        c.description = card.description
        return c
    }

    getShuffledDeck = () => {
        return shuffle([...this.deck])
    }
}