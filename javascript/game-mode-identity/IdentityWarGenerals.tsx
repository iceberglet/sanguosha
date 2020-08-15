import { General, Faction } from "../common/GeneralManager"

export class Package {

    public static STANDARD = new Package('standard', '标准')
    public static SP = new Package('standard', 'SP')
    public static ONE_GENERAL = new Package('one_general', '一将成名')
    public static MOUNTAIN = new Package('mountain', '山')
    public static FOREST = new Package('forest', '林')
    public static FIRE = new Package('fire', '火')
    public static WIND = new Package('wind', '风')
    public static GOD = new Package('god', '神')

    private constructor(public readonly id: string, public readonly name: string){}
}

export default class IdentityWarGeneral extends General {

    private constructor(id: string, name: string, public pack: Package, faction: Faction, hp: number, 
        ...abilities: string[]) {
        super(id, name, faction, hp, abilities)
    }
    public static standard_cao_cao = new IdentityWarGeneral('standard_cao_cao', '曹操', Package.STANDARD, Faction.WEI, 4, '奸雄', '护驾')
    public static standard_liu_bei = new IdentityWarGeneral('standard_liu_bei', '刘备', Package.STANDARD, Faction.SHU, 4, '仁德', '激将')
    public static standard_sun_quan = new IdentityWarGeneral('standard_sun_quan', '孙权', Package.STANDARD, Faction.WU, 4, '制衡', '救援')
    public static standard_da_qiao = new IdentityWarGeneral('standard_da_qiao', '大乔', Package.STANDARD, Faction.WU, 3, '国色', '游离').asFemale().withOffset(-3, -13)
    public static standard_diao_chan = new IdentityWarGeneral('standard_diao_chan', '貂蝉', Package.STANDARD, Faction.QUN, 3, '闭月', '离间').asFemale()
    public static standard_gan_ning = new IdentityWarGeneral('standard_gan_ning', '甘宁', Package.STANDARD, Faction.WU, 4, '奇袭')
    public static standard_guan_yu = new IdentityWarGeneral('standard_guan_yu', '关羽', Package.STANDARD, Faction.SHU, 4, '武圣').withOffset(0, 0)
    public static standard_zhang_fei = new IdentityWarGeneral('standard_zhang_fei', '张飞', Package.STANDARD, Faction.SHU, 4, '咆哮').withOffset(-18, -15)
    public static standard_zhu_ge_liang = new IdentityWarGeneral('standard_zhu_ge_liang', '诸葛亮', Package.STANDARD, Faction.SHU, 3, '观星', '空城')
    public static standard_zhao_yun = new IdentityWarGeneral('standard_zhao_yun', '赵云', Package.STANDARD, Faction.SHU, 4, '龙胆')
    public static standard_ma_chao = new IdentityWarGeneral('standard_ma_chao', '马超', Package.STANDARD, Faction.SHU, 4, '马术', '铁骑')
    public static standard_huang_yue_ying = new IdentityWarGeneral('standard_huang_yue_ying', '黄月英', Package.STANDARD, Faction.SHU, 3, '急智', '奇才').asFemale()
    public static standard_lv_meng = new IdentityWarGeneral('standard_lv_meng', '吕蒙', Package.STANDARD, Faction.WU, 4, '克己')
    public static standard_huang_gai = new IdentityWarGeneral('standard_huang_gai', '黄盖', Package.STANDARD, Faction.WU, 4, '苦肉').withOffset(0, 0)
    public static standard_zhou_yu = new IdentityWarGeneral('standard_zhou_yu', '周瑜', Package.STANDARD, Faction.WU, 3, '英姿', '反间')
    public static standard_lu_xun = new IdentityWarGeneral('standard_lu_xun', '陆逊', Package.STANDARD, Faction.WU, 3, '谦逊', '联营')
    public static standard_sun_shang_xiang = new IdentityWarGeneral('standard_sun_shang_xiang', '孙尚香', Package.STANDARD, Faction.WU, 3, '枭姬', '结姻').asFemale()
    public static standard_si_ma_yi = new IdentityWarGeneral('standard_si_ma_yi', '司马懿', Package.STANDARD, Faction.WEI, 3, '反馈', '鬼才')
    public static standard_xia_hou_dun = new IdentityWarGeneral('standard_xia_hou_dun', '夏侯惇', Package.STANDARD, Faction.WEI, 4, '刚烈')
    public static standard_zhang_liao = new IdentityWarGeneral('standard_zhang_liao', '张辽', Package.STANDARD, Faction.WEI, 4, '突袭')
    public static standard_xu_chu = new IdentityWarGeneral('standard_xu_chu', '许褚', Package.STANDARD, Faction.WEI, 4, '裸衣').withOffset(-15, -10)
    public static standard_guo_jia = new IdentityWarGeneral('standard_guo_jia', '郭嘉', Package.STANDARD, Faction.WEI, 3, '天妒', '遗计')
    public static standard_zhen_ji = new IdentityWarGeneral('standard_zhen_ji', '甄姬', Package.STANDARD, Faction.WEI, 3, '洛神', '倾国').asFemale()
    public static standard_hua_tuo = new IdentityWarGeneral('standard_hua_tuo', '华佗', Package.STANDARD, Faction.QUN, 3, '青囊', '急救').withOffset(0, -15)
    public static standard_lv_bu = new IdentityWarGeneral('standard_lv_bu', '吕布', Package.STANDARD, Faction.QUN, 4, '无双')
    // public static standard_hua_xiong = new General('standard_hua_xiong', '华雄', Package.STANDARD, Faction.QUN, 6, 'qixi')

    public static wind_zhang_jiao = new IdentityWarGeneral('wind_zhang_jiao', '张角', Package.WIND, Faction.QUN, 3, '雷击', '鬼道', '黄天').withOffset(-10, -15)

    public static forest_dong_zhuo = new IdentityWarGeneral('forest_dong_zhuo', '董卓', Package.FOREST, Faction.QUN, 8, '酒池', '肉林', '崩坏', '暴虐')
    
}