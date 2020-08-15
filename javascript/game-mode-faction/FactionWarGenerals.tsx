import { General, Faction } from "../common/GeneralManager"


const defRender = {
    x: -41,
    y: -6,
    w: 120,
    h: 120
}

export default class FactionWarGeneral extends General {

    private constructor(id: string, name: string, faction: Faction, hp: number, 
        ...abilities: string[]) {
        super(id, name, faction, hp, abilities)
    }

    //when soldier is used to replace people the hp and factions are already set so no worries
    public static soldier_male = new FactionWarGeneral('guo_soldier_male', '士兵', Faction.UNKNOWN, 0)
    public static soldier_female = new FactionWarGeneral('guo_soldier_female', '士兵', Faction.UNKNOWN, 0)

    public static cao_cao = new FactionWarGeneral('standard_cao_cao', '曹操', Faction.WEI, 2, '奸雄')
    public static si_ma_yi = new FactionWarGeneral('standard_si_ma_yi', '司马懿', Faction.WEI, 1.5, '反馈', '鬼才')
    public static xia_hou_dun = new FactionWarGeneral('standard_xia_hou_dun', '夏侯惇', Faction.WEI, 2, '刚烈')
    public static zhang_liao = new FactionWarGeneral('standard_zhang_liao', '张辽', Faction.WEI, 2, '突袭')
    public static xu_chu = new FactionWarGeneral('standard_xu_chu', '许褚', Faction.WEI, 2, '裸衣')
    public static guo_jia = new FactionWarGeneral('standard_guo_jia', '郭嘉', Faction.WEI, 1.5, '天妒', '遗计')
    public static zhen_ji = new FactionWarGeneral('standard_zhen_ji', '甄姬', Faction.WEI, 1.5, '洛神', '倾国').asFemale() as FactionWarGeneral
    public static xia_hou_yuan = new FactionWarGeneral('wind_xia_hou_yuan', '夏侯渊', Faction.WEI, 2, '神速')
    public static zhang_he = new FactionWarGeneral('mountain_zhang_he', '张郃', Faction.WEI, 2, '巧变')
    public static xu_huang = new FactionWarGeneral('forest_xu_huang', '徐晃', Faction.WEI, 2, '断粮')
    public static cao_ren = new FactionWarGeneral('wind_cao_ren', '曹仁', Faction.WEI, 2, '据守')
    public static dian_wei = new FactionWarGeneral('fire_dian_wei', '典韦', Faction.WEI, 2, '强袭')
    public static xun_yu = new FactionWarGeneral('fire_xun_yu', '荀彧', Faction.WEI, 1.5, '驱虎', '节命')
    public static cao_pi = new FactionWarGeneral('forest_cao_pi', '曹丕', Faction.WEI, 1.5, '行殇', '放逐')
    public static yue_jin = new FactionWarGeneral('guo_yue_jin', '乐进', Faction.WEI, 2, '骁果')

    public static liu_bei = new FactionWarGeneral('standard_liu_bei', '刘备', Faction.SHU, 2, '仁德')  
    public static guan_yu = new FactionWarGeneral('standard_guan_yu', '关羽', Faction.SHU, 2, '武圣')
    public static zhang_fei = new FactionWarGeneral('standard_zhang_fei', '张飞', Faction.SHU, 2, '咆哮')
    public static zhu_ge_liang = new FactionWarGeneral('standard_zhu_ge_liang', '诸葛亮', Faction.SHU, 1.5, '观星', '空城')
    public static zhao_yun = new FactionWarGeneral('standard_zhao_yun', '赵云', Faction.SHU, 2, '龙胆')
    public static ma_chao = new FactionWarGeneral('standard_ma_chao', '马超', Faction.SHU, 2, '马术', '铁骑')
    public static huang_yue_ying = new FactionWarGeneral('standard_huang_yue_ying', '黄月英', Faction.SHU, 3, '急智', '奇才').asFemale() as FactionWarGeneral
    public static huang_zhong = new FactionWarGeneral('standard_huang_zhong', '黄忠', Faction.SHU, 2, '烈弓')
    public static wei_yan = new FactionWarGeneral('wind_wei_yan', '魏延', Faction.SHU, 2, '狂骨')
    public static pang_tong = new FactionWarGeneral('fire_pang_tong', '庞统', Faction.SHU, 1.5, '连环', '涅槃')
    public static wo_long = new FactionWarGeneral('fire_zhu_ge_liang', '诸葛亮', Faction.SHU, 1.5, '八阵', '火计', '看破')
    public static liu_shan = new FactionWarGeneral('mountain_liu_shan', '刘禅', Faction.SHU, 1.5, '八阵', '火计', '看破')
    public static meng_huo = new FactionWarGeneral('forest_meng_huo', '孟获', Faction.SHU, 2, '祸首', '再起')
    public static zhu_rong = new FactionWarGeneral('forest_zhu_rong', '祝融', Faction.SHU, 2, '巨象', '烈刃').asFemale() as FactionWarGeneral
    public static gan_fu_ren = new FactionWarGeneral('guo_gan_fu_ren', '甘夫人', Faction.SHU, 1.5, '淑慎', '神智').asFemale() as FactionWarGeneral

