import { shuffle, Suits } from "../util/Util"
import { ICard } from "./ICard"

export type CardGenre = 'basic' | 'single-immediate-ruse' | 'single-delay-ruse' | 'group-ruse' | 'horse+1' | 'horse-1' | 'weapon' | 'shield' | 'none'

export type Suit = 'club' | 'spade' | 'heart' | 'diamond' | 'none'

export class CardSize {
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
    public static JUE_YING = new CardType('fang_tian', '绝影', 'horse+1')
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

    public distance: number = -1

    private withDistance(dist: number) {
        this.distance = dist
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
}

export default class Card implements ICard {
    static DUMMY = new Card('none', null, CardType.BACK)
    static counter = 0
    public id: string
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
}

//标准+EX+军争 - https://sanguosha.fandom.com/zh/wiki/%E4%B8%89%E5%9B%BD%E6%9D%80%E6%B8%B8%E6%88%8F%E5%8D%A1%E7%89%8C
let normalCards: Card[] = []
normalCards.push(new Card('spade', CardSize.ACE, CardType.SHAN_DIAN))
normalCards.push(new Card('spade', CardSize.ACE, CardType.JUE_DOU))
normalCards.push(new Card('spade', CardSize.ACE, CardType.GU_DING))
normalCards.push(new Card('spade', CardSize.TWO, CardType.BA_GUA))
normalCards.push(new Card('spade', CardSize.TWO, CardType.CI_XIONG))
normalCards.push(new Card('spade', CardSize.TWO, CardType.HAN_BING))
normalCards.push(new Card('spade', CardSize.TWO, CardType.TENG_JIA))
normalCards.push(new Card('spade', CardSize.THREE, CardType.GUO_HE))
normalCards.push(new Card('spade', CardSize.THREE, CardType.SHUN_SHOU))
normalCards.push(new Card('spade', CardSize.THREE, CardType.WINE))
normalCards.push(new Card('spade', CardSize.FOUR, CardType.GUO_HE))
normalCards.push(new Card('spade', CardSize.FOUR, CardType.SHUN_SHOU))
normalCards.push(new Card('spade', CardSize.FOUR, CardType.SLASH_THUNDER))
normalCards.push(new Card('spade', CardSize.FIVE, CardType.QING_LONG))
normalCards.push(new Card('spade', CardSize.FIVE, CardType.JUE_YING))
normalCards.push(new Card('spade', CardSize.FIVE, CardType.SLASH_THUNDER))
normalCards.push(new Card('spade', CardSize.SIX, CardType.LE_BU))
normalCards.push(new Card('spade', CardSize.SIX, CardType.QING_GANG))
normalCards.push(new Card('spade', CardSize.SIX, CardType.SLASH_THUNDER))
normalCards.push(new Card('spade', CardSize.SEVEN, CardType.NAN_MAN))
normalCards.push(new Card('spade', CardSize.SEVEN, CardType.SLASH))
normalCards.push(new Card('spade', CardSize.SEVEN, CardType.SLASH_THUNDER))
normalCards.push(new Card('spade', CardSize.EIGHT, CardType.SLASH))
normalCards.push(new Card('spade', CardSize.EIGHT, CardType.SLASH))
normalCards.push(new Card('spade', CardSize.EIGHT, CardType.SLASH_THUNDER))
normalCards.push(new Card('spade', CardSize.NINE, CardType.SLASH))
normalCards.push(new Card('spade', CardSize.NINE, CardType.SLASH))
normalCards.push(new Card('spade', CardSize.NINE, CardType.WINE))
normalCards.push(new Card('spade', CardSize.TEN, CardType.SLASH))
normalCards.push(new Card('spade', CardSize.TEN, CardType.SLASH))
normalCards.push(new Card('spade', CardSize.TEN, CardType.BING_LIANG))
normalCards.push(new Card('spade', CardSize.JACK, CardType.WU_XIE))
normalCards.push(new Card('spade', CardSize.JACK, CardType.SHUN_SHOU))
normalCards.push(new Card('spade', CardSize.JACK, CardType.TIE_SUO))
normalCards.push(new Card('spade', CardSize.QUEEN, CardType.ZHANG_BA))
normalCards.push(new Card('spade', CardSize.QUEEN, CardType.GUO_HE))
normalCards.push(new Card('spade', CardSize.QUEEN, CardType.TIE_SUO))
normalCards.push(new Card('spade', CardSize.KING, CardType.DA_YUAN))
normalCards.push(new Card('spade', CardSize.KING, CardType.NAN_MAN))
normalCards.push(new Card('spade', CardSize.KING, CardType.WU_XIE))


normalCards.push(new Card('heart', CardSize.ACE, CardType.TAO_YUAN))
normalCards.push(new Card('heart', CardSize.ACE, CardType.WAN_JIAN))
normalCards.push(new Card('heart', CardSize.ACE, CardType.WU_XIE))
normalCards.push(new Card('heart', CardSize.TWO, CardType.DODGE))
normalCards.push(new Card('heart', CardSize.TWO, CardType.DODGE))
normalCards.push(new Card('heart', CardSize.TWO, CardType.HUO_GONG))
normalCards.push(new Card('heart', CardSize.THREE, CardType.PEACH))
normalCards.push(new Card('heart', CardSize.THREE, CardType.WU_GU))
normalCards.push(new Card('heart', CardSize.THREE, CardType.SLASH_FIRE))
normalCards.push(new Card('heart', CardSize.FOUR, CardType.PEACH))
normalCards.push(new Card('heart', CardSize.FOUR, CardType.WU_GU))
normalCards.push(new Card('heart', CardSize.FOUR, CardType.SLASH_FIRE))
normalCards.push(new Card('heart', CardSize.FIVE, CardType.QI_LIN))
normalCards.push(new Card('heart', CardSize.FIVE, CardType.CHI_TU))
normalCards.push(new Card('heart', CardSize.FIVE, CardType.PEACH))
normalCards.push(new Card('heart', CardSize.SIX, CardType.PEACH))
normalCards.push(new Card('heart', CardSize.SIX, CardType.LE_BU))
normalCards.push(new Card('heart', CardSize.SIX, CardType.PEACH))
normalCards.push(new Card('heart', CardSize.SEVEN, CardType.PEACH))
normalCards.push(new Card('heart', CardSize.SEVEN, CardType.WU_ZHONG))
normalCards.push(new Card('heart', CardSize.SEVEN, CardType.SLASH_FIRE))
normalCards.push(new Card('heart', CardSize.EIGHT, CardType.PEACH))
normalCards.push(new Card('heart', CardSize.EIGHT, CardType.WU_ZHONG))
normalCards.push(new Card('heart', CardSize.EIGHT, CardType.DODGE))
normalCards.push(new Card('heart', CardSize.NINE, CardType.PEACH))
normalCards.push(new Card('heart', CardSize.NINE, CardType.WU_ZHONG))
normalCards.push(new Card('heart', CardSize.NINE, CardType.DODGE))
normalCards.push(new Card('heart', CardSize.TEN, CardType.SLASH))
normalCards.push(new Card('heart', CardSize.TEN, CardType.SLASH))
normalCards.push(new Card('heart', CardSize.TEN, CardType.SLASH_FIRE))
normalCards.push(new Card('heart', CardSize.JACK, CardType.SLASH))
normalCards.push(new Card('heart', CardSize.JACK, CardType.WU_ZHONG))
normalCards.push(new Card('heart', CardSize.JACK, CardType.DODGE))
normalCards.push(new Card('heart', CardSize.QUEEN, CardType.PEACH))
normalCards.push(new Card('heart', CardSize.QUEEN, CardType.GUO_HE))
normalCards.push(new Card('heart', CardSize.QUEEN, CardType.SHAN_DIAN))
normalCards.push(new Card('heart', CardSize.QUEEN, CardType.DODGE))
normalCards.push(new Card('heart', CardSize.KING, CardType.ZHUA_HUANG))
normalCards.push(new Card('heart', CardSize.KING, CardType.DODGE))
normalCards.push(new Card('heart', CardSize.KING, CardType.WU_XIE))

normalCards.push(new Card('club', CardSize.ACE, CardType.LIAN_NU))
normalCards.push(new Card('club', CardSize.ACE, CardType.JUE_DOU))
normalCards.push(new Card('club', CardSize.ACE, CardType.SILVER_LION))
normalCards.push(new Card('club', CardSize.TWO, CardType.BA_GUA))
normalCards.push(new Card('club', CardSize.TWO, CardType.SLASH))
normalCards.push(new Card('club', CardSize.TWO, CardType.REN_WANG))
normalCards.push(new Card('club', CardSize.TWO, CardType.TENG_JIA))
normalCards.push(new Card('club', CardSize.THREE, CardType.GUO_HE))
normalCards.push(new Card('club', CardSize.THREE, CardType.SLASH))
normalCards.push(new Card('club', CardSize.THREE, CardType.WINE))
normalCards.push(new Card('club', CardSize.FOUR, CardType.GUO_HE))
normalCards.push(new Card('club', CardSize.FOUR, CardType.SLASH))
normalCards.push(new Card('club', CardSize.FOUR, CardType.BING_LIANG))
normalCards.push(new Card('club', CardSize.FIVE, CardType.DI_LU))
normalCards.push(new Card('club', CardSize.FIVE, CardType.SLASH))
normalCards.push(new Card('club', CardSize.FIVE, CardType.SLASH_THUNDER))
normalCards.push(new Card('club', CardSize.SIX, CardType.LE_BU))
normalCards.push(new Card('club', CardSize.SIX, CardType.SLASH))
normalCards.push(new Card('club', CardSize.SIX, CardType.SLASH_THUNDER))
normalCards.push(new Card('club', CardSize.SEVEN, CardType.NAN_MAN))
normalCards.push(new Card('club', CardSize.SEVEN, CardType.SLASH))
normalCards.push(new Card('club', CardSize.SEVEN, CardType.SLASH_THUNDER))
normalCards.push(new Card('club', CardSize.EIGHT, CardType.SLASH))
normalCards.push(new Card('club', CardSize.EIGHT, CardType.SLASH))
normalCards.push(new Card('club', CardSize.EIGHT, CardType.SLASH_THUNDER))
normalCards.push(new Card('club', CardSize.NINE, CardType.SLASH))
normalCards.push(new Card('club', CardSize.NINE, CardType.SLASH))
normalCards.push(new Card('club', CardSize.NINE, CardType.SLASH_THUNDER))
normalCards.push(new Card('club', CardSize.TEN, CardType.SLASH))
normalCards.push(new Card('club', CardSize.TEN, CardType.SLASH))
normalCards.push(new Card('club', CardSize.TEN, CardType.TIE_SUO))
normalCards.push(new Card('club', CardSize.JACK, CardType.SLASH))
normalCards.push(new Card('club', CardSize.JACK, CardType.SLASH))
normalCards.push(new Card('club', CardSize.JACK, CardType.TIE_SUO))
normalCards.push(new Card('club', CardSize.QUEEN, CardType.JIE_DAO))
normalCards.push(new Card('club', CardSize.QUEEN, CardType.WU_XIE))
normalCards.push(new Card('club', CardSize.QUEEN, CardType.TIE_SUO))
normalCards.push(new Card('club', CardSize.KING, CardType.JIE_DAO))
normalCards.push(new Card('club', CardSize.KING, CardType.WU_XIE))
normalCards.push(new Card('club', CardSize.KING, CardType.TIE_SUO))


normalCards.push(new Card('diamond', CardSize.ACE, CardType.LIAN_NU))
normalCards.push(new Card('diamond', CardSize.ACE, CardType.JUE_DOU))
normalCards.push(new Card('diamond', CardSize.ACE, CardType.ZHU_QUE))
normalCards.push(new Card('diamond', CardSize.TWO, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.TWO, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.TWO, CardType.PEACH))
normalCards.push(new Card('diamond', CardSize.THREE, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.THREE, CardType.SHUN_SHOU))
normalCards.push(new Card('diamond', CardSize.THREE, CardType.PEACH))
normalCards.push(new Card('diamond', CardSize.FOUR, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.FOUR, CardType.SHUN_SHOU))
normalCards.push(new Card('diamond', CardSize.FOUR, CardType.PEACH))
normalCards.push(new Card('diamond', CardSize.FIVE, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.FIVE, CardType.GUAN_SHI))
normalCards.push(new Card('diamond', CardSize.FIVE, CardType.SLASH_FIRE))
normalCards.push(new Card('diamond', CardSize.SIX, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.SIX, CardType.SLASH))
normalCards.push(new Card('diamond', CardSize.SIX, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.SEVEN, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.SEVEN, CardType.SLASH))
normalCards.push(new Card('diamond', CardSize.SEVEN, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.EIGHT, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.EIGHT, CardType.SLASH))
normalCards.push(new Card('diamond', CardSize.EIGHT, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.NINE, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.NINE, CardType.SLASH))
normalCards.push(new Card('diamond', CardSize.NINE, CardType.WINE))
normalCards.push(new Card('diamond', CardSize.TEN, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.TEN, CardType.SLASH))
normalCards.push(new Card('diamond', CardSize.TEN, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.JACK, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.JACK, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.JACK, CardType.DODGE))
normalCards.push(new Card('diamond', CardSize.QUEEN, CardType.PEACH))
normalCards.push(new Card('diamond', CardSize.QUEEN, CardType.FANG_TIAN))
normalCards.push(new Card('diamond', CardSize.QUEEN, CardType.WU_XIE))
normalCards.push(new Card('diamond', CardSize.QUEEN, CardType.HUO_GONG))
normalCards.push(new Card('diamond', CardSize.KING, CardType.SLASH))
normalCards.push(new Card('diamond', CardSize.KING, CardType.ZI_XING))
normalCards.push(new Card('diamond', CardSize.KING, CardType.HUA_LIU))

class CardManager {
    cards = new Map<string, Card>()
    constructor(private deck: Card[]) {
        deck.forEach(c => this.cards.set(c.id, c))
        this.cards.set(Card.DUMMY.id, Card.DUMMY)
    }

    getCard(id: string): Card {
        return this.cards.get(id);
    }

    getShuffledDeck() {
        return shuffle([...this.deck])
    }
}


export const cardManager = new CardManager(normalCards)