import Card, { CardSize, CardType, CardManager, Suit } from "../common/cards/Card"

export enum Pack {
    STANDARD,
    ZSBQ, //阵,势,变,权
}

export class FWCard extends Card {
    public constructor(suit: Suit, size: CardSize, type: CardType, public readonly pack: Pack = Pack.STANDARD) {
        super(suit, size, type)
    }
}

//标准+EX+军争 - https://sanguosha.fandom.com/zh/wiki/%E4%B8%89%E5%9B%BD%E6%9D%80%E6%B8%B8%E6%88%8F%E5%8D%A1%E7%89%8C
let normalCards: Card[] = []
normalCards.push(new FWCard('spade', CardSize.ACE, CardType.SHAN_DIAN))
normalCards.push(new FWCard('spade', CardSize.ACE, CardType.JUE_DOU))
normalCards.push(new FWCard('spade', CardSize.TWO, CardType.BA_GUA))
normalCards.push(new FWCard('spade', CardSize.TWO, CardType.CI_XIONG))
normalCards.push(new FWCard('spade', CardSize.TWO, CardType.HAN_BING))
normalCards.push(new FWCard('spade', CardSize.THREE, CardType.GUO_HE))
normalCards.push(new FWCard('spade', CardSize.THREE, CardType.SHUN_SHOU))
normalCards.push(new FWCard('spade', CardSize.FOUR, CardType.GUO_HE))
normalCards.push(new FWCard('spade', CardSize.FOUR, CardType.SHUN_SHOU))
normalCards.push(new FWCard('spade', CardSize.FIVE, CardType.SLASH))
normalCards.push(new FWCard('spade', CardSize.FIVE, CardType.JUE_YING))
normalCards.push(new FWCard('spade', CardSize.SIX, CardType.SLASH_THUNDER))
normalCards.push(new FWCard('spade', CardSize.SIX, CardType.QING_GANG))
normalCards.push(new FWCard('spade', CardSize.SEVEN, CardType.SLASH_THUNDER))
normalCards.push(new FWCard('spade', CardSize.SEVEN, CardType.SLASH))
normalCards.push(new FWCard('spade', CardSize.EIGHT, CardType.SLASH))
normalCards.push(new FWCard('spade', CardSize.EIGHT, CardType.SLASH))
normalCards.push(new FWCard('spade', CardSize.NINE, CardType.SLASH))
normalCards.push(new FWCard('spade', CardSize.NINE, CardType.WINE))
normalCards.push(new FWCard('spade', CardSize.TEN, CardType.BING_LIANG))
normalCards.push(new FWCard('spade', CardSize.TEN, CardType.SLASH))
normalCards.push(new FWCard('spade', CardSize.JACK, CardType.WU_XIE))
normalCards.push(new FWCard('spade', CardSize.JACK, CardType.SLASH))
normalCards.push(new FWCard('spade', CardSize.QUEEN, CardType.ZHANG_BA))
normalCards.push(new FWCard('spade', CardSize.QUEEN, CardType.TIE_SUO))
normalCards.push(new FWCard('spade', CardSize.KING, CardType.DA_YUAN))
normalCards.push(new FWCard('spade', CardSize.KING, CardType.NAN_MAN))


normalCards.push(new FWCard('heart', CardSize.ACE, CardType.TAO_YUAN))
normalCards.push(new FWCard('heart', CardSize.ACE, CardType.WAN_JIAN))
normalCards.push(new FWCard('heart', CardSize.TWO, CardType.HUO_GONG))
normalCards.push(new FWCard('heart', CardSize.TWO, CardType.DODGE))
normalCards.push(new FWCard('heart', CardSize.THREE, CardType.HUO_GONG))
normalCards.push(new FWCard('heart', CardSize.THREE, CardType.WU_GU))
normalCards.push(new FWCard('heart', CardSize.FOUR, CardType.PEACH))
normalCards.push(new FWCard('heart', CardSize.FOUR, CardType.SLASH_FIRE))
normalCards.push(new FWCard('heart', CardSize.FIVE, CardType.QI_LIN))
normalCards.push(new FWCard('heart', CardSize.FIVE, CardType.CHI_TU))
normalCards.push(new FWCard('heart', CardSize.SIX, CardType.PEACH))
normalCards.push(new FWCard('heart', CardSize.SIX, CardType.LE_BU))
normalCards.push(new FWCard('heart', CardSize.SEVEN, CardType.PEACH))
normalCards.push(new FWCard('heart', CardSize.SEVEN, CardType.WU_ZHONG))
normalCards.push(new FWCard('heart', CardSize.EIGHT, CardType.PEACH))
normalCards.push(new FWCard('heart', CardSize.EIGHT, CardType.WU_ZHONG))
normalCards.push(new FWCard('heart', CardSize.NINE, CardType.PEACH))
normalCards.push(new FWCard('heart', CardSize.NINE, CardType.YUAN_JIAO))
normalCards.push(new FWCard('heart', CardSize.TEN, CardType.PEACH))
normalCards.push(new FWCard('heart', CardSize.TEN, CardType.SLASH))
normalCards.push(new FWCard('heart', CardSize.JACK, CardType.DODGE))
normalCards.push(new FWCard('heart', CardSize.JACK, CardType.YI_YI))
normalCards.push(new FWCard('heart', CardSize.QUEEN, CardType.PEACH))
normalCards.push(new FWCard('heart', CardSize.QUEEN, CardType.GUO_HE))
normalCards.push(new FWCard('heart', CardSize.QUEEN, CardType.SLASH))
normalCards.push(new FWCard('heart', CardSize.KING, CardType.ZHUA_HUANG))
normalCards.push(new FWCard('heart', CardSize.KING, CardType.DODGE))