    public static sun_quan = new FactionWarGeneral('standard_sun_quan', '孙权', Faction.WU, 2, '制衡')
    public static gan_ning = new FactionWarGeneral('standard_gan_ning', '甘宁', Faction.WU, 2, '奇袭')
    public static lv_meng = new FactionWarGeneral('standard_lv_meng', '吕蒙', Faction.WU, 2, '克己', '谋断')
    public static huang_gai = new FactionWarGeneral('standard_huang_gai', '黄盖', Faction.WU, 2, '苦肉')
    public static zhou_yu = new FactionWarGeneral('standard_zhou_yu', '周瑜', Faction.WU, 1.5, '英姿', '反间')
    public static da_qiao = new FactionWarGeneral('standard_da_qiao', '大乔', Faction.WU, 1.5, '国色', '游离').asFemale() as FactionWarGeneral
    public static lu_xun = new FactionWarGeneral('standard_lu_xun', '陆逊', Faction.WU, 1.5, '谦逊', '度势')
    public static sun_shang_xiang = new FactionWarGeneral('standard_sun_shang_xiang', '孙尚香', Faction.WU, 1.5, '枭姬', '结姻').asFemale() as FactionWarGeneral
    public static sun_jian = new FactionWarGeneral('forest_sun_jian', '孙坚', Faction.WU, 2.5, '英魂')
    public static xiao_qiao = new FactionWarGeneral('wind_xiao_qiao', '小乔', Faction.WU, 1.5, '天香', '红颜').asFemale() as FactionWarGeneral
    public static tai_shi_ci = new FactionWarGeneral('fire_tai_shi_ci', '太史慈', Faction.WU, 2, '天义').asFemale() as FactionWarGeneral
    public static zhou_tai = new FactionWarGeneral('wind_zhou_tai', '周泰', Faction.WU, 2, '不屈', '奋激')
    public static lu_su = new FactionWarGeneral('forest_lu_su', '鲁肃', Faction.WU, 1.5, '好施', '缔盟')
    public static er_zhang = new FactionWarGeneral('mountain_er_zhang', '张昭张纮', Faction.WU, 1.5, '直谏', '固政')
    public static ding_feng = new FactionWarGeneral('guo_ding_feng', '丁奉', Faction.WU, 2, '短兵', '奋迅')

    public static hua_tuo = new FactionWarGeneral('standard_hua_tuo', '华佗', Faction.QUN, 1.5, '除疬', '急救')
    public static lv_bu = new FactionWarGeneral('standard_lv_bu', '吕布', Faction.QUN, 2.5, '无双')
    public static diao_chan = new FactionWarGeneral('standard_diao_chan', '貂蝉', Faction.QUN, 1.5, '闭月', '离间').asFemale() as FactionWarGeneral
    public static yuan_shao = new FactionWarGeneral('fire_yuan_shao', '袁绍', Faction.QUN, 2, '乱击')
    public static yan_liang_wen_chou = new FactionWarGeneral('fire_yan_liang_wen_chou', '颜良文丑', Faction.QUN, 2, '双雄')
    public static jia_xu = new FactionWarGeneral('forest_jia_xu', '贾诩', Faction.QUN, 1.5, '完杀', '乱武', '帷幕')
    public static pang_de = new FactionWarGeneral('fire_pang_de', '庞德', Faction.QUN, 2, '马术', '鞬出')
    public static zhang_jiao = new FactionWarGeneral('wind_zhang_jiao', '张角', Faction.QUN, 3, '雷击', '鬼道')
    public static cai_wen_ji = new FactionWarGeneral('mountain_cai_wen_ji', '蔡文姬', Faction.QUN, 1.5, '悲歌', '断肠').asFemale() as FactionWarGeneral
    public static ma_teng = new FactionWarGeneral('guo_ma_teng', '马腾', Faction.QUN, 2, '马术', '雄异')
    public static kong_rong = new FactionWarGeneral('guo_kong_rong', '孔融', Faction.QUN, 1.5, '名士', '礼让')
    public static ji_ling = new FactionWarGeneral('guo_ji_ling', '纪灵', Faction.QUN, 2, '双刃')
    public static tian_feng = new FactionWarGeneral('guo_tian_feng', '田丰', Faction.QUN, 1.5, '死谏', '随势')
    public static pan_feng = new FactionWarGeneral('guo_pan_feng', '潘凤', Faction.QUN, 2, '狂斧')
    public static zou_shi = new FactionWarGeneral('guo_zou_shi', '邹氏', Faction.QUN, 1.5, '祸水', '倾城').asFemale() as FactionWarGeneral
    
