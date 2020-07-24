export default class GeneralManager {




}

export class Package {

    public static STANDARD = new Package('standard', '标准')
    public static SP = new Package('standard', 'SP')
    public static ONE_GENERAL = new Package('one_general', '一将成名')
    public static MOUNTAIN = new Package('mountain', '山')
    public static FOREST = new Package('forest', '林')
    public static FIRE = new Package('fire', '火')
    public static WIND = new Package('wind', '风')
    public static GOD = new Package('god', '神')

    private constructor(id: string, name: string){}
}

export class Faction {

    public static WEI = new Faction('魏', 'wei')
    public static SHU = new Faction('蜀', 'shu')
    public static WU = new Faction('吴', 'wu')
    public static QUN = new Faction('群', 'qun')
    public static SHEN = new Faction('神', 'shen')

    private constructor(public readonly name: string, public readonly image: string) {

    }
}

export class General {

    public static standard_cao_cao = new General('standard_cao_cao', '曹操', Package.STANDARD, Faction.WEI, 4, 'jianxiong', 'hujia')
    public static standard_liu_bei = new General('standard_liu_bei', '刘备', Package.STANDARD, Faction.SHU, 4, 'rende', 'jijiang')
    public static standard_sun_quan = new General('standard_sun_quan', '孙权', Package.STANDARD, Faction.WU, 4, 'zhiheng', 'jiuyuan')
    public static standard_da_qiao = new General('standard_da_qiao', '大乔', Package.STANDARD, Faction.WU, 3, 'guose', 'youli')
    public static standard_diao_chan = new General('standard_diao_chan', '貂蝉', Package.STANDARD, Faction.QUN, 3, 'biyue', 'lijian')
    public static standard_gan_ning = new General('standard_gan_ning', '甘宁', Package.STANDARD, Faction.WU, 4, 'qixi')
    public static standard_guan_yu = new General('standard_guan_yu', '关羽', Package.STANDARD, Faction.SHU, 4, 'wusheng')
    public static standard_zhang_fei = new General('standard_zhang_fei', '张飞', Package.STANDARD, Faction.SHU, 4, 'paoxiao')
    public static standard_zhu_ge_liang = new General('standard_zhu_ge_liang', '诸葛亮', Package.STANDARD, Faction.SHU, 3, 'guanxing', 'kongcheng')
    public static standard_zhao_yun = new General('standard_zhao_yun', '赵云', Package.STANDARD, Faction.SHU, 4, 'longdan')
    public static standard_ma_chao = new General('standard_ma_chao', '马超', Package.STANDARD, Faction.SHU, 4, 'mashu', 'tieji')
    public static standard_huang_yue_ying = new General('standard_huang_yue_ying', '黄月英', Package.STANDARD, Faction.SHU, 3, 'jizhi', 'qicai')
    public static standard_lv_meng = new General('standard_lv_meng', '吕蒙', Package.STANDARD, Faction.WU, 4, 'keji')
    public static standard_huang_gai = new General('standard_huang_gai', '黄盖', Package.STANDARD, Faction.WU, 4, 'kurou')
    public static standard_zhou_yu = new General('standard_zhou_yu', '周瑜', Package.STANDARD, Faction.WU, 3, 'yingzi', 'fanjian')
    public static standard_lu_xun = new General('standard_lu_xun', '陆逊', Package.STANDARD, Faction.WU, 3, 'qianxun', 'lianying')
    public static standard_sun_shang_xiang = new General('standard_sun_shang_xiang', '孙尚香', Package.STANDARD, Faction.WU, 3, 'xiaoji', 'jieyin')
    public static standard_si_ma_yi = new General('standard_si_ma_yi', '司马懿', Package.STANDARD, Faction.WEI, 3, 'fankui', 'guicai')
    public static standard_xia_hou_dun = new General('standard_xia_hou_dun', '夏侯惇', Package.STANDARD, Faction.WEI, 4, 'ganglie')
    public static standard_zhang_liao = new General('standard_zhang_liao', '张辽', Package.STANDARD, Faction.WEI, 4, 'tuxi')
    public static standard_xu_chu = new General('standard_xu_chu', '许褚', Package.STANDARD, Faction.WEI, 4, 'luoyi')
    public static standard_guo_jia = new General('standard_guo_jia', '郭嘉', Package.STANDARD, Faction.WEI, 3, 'tiandu', 'yiji')
    public static standard_zhen_ji = new General('standard_zhen_ji', '甄姬', Package.STANDARD, Faction.QUN, 3, 'luoshen', 'qingguo')
    public static standard_hua_tuo = new General('standard_hua_tuo', '华佗', Package.STANDARD, Faction.QUN, 3, 'qingnang', 'jijiu')
    public static standard_lv_bu = new General('standard_lv_bu', '吕布', Package.STANDARD, Faction.QUN, 4, 'wushuang')
    // public static standard_hua_xiong = new General('standard_hua_xiong', '华雄', Package.STANDARD, Faction.QUN, 6, 'qixi')

    public static wind_zhang_jiao = new General('wind_zhang_jiao', '张角', Package.WIND, Faction.QUN, 3, 'leiji', 'guidao', 'huangtian')

    /**
     * @param id used to locate the resource
     * @param name name in Chinese
     * @param faction faction
     * @param hp HP value
     * @param abilities default abilities with this General
     */
    private constructor(public id: string, public name: string, public pack: Package, public faction: Faction, public hp: number, ...abilities: string[]) {
        
    }

}
