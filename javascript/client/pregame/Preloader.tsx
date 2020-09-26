import { CardType } from "../../common/cards/Card"

const images = []
function preloadCard(...types: CardType[]) {
    types.forEach(p => {
        let image = new Image()
        image.src = window.location + '/cards/' + p.id + '.png'
        images.push(image)
    })
}

console.log('Setting up Preloader!')
function addLoadEvent(func: ()=>void) {
	var oldonload: (eve: any)=>void = window.onload;
	if (typeof window.onload != 'function') {
		window.onload = func;
	} else {
		window.onload = function() {
			if (oldonload) {
				oldonload(undefined);
			}
			func();
		}
	}
}
addLoadEvent(preloader);

//-- usage --//
function preloader() {
    console.log('Preloading Card Types!')
    preloadCard(
        CardType.BACK,

        CardType.SLASH, CardType.SLASH_FIRE, CardType.SLASH_THUNDER, CardType.DODGE, CardType.PEACH, CardType.WINE,

        CardType.TENG_JIA, CardType.BA_GUA, CardType.SILVER_LION, CardType.REN_WANG,

        CardType.ZHANG_BA,
        CardType.QING_LONG,
        CardType.QING_GANG,
        CardType.CI_XIONG,
        CardType.GU_DING,
        CardType.ZHU_QUE,
        CardType.GUAN_SHI,
        CardType.LIAN_NU,
        CardType.FANG_TIAN,
        CardType.HAN_BING,
        CardType.QI_LIN,

        CardType.DA_YUAN,
        CardType.ZHUA_HUANG,
        CardType.DI_LU,
        CardType.ZI_XING,
        CardType.JUE_YING,
        CardType.CHI_TU,
        CardType.HUA_LIU,

        CardType.JIE_DAO,
        CardType.GUO_HE,
        CardType.SHUN_SHOU,
        CardType.WU_XIE,
        CardType.WU_ZHONG,
        CardType.JUE_DOU,
        CardType.HUO_GONG,
        CardType.TIE_SUO,

        CardType.TAO_YUAN,
        CardType.WAN_JIAN,
        CardType.NAN_MAN,
        CardType.WU_GU,

        CardType.LE_BU,
        CardType.BING_LIANG,
        CardType.SHAN_DIAN,

        ////////// ----------------- 国战 -----------------------//////////////////
        CardType.YI_YI,
        CardType.ZHI_JI,
        CardType.YUAN_JIAO,
        CardType.WU_LIU,
        CardType.SAN_JIAN,
        CardType.WU_XIE_GUO)
}