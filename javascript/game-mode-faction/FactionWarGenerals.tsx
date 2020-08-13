import { General, Faction } from "../common/GeneralManager"

export default class FactionWarGeneral extends General {

    private constructor(id: string, name: string, faction: Faction, hp: number, 
        ...abilities: string[]) {
        super(id, name, faction, hp, abilities)
    }
    public static standard_cao_cao = new FactionWarGeneral('standard_cao_cao', '曹操', Faction.WEI, 4, '奸雄', '护驾')
    public static standard_liu_bei = new FactionWarGeneral('standard_liu_bei', '刘备', Faction.SHU, 4, '仁德', '激将')
    public static standard_sun_quan = new FactionWarGeneral('standard_sun_quan', '孙权', Faction.WU, 4, '制衡', '救援')
    public static standard_da_qiao = new FactionWarGeneral('standard_da_qiao', '大乔', Faction.WU, 3, '国色', '游离').asFemale().withOffset(-3, -13)
    public static standard_diao_chan = new FactionWarGeneral('standard_diao_chan', '貂蝉', Faction.QUN, 3, '闭月', '离间').asFemale()
    public static standard_gan_ning = new FactionWarGeneral('standard_gan_ning', '甘宁', Faction.WU, 4, '奇袭')
    public static standard_guan_yu = new FactionWarGeneral('standard_guan_yu', '关羽', Faction.SHU, 4, '武圣').withOffset(0, 0)
    public static standard_zhang_fei = new FactionWarGeneral('standard_zhang_fei', '张飞', Faction.SHU, 4, '咆哮').withOffset(-18, -15)
    public static standard_zhu_ge_liang = new FactionWarGeneral('standard_zhu_ge_liang', '诸葛亮', Faction.SHU, 3, '观星', '空城')
    public static standard_zhao_yun = new FactionWarGeneral('standard_zhao_yun', '赵云', Faction.SHU, 4, '龙胆')
    public static standard_ma_chao = new FactionWarGeneral('standard_ma_chao', '马超', Faction.SHU, 4, '马术', '铁骑')
    public static standard_huang_yue_ying = new FactionWarGeneral('standard_huang_yue_ying', '黄月英', Faction.SHU, 3, '急智', '奇才').asFemale()
    public static standard_lv_meng = new FactionWarGeneral('standard_lv_meng', '吕蒙', Faction.WU, 4, '克己')
    public static standard_huang_gai = new FactionWarGeneral('standard_huang_gai', '黄盖', Faction.WU, 4, '苦肉').withOffset(0, 0)
    public static standard_zhou_yu = new FactionWarGeneral('standard_zhou_yu', '周瑜', Faction.WU, 3, '英姿', '反间')
    public static standard_lu_xun = new FactionWarGeneral('standard_lu_xun', '陆逊', Faction.WU, 3, '谦逊', '联营')
    public static standard_sun_shang_xiang = new FactionWarGeneral('standard_sun_shang_xiang', '孙尚香', Faction.WU, 3, '枭姬', '结姻').asFemale()
    public static standard_si_ma_yi = new FactionWarGeneral('standard_si_ma_yi', '司马懿', Faction.WEI, 3, '反馈', '鬼才')
    public static standard_xia_hou_dun = new FactionWarGeneral('standard_xia_hou_dun', '夏侯惇', Faction.WEI, 4, '刚烈')
    public static standard_zhang_liao = new FactionWarGeneral('standard_zhang_liao', '张辽', Faction.WEI, 4, '突袭')
    public static standard_xu_chu = new FactionWarGeneral('standard_xu_chu', '许褚', Faction.WEI, 4, '裸衣').withOffset(-15, -10)
    public static standard_guo_jia = new FactionWarGeneral('standard_guo_jia', '郭嘉', Faction.WEI, 3, '天妒', '遗计')
    public static standard_zhen_ji = new FactionWarGeneral('standard_zhen_ji', '甄姬', Faction.QUN, 3, '洛神', '倾国').asFemale()
    public static standard_hua_tuo = new FactionWarGeneral('standard_hua_tuo', '华佗', Faction.QUN, 3, '青囊', '急救').withOffset(0, -15)
    public static standard_lv_bu = new FactionWarGeneral('standard_lv_bu', '吕布', Faction.QUN, 4, '无双')
    // public static standard_hua_xiong = new General('standard_hua_xiong', '华雄', Faction.QUN, 6, 'qixi')

    public static wind_zhang_jiao = new FactionWarGeneral('wind_zhang_jiao', '张角', Faction.QUN, 3, '雷击', '鬼道', '黄天').withOffset(-10, -15)

    public static forest_dong_zhuo = new FactionWarGeneral('forest_dong_zhuo', '董卓', Faction.QUN, 8, '酒池', '肉林', '崩坏', '暴虐')
    
}