normalCards.push(new FWCard('club', CardSize.ACE, CardType.SILVER_LION))
normalCards.push(new FWCard('club', CardSize.ACE, CardType.JUE_DOU))
normalCards.push(new FWCard('club', CardSize.TWO, CardType.SLASH))
normalCards.push(new FWCard('club', CardSize.TWO, CardType.REN_WANG))
normalCards.push(new FWCard('club', CardSize.TWO, CardType.TENG_JIA))
normalCards.push(new FWCard('club', CardSize.THREE, CardType.ZHI_JI))
normalCards.push(new FWCard('club', CardSize.THREE, CardType.SLASH))
normalCards.push(new FWCard('club', CardSize.FOUR, CardType.ZHI_JI))
normalCards.push(new FWCard('club', CardSize.FOUR, CardType.SLASH))
normalCards.push(new FWCard('club', CardSize.FIVE, CardType.DI_LU))
normalCards.push(new FWCard('club', CardSize.FIVE, CardType.SLASH))
normalCards.push(new FWCard('club', CardSize.SIX, CardType.LE_BU))
normalCards.push(new FWCard('club', CardSize.SIX, CardType.SLASH_THUNDER))
normalCards.push(new FWCard('club', CardSize.SEVEN, CardType.NAN_MAN))
normalCards.push(new FWCard('club', CardSize.SEVEN, CardType.SLASH_THUNDER))
normalCards.push(new FWCard('club', CardSize.EIGHT, CardType.SLASH))
normalCards.push(new FWCard('club', CardSize.EIGHT, CardType.SLASH_THUNDER))
normalCards.push(new FWCard('club', CardSize.NINE, CardType.SLASH))
normalCards.push(new FWCard('club', CardSize.NINE, CardType.WINE))
normalCards.push(new FWCard('club', CardSize.TEN, CardType.SLASH))
normalCards.push(new FWCard('club', CardSize.TEN, CardType.BING_LIANG))
normalCards.push(new FWCard('club', CardSize.JACK, CardType.SLASH))
normalCards.push(new FWCard('club', CardSize.JACK, CardType.SLASH))
normalCards.push(new FWCard('club', CardSize.QUEEN, CardType.JIE_DAO))
normalCards.push(new FWCard('club', CardSize.QUEEN, CardType.TIE_SUO))
//todo: 无懈可击:国
normalCards.push(new FWCard('club', CardSize.KING, CardType.WU_XIE))
normalCards.push(new FWCard('club', CardSize.KING, CardType.TIE_SUO))


normalCards.push(new FWCard('diamond', CardSize.ACE, CardType.LIAN_NU))
normalCards.push(new FWCard('diamond', CardSize.ACE, CardType.ZHU_QUE))
normalCards.push(new FWCard('diamond', CardSize.TWO, CardType.DODGE))
normalCards.push(new FWCard('diamond', CardSize.TWO, CardType.PEACH))
normalCards.push(new FWCard('diamond', CardSize.THREE, CardType.DODGE))
normalCards.push(new FWCard('diamond', CardSize.THREE, CardType.SHUN_SHOU))
normalCards.push(new FWCard('diamond', CardSize.FOUR, CardType.SLASH_FIRE))
normalCards.push(new FWCard('diamond', CardSize.FOUR, CardType.YI_YI))
normalCards.push(new FWCard('diamond', CardSize.FIVE, CardType.SLASH_FIRE))
normalCards.push(new FWCard('diamond', CardSize.FIVE, CardType.GUAN_SHI))
normalCards.push(new FWCard('diamond', CardSize.SIX, CardType.DODGE))
normalCards.push(new FWCard('diamond', CardSize.SIX, CardType.WU_LIU))
normalCards.push(new FWCard('diamond', CardSize.SEVEN, CardType.DODGE))
normalCards.push(new FWCard('diamond', CardSize.SEVEN, CardType.DODGE))
normalCards.push(new FWCard('diamond', CardSize.EIGHT, CardType.DODGE))
normalCards.push(new FWCard('diamond', CardSize.EIGHT, CardType.DODGE))
normalCards.push(new FWCard('diamond', CardSize.NINE, CardType.DODGE))
normalCards.push(new FWCard('diamond', CardSize.NINE, CardType.WINE))
normalCards.push(new FWCard('diamond', CardSize.TEN, CardType.DODGE))
normalCards.push(new FWCard('diamond', CardSize.TEN, CardType.SLASH))
normalCards.push(new FWCard('diamond', CardSize.JACK, CardType.DODGE))
normalCards.push(new FWCard('diamond', CardSize.JACK, CardType.SLASH))
normalCards.push(new FWCard('diamond', CardSize.QUEEN, CardType.SAN_JIAN))
normalCards.push(new FWCard('diamond', CardSize.QUEEN, CardType.SLASH))
normalCards.push(new FWCard('diamond', CardSize.QUEEN, CardType.WU_XIE))
normalCards.push(new FWCard('diamond', CardSize.KING, CardType.DODGE))
normalCards.push(new FWCard('diamond', CardSize.KING, CardType.ZI_XING))

export const FactionWarCards = new CardManager(normalCards.filter(c => 
    // c.type.isBasic() || 
    // c.type.isEquipment() ||
    // c.type.isSlash() ||
    c.type === CardType.PEACH ||
    c.type === CardType.WU_XIE ||
    c.type === CardType.SHUN_SHOU || 
    c.type === CardType.JUE_DOU    
));