    public static deng_ai = new FactionWarGeneral('mountain_deng_ai', '邓艾', Faction.WEI, 2, '屯田', '资粮', '急袭')
    public static cao_hong = new FactionWarGeneral('guo_cao_hong', '曹洪', Faction.WEI, 2, '护援', '鹤翼')
    public static jiang_wan_fei_yi = new FactionWarGeneral('guo_jiang_wan_fei_yi', '蒋琬费祎', Faction.SHU, 1.5, '生息', '守成')
    public static jiang_wei = new FactionWarGeneral('mountain_jiang_wei', '姜维', Faction.SHU, 2, '挑衅', '遗志', '天覆')
    public static xu_sheng = new FactionWarGeneral('fame_xu_sheng', '徐盛', Faction.WU, 2, '疑城')
    public static jiang_qin = new FactionWarGeneral('guo_jiang_qin', '蒋钦', Faction.WU, 2, '尚义', '鸟翔')
    public static he_tai_hou = new FactionWarGeneral('guo_he_tai_hou', '何太后', Faction.QUN, 1.5, '鸩毒', '戚乱').asFemale() as FactionWarGeneral
    public static yu_ji = new FactionWarGeneral('wind_yu_ji', '于吉', Faction.QUN, 1.5, '千幻')
    
    public static li_dian = new FactionWarGeneral('bound_li_dian', '李典', Faction.WEI, 2, '恂恂', '忘隙')
    public static zang_ba = new FactionWarGeneral('guo_zang_ba', '臧霸', Faction.WEI, 2, '横江')
    public static ma_dai = new FactionWarGeneral('fame_ma_dai', '马岱', Faction.SHU, 2, '马术', '潜袭')
    public static mi_fu_ren = new FactionWarGeneral('guo_mi_fu_ren', '糜夫人', Faction.SHU, 1.5, '闺秀', '存嗣').asFemale() as FactionWarGeneral
    public static sun_ce = new FactionWarGeneral('guo_sun_ce', '孙策', Faction.WU, 2, '激昂', '鹰扬', '魂殇')
    public static chen_wu_dong_xi = new FactionWarGeneral('guo_chen_wu_dong_xi', '陈武董袭', Faction.WU, 2, '断绁', '奋命')
    public static dong_zhuo = new FactionWarGeneral('forest_dong_zhuo', '董卓', Faction.QUN, 2, '横征', '暴凌')
    public static zhang_ren = new FactionWarGeneral('guo_zhang_ren', '张任', Faction.QUN, 2, '穿心', '锋矢')
    public static xun_you = new FactionWarGeneral('fame_xun_you', '荀攸', Faction.WEI, 1.5, '奇策', '智愚')
    public static sha_mo_ke = new FactionWarGeneral('guo_sha_mo_ke', '沙摩柯', Faction.SHU, 2, '蒺藜')
    public static fa_zheng = new FactionWarGeneral('fame_fa_zheng', '法正', Faction.SHU, 1.5, '眩惑', '恩怨')
    public static lv_fan = new FactionWarGeneral('guo_lv_fan', '吕范', Faction.WU, 1.5, '调度', '典财')
    public static li_jue_guo_si = new FactionWarGeneral('guo_li_jue_guo_si', '李傕郭汜', Faction.QUN, 2, '凶算')
    
    // public static forest_dong_zhuo = new FactionWarGeneral('forest_dong_zhuo', '董卓', Faction.QUN, 8, '酒池', '肉林', '崩坏', '暴虐')

    
    // public static standard_hua_xiong = new General('standard_hua_xiong', '华雄', Faction.QUN, 6, 'qixi')
    
}