type UiRendering = {
    x: number
    y: number
    w: number
    h: number
}

const smallRender = new Map<string, UiRendering>()
const bigRender = new Map<string, UiRendering>()


function doAdd(id: string, x: number, y: number, wh: number, x2: number, y2: number, wh2: number) {
    bigRender.set(id, {x, y, w: wh, h: wh})
    smallRender.set(id, {x: x2, y: y2, w: wh2, h: wh2})
}

doAdd('guo_soldier_male', -80, -30, 180, -115, -35, 200)
doAdd('guo_soldier_female', -80, -50, 180, -130, -45, 200)

doAdd('standard_cao_cao', -80, -30, 180, -130, -25, 200)
doAdd('standard_si_ma_yi', -40, 0, 150, -90, -15, 200)
doAdd('standard_xia_hou_dun', -28, -15, 150, -70, -25, 200)
doAdd('standard_zhang_liao', -28, -15, 150, -90, -25, 200)
doAdd('standard_xu_chu', -48, -18, 150, -110, -45, 200)
doAdd('standard_guo_jia', -48, -18, 150, -120, -15, 200)
doAdd('standard_zhen_ji', -68, -5, 150, -120, -15, 170)
doAdd('wind_xia_hou_yuan', -28, -45, 150, -80, -55, 170)
doAdd('mountain_zhang_he', -38, -15, 150, -80, -25, 170)
doAdd('forest_xu_huang', -38, -5, 150, -80, -25, 170)
doAdd('wind_cao_ren', -158, -65, 250, -160, -45, 250)
doAdd('fire_dian_wei', -45, 0, 150, -110, -5, 200)
doAdd('fire_xun_yu', -30, 0, 150, -90, -25, 200)
doAdd('forest_cao_pi', -35, -30, 150, -90, -55, 200)
doAdd('guo_cao_pi', -28, -35, 170, -70, -60, 200)
doAdd('guo_yue_jin', -105, -70, 200, -110, -55, 200)

doAdd('standard_liu_bei', -30, -10, 150, -90, -15, 200)
doAdd('standard_guan_yu', -30, -10, 150, -90, -15, 200)
doAdd('standard_zhang_fei', -90, -60, 200, -110, -45, 200)
doAdd('standard_zhu_ge_liang', -50, -20, 150, -120, -25, 200)
doAdd('standard_zhao_yun', -30, 0, 150, -70, -10, 170)
doAdd('standard_ma_chao', -40, -20, 150, -80, -10, 170)
doAdd('standard_huang_yue_ying', -20, 0, 150, -60, -0, 170)
doAdd('standard_huang_zhong', -50, 0, 150, -110, -0, 170)
doAdd('wind_wei_yan', -40, -30, 150, -70, -30, 170)
doAdd('fire_pang_tong', -20, -20, 150, -40, -30, 170)
doAdd('fire_wo_long', -80, -20, 150, -140, -20, 170)
doAdd('mountain_liu_shan', -30, -20, 150, -80, -20, 170)
doAdd('forest_meng_huo', -40, -50, 150, -80, -50, 170)
doAdd('forest_zhu_rong', -60, -20, 150, -110, -30, 170)
doAdd('guo_gan_fu_ren', -60, 0, 150, -100, -20, 170)

doAdd('standard_sun_quan', -60, -30, 200, -60, -20, 170)
doAdd('standard_gan_ning', -40, 0, 150, -80, -0, 170)
doAdd('standard_lv_meng', -30, 0, 150, -60, -0, 170)
doAdd('standard_huang_gai', -30, 0, 150, -40, -0, 170)
doAdd('standard_zhou_yu', -60, -20, 200, -65, -20, 170)
doAdd('standard_da_qiao', -60, -5, 150, -105, -10, 170)
doAdd('standard_lu_xun', -20, -25, 150, -55, -30, 170)
doAdd('standard_sun_shang_xiang', -20, -35, 150, -35, -40, 170)
doAdd('forest_sun_jian', -120, -80, 240, -140, -70, 250)
doAdd('wind_xiao_qiao', -50, 0, 150, -100, -0, 170)
doAdd('fire_tai_shi_ci', -65, -40, 170, -80, -50, 170)
doAdd('wind_zhou_tai', -55, -20, 170, -80, -20, 170)
doAdd('forest_lu_su', -70, -20, 170, -80, -20, 170)
doAdd('mountain_er_zhang', -35, -20, 150, -30, -10, 110)
doAdd('guo_ding_feng', -25, -50, 150, -40, -50, 170)

doAdd('standard_hua_tuo', -50, -5, 150, -90, -10, 170)
doAdd('standard_lv_bu', -20, -25, 150, -50, -20, 170)
doAdd('standard_diao_chan', -30, -15, 150, -60, -20, 170)
doAdd('fire_yuan_shao', -50, -35, 150, -110, -40, 170)
doAdd('fire_yan_liang_wen_chou', -20, -25, 150, -50, -40, 170)
doAdd('forest_jia_xu', -45, -25, 150, -90, -40, 170)
doAdd('fire_pang_de', -25, -25, 150, -60, -30, 170)
doAdd('wind_zhang_jiao', -45, -25, 150, -100, -30, 170)
doAdd('mountain_cai_wen_ji', -55, -55, 150, -100, -60, 170)
doAdd('guo_ma_teng', -45, -15, 150, -80, -30, 170)
doAdd('guo_kong_rong', -55, -55, 150, -60, -10, 170)
doAdd('guo_ji_ling', -55, -55, 150, -75, -10, 170)
doAdd('guo_tian_feng', -35, -5, 150, -55, 0, 170)
doAdd('guo_pan_feng', -55, -5, 150, -95, 0, 170)
doAdd('guo_zou_shi', -35, -20, 120, -105, -20, 170)

doAdd('mountain_deng_ai', -15, -20, 150, -65, -20, 170)
doAdd('guo_cao_hong', -35, -0, 120, -135, 0, 170)
doAdd('guo_jiang_wan_fei_yi', -35, -0, 120, -25, 0, 100)
doAdd('mountain_jiang_wei', -25, -10, 120, -75, 0, 170)
doAdd('fame_xu_sheng', -15, -10, 120, -65, -10, 150)
doAdd('guo_jiang_qin', -35, -0, 120, -55, 0, 150)
doAdd('guo_he_tai_hou', -40, -20, 150, -60, -10, 170)
// doAdd('guo_he_tai_hou 3', -15, -0, 120)
doAdd('wind_yu_ji', -85, -50, 180, -125, -70, 200)

doAdd('bound_li_dian', -55, -20, 150, -105, -40, 200)
doAdd('guo_zang_ba', -35, -40, 150, -95, -70, 200)
doAdd('fame_ma_dai', -55, -40, 150, -125, -50, 200)
doAdd('guo_mi_fu_ren', -55, -40, 150, -65, -30, 200)
doAdd('guo_sun_ce', -45, -20, 150, -105, -20, 200)
doAdd('guo_chen_wu_dong_xi', -45, -50, 150, -50, -30, 120)
doAdd('forest_dong_zhuo', -25, -10, 150, -70, -10, 170)
doAdd('guo_zhang_ren', -25, -10, 150, -50, -10, 170)
doAdd('fame_xun_you', -45, -30, 150, -90, -30, 170)
doAdd('guo_sha_mo_ke', -40, -20, 150, -95, -30, 200)
doAdd('fame_fa_zheng', -25, -10, 150, -50, -10, 170)
doAdd('guo_lv_fan', -5, -10, 150, -40, -10, 170)
doAdd('guo_li_jue_guo_si', -15, -30, 120, -45, -40, 120)
doAdd('guo_zhang_xiu', -50, -30, 150, -100, -40, 170)
doAdd('fame_zu_shou', -170, -35, 300, -210, -50, 350)
doAdd('guo_xun_chen', -50, -30, 150, -80, -20, 170)


//--------------- skins -------------------------

doAdd('skin_cai_wen_ji_1', -40, 0, 150, -120, -15, 200)
doAdd('skin_cai_wen_ji_2', -30, -30, 150, -90, -65, 200)
doAdd('skin_cai_wen_ji_3', -30, -30, 150, -60, -45, 200)
doAdd('skin_cai_wen_ji_4', -30, -30, 150, -70, -75, 200)
doAdd('skin_cai_wen_ji_5', -30, -50, 150, -70, -55, 200)

doAdd('skin_cao_cao_1', -20, -20, 150, -40, -15, 140)
doAdd('skin_cao_cao_2', -50, -10, 150, -110, -25, 200)
doAdd('skin_cao_cao_3', -20, 0, 150, -80, 0, 200)
doAdd('skin_cao_cao_4', -40, -0, 150, -60, 0, 130)
doAdd('skin_cao_cao_5', -40, -0, 150, -100, 0, 200)

doAdd('skin_cao_pi_1', -40, -30, 150, -100, -40, 200)
doAdd('skin_cao_pi_2', -40, -10, 150, -90, -30, 200)
doAdd('skin_cao_pi_3', -40, -10, 150, -110, -10, 200)
doAdd('skin_cao_pi_4', -60, -20, 150, -115, -50, 200)
doAdd('skin_cao_pi_5', 0, 0, 100, -55, -10, 150)

doAdd('skin_cao_ren_1', -40, -30, 150, -55, -30, 150)
doAdd('skin_cao_ren_2', -40, -20, 150, -95, -30, 200)
doAdd('skin_cao_ren_3', -40, -20, 150, -105, -30, 200)
doAdd('skin_cao_ren_4', -40, 0, 150, -95, 0, 200)

doAdd('skin_chen_wu_dong_xi_1', -30, 0, 120, -45, 0, 100)
doAdd('skin_chen_wu_dong_xi_2', -30, -20, 120, -25, 0, 100)

doAdd('skin_da_qiao_1', -30, 0, 120, -120, 0, 200)
doAdd('skin_da_qiao_2', -30, 0, 120, -90, 0, 150)
doAdd('skin_da_qiao_3', -30, 0, 120, -60, 0, 150)
doAdd('skin_da_qiao_4', -10, 0, 120, -50, -10, 150)
doAdd('skin_da_qiao_5', -10, 0, 120, -30, -10, 150)

doAdd('skin_deng_ai_1', -60, 0, 150, -70, 0, 150)
doAdd('skin_deng_ai_2', -40, 0, 150, -90, 0, 200)
doAdd('skin_deng_ai_3', -40, -10, 150, -110, -20, 200)
doAdd('skin_deng_ai_4', -40, -10, 150, -80, -40, 200)
doAdd('skin_deng_ai_5', -50, 0, 150, -130, -10, 200)

doAdd('skin_dian_wei_1', -50, 0, 150, -100, -10, 200)
doAdd('skin_dian_wei_2', -50, -20, 150, -110, -40, 200)
doAdd('skin_dian_wei_3', -50, -20, 150, -80, -40, 200)
doAdd('skin_dian_wei_4', -50, -20, 150, -100, -15, 200)
doAdd('skin_dian_wei_5', -50, -20, 150, -110, -20, 200)

doAdd('skin_diao_chan_1', -20, 0, 120, -80, -10, 200)
doAdd('skin_diao_chan_2', -10, -15, 120, -50, -50, 200)
doAdd('skin_diao_chan_3', 0, 0, 120, -70, -30, 200)
doAdd('skin_diao_chan_4', 0, 0, 120, -60, -20, 200)
doAdd('skin_diao_chan_5', -50, 0, 120, -140, -40, 200)

doAdd('skin_dong_zhuo_1', 0, 0, 120, -70, -40, 200)
doAdd('skin_dong_zhuo_2', 0, 0, 120, -120, -40, 200)
doAdd('skin_dong_zhuo_3', -20, 0, 120, -120, -10, 200)
doAdd('skin_dong_zhuo_4', -20, 0, 120, -120, -20, 200)
doAdd('skin_dong_zhuo_5', -10, 0, 120, -100, -20, 200)

doAdd('skin_er_zhang_1', -10, 0, 120, -70, 0, 150)
doAdd('skin_er_zhang_2', -10, 0, 120, -40, 0, 120)
doAdd('skin_er_zhang_3', -30, 0, 120, -50, 0, 120)
doAdd('skin_er_zhang_4', -10, 0, 120, -40, 0, 120)
doAdd('skin_er_zhang_5', -10, 0, 120, -40, 0, 120)

doAdd('skin_gan_fu_ren_1', -10, 0, 120, -60, -20, 200)
doAdd('skin_gan_fu_ren_2', -20, 0, 120, -140, -10, 200)
doAdd('skin_gan_fu_ren_3', -10, -30, 120, -60, -40, 200)
doAdd('skin_gan_fu_ren_4', -10, 0, 120, -40, 0, 150)
doAdd('skin_gan_fu_ren_5', -20, 0, 120, -90, -20, 150)

doAdd('skin_gan_ning_1', -20, 0, 140, -90, 0, 200)
doAdd('skin_gan_ning_2', -20, -30, 120, -110, -50, 200)
doAdd('skin_gan_ning_3', -40, 10, 120, -140, -10, 200)
doAdd('skin_gan_ning_4', -90, 10, 120, -190, -10, 200)
doAdd('skin_gan_ning_5', -20, -10, 120, -70, -30, 200)

doAdd('skin_guan_yu_1', -40, 0, 120, -110, 0, 200)
doAdd('skin_guan_yu_2', -40, 0, 120, -90, -20, 200)
doAdd('skin_guan_yu_3', -30, 0, 120, -100, 0, 200)
doAdd('skin_guan_yu_4', -30, 0, 120, -70, -20, 200)
doAdd('skin_guan_yu_5', -30, 0, 120, -90, 0, 200)

doAdd('skin_guo_jia_1', -60, -30, 120, -140, -60, 200)
doAdd('skin_guo_jia_2', -35, 0, 120, -110, 0, 200)
doAdd('skin_guo_jia_3', -65, -20, 120, -140, -40, 200)
doAdd('skin_guo_jia_4', 0, 0, 140, -40, 0, 150)
doAdd('skin_guo_jia_5', -50, -30, 140, -100, -60, 200)

doAdd('skin_he_tai_hou_1', 0, 0, 100, -60, -10, 150)
doAdd('skin_he_tai_hou_2', -30, 0, 140, -60, 0, 150)
doAdd('skin_he_tai_hou_3', -30, -30, 140, -80, -50, 200)
doAdd('skin_he_tai_hou_4', -50, -30, 140, -130, -30, 200)
doAdd('skin_he_tai_hou_5', -50, -50, 140, -120, -60, 200)

doAdd('skin_hua_tuo_1', -20, -40, 140, -100, -60, 200)
doAdd('skin_hua_tuo_2', -20, 0, 140, -70, -10, 200)
doAdd('skin_hua_tuo_3', -20, -30, 140, -80, -50, 200)
doAdd('skin_hua_tuo_4', -50, 0, 140, -130, 0, 200)
doAdd('skin_hua_tuo_5', -30, 0, 140, -100, 0, 200)

doAdd('skin_huang_gai_1', -30, 0, 140, -100, 0, 200)
doAdd('skin_huang_gai_2', -30, -50, 140, -120, -70, 200)
doAdd('skin_huang_gai_3', -30, -20, 140, -100, -50, 200)
doAdd('skin_huang_gai_4', -30, -20, 140, -80, -20, 200)
doAdd('skin_huang_gai_5', -20, 0, 140, -80, -20, 200)

doAdd('skin_huang_yue_ying_1', -40, -20, 140, -100, -40, 200)
doAdd('skin_huang_yue_ying_2', -30, -10, 140, -80, -30, 200)
doAdd('skin_huang_yue_ying_3', -30, 0, 140, -70, -10, 200)
doAdd('skin_huang_yue_ying_4', -30, -20, 140, -70, -40, 200)
doAdd('skin_huang_yue_ying_5', -30, -10, 140, -80, -20, 200)

doAdd('skin_huang_zhong_1', -30, -10, 140, -95, -30, 200)
doAdd('skin_huang_zhong_2', -30, 0, 140, -95, -10, 200)
doAdd('skin_huang_zhong_3', -30, 0, 140, -75, -20, 200)
doAdd('skin_huang_zhong_4', -120, 0, 140, -240, -20, 200)
doAdd('skin_huang_zhong_5', -70, 0, 140, -170, 0, 200)

doAdd('skin_jia_xu_1', -140, 0, 140, -190, -10, 150)
doAdd('skin_jia_xu_2', -30, -60, 140, -100, -90, 200)
doAdd('skin_jia_xu_3', 0, 0, 100, -90, -20, 150)
doAdd('skin_jia_xu_4', 0, 0, 100, -80, -20, 150)
doAdd('skin_jia_xu_5', 0, 0, 100, -60, -10, 150)

doAdd('skin_jiang_wan_fei_yi_1', -50, 0, 100, -60, -10, 150)
doAdd('skin_jiang_wan_fei_yi_2', 0, 0, 100, -30, -10, 150)

doAdd('skin_jiang_wei_1', -40, 0, 140, -90, -10, 150)
doAdd('skin_jiang_wei_2', -40, -50, 140, -130, -80, 200)
doAdd('skin_jiang_wei_3', -30, -20, 140, -100, -40, 200)
doAdd('skin_jiang_wei_4', -30, -20, 140, -140, -10, 200)
doAdd('skin_jiang_wei_5', -60, 0, 140, -90, -10, 200)

doAdd('skin_li_dian_1', -60, -10, 140, -140, -30, 200)
doAdd('skin_li_dian_2', -40, -20, 140, -130, -30, 200)
doAdd('skin_li_dian_3', -70, 0, 140, -160, -10, 200)
doAdd('skin_li_dian_4', -80, 0, 200, -100, -10, 200)
doAdd('skin_li_dian_5', -120, 0, 140, -250, -10, 200)

doAdd('skin_liu_bei_1', -60, 0, 140, -160, -10, 200)
doAdd('skin_liu_bei_2', -20, 0, 140, -90, 0, 200)
doAdd('skin_liu_bei_3', -50, 0, 140, -160, -20, 200)
doAdd('skin_liu_bei_4', -80, -50, 200, -110, -30, 200)
doAdd('skin_liu_bei_5', -30, 0, 140, -100, -10, 200)

doAdd('skin_liu_shan_1', -30, -20, 140, -70, -20, 150)
doAdd('skin_liu_shan_2', 0, 0, 140, -20, 0, 150)
doAdd('skin_liu_shan_3', -20, 0, 140, -50, 0, 150)
doAdd('skin_liu_shan_4', 0, 0, 100, -85, -40, 150)
doAdd('skin_liu_shan_5', -80, -50, 100, -50, -20, 150)

doAdd('skin_lu_su_1', -40, 0, 140, -110, 0, 200)
doAdd('skin_lu_su_2', -60, 0, 140, -150, 0, 200)
doAdd('skin_lu_su_3', 0, 0, 140, -60, 0, 200)
doAdd('skin_lu_su_4', 0, 0, 140, -50, 0, 200)
doAdd('skin_lu_su_5', -60, -10, 140, -100, -15, 150)

doAdd('skin_lu_xun_1', -100, 0, 200, -120, 0, 200)
doAdd('skin_lu_xun_2', -260, -60, 180, -340, -70, 200)
doAdd('skin_lu_xun_3', -50, -10, 180, -90, -10, 200)
doAdd('skin_lu_xun_4', 0, 0, 150, -70, -10, 200)
doAdd('skin_lu_xun_5', -40, -50, 150, -110, -70, 200)

doAdd('skin_lv_bu_1', -120, -60, 250, -100, -30, 200)
doAdd('skin_lv_bu_2', -70, 0, 150, -100, 0, 150)
doAdd('skin_lv_bu_3', -50, 0, 150, -110, -10, 200)
doAdd('skin_lv_bu_4', -100, -20, 150, -200, -50, 200)
doAdd('skin_lv_bu_5', -10, -10, 150, -70, -30, 200)

doAdd('skin_lv_meng_1', -40, -10, 150, -70, -30, 200)
doAdd('skin_lv_meng_2', -35, -50, 150, -85, -60, 200)
doAdd('skin_lv_meng_3', -25, 0, 150, -75, 0, 200)
doAdd('skin_lv_meng_4', -55, 0, 150, -125, -20, 200)
doAdd('skin_lv_meng_5', -35, 0, 150, -105, 0, 200)

doAdd('skin_ma_chao_1', -125, 0, 200, -155, 0, 200)
doAdd('skin_ma_chao_2', -185, 0, 200, -225, 0, 200)
doAdd('skin_ma_chao_3', -65, 0, 150, -135, 0, 200)
doAdd('skin_ma_chao_4', -15, 0, 150, -85, -10, 200)
doAdd('skin_ma_chao_5', -45, 0, 150, -95, -20, 200)

doAdd('skin_ma_teng_1', -35, 0, 150, -80, -10, 200)
doAdd('skin_ma_teng_2', -135, -10, 150, -170, -10, 150)
doAdd('skin_ma_teng_3', -75, 0, 150, -110, 0, 150)

doAdd('skin_meng_huo_1', -15, -10, 150, -60, -20, 200)
doAdd('skin_meng_huo_2', -15, -20, 150, -60, -30, 200)
doAdd('skin_meng_huo_3', -55, -30, 150, -120, -60, 200)
doAdd('skin_meng_huo_4', -55, -10, 150, -120, -20, 200)
doAdd('skin_meng_huo_5', -45, -20, 150, -100, -50, 200)

doAdd('skin_pan_feng_1', -45, -20, 150, -100, -50, 200)
doAdd('skin_pan_feng_2', -55, 0, 150, -70, 0, 150)
doAdd('skin_pan_feng_3', -185, 0, 150, -300, 0, 200)
doAdd('skin_pan_feng_4', -125, 0, 150, -230, -30, 200)
doAdd('skin_pan_feng_5', -45, -30, 150, -110, -40, 200)

doAdd('skin_pang_de_1', -45, -40, 150, -110, -70, 200)
doAdd('skin_pang_de_2', -64, -40, 150, -150, -70, 200)
doAdd('skin_pang_de_3', -64, 0, 150, -130, 0, 200)
doAdd('skin_pang_de_4', -35, 0, 150, -110, -20, 200)
doAdd('skin_pang_de_5', -35, 0, 150, -70, -20, 200)

doAdd('skin_pang_tong_1', -95, -80, 250, -80, -50, 200)
doAdd('skin_pang_tong_2', -125, 0, 250, -100, 0, 200)
doAdd('skin_pang_tong_3', -110, -30, 200, -120, -10, 200)
doAdd('skin_pang_tong_4', -110, -60, 150, -130, -60, 200)
doAdd('skin_pang_tong_5', -30, 0, 150, -90, -20, 200)

doAdd('skin_si_ma_yi_1', -30, 0, 150, -90, -20, 200)
doAdd('skin_si_ma_yi_2', -40, 0, 150, -95, -30, 200)
doAdd('skin_si_ma_yi_3', -40, -30, 150, -75, -50, 200)
doAdd('skin_si_ma_yi_4', -40, -30, 150, -95, -50, 200)
doAdd('skin_si_ma_yi_5', -40, 0, 150, -95, 0, 200)

doAdd('skin_sun_ce_1', -40, -30, 150, -95, -50, 200)
doAdd('skin_sun_ce_2', -30, -10, 150, -80, -20, 200)
doAdd('skin_sun_ce_3', -50, -70, 150, -140, -100, 200)
doAdd('skin_sun_ce_4', -50, 0, 150, -90, -30, 200)
doAdd('skin_sun_ce_5', -160, 0, 200, -190, 0, 200)

doAdd('skin_sun_jian_1', -10, 0, 150, -60, -20, 200)
doAdd('skin_sun_jian_2', -70, 0, 200, -120, -10, 250)
doAdd('skin_sun_jian_3', -70, -30, 200, -100, -20, 200)
doAdd('skin_sun_jian_4', -130, 0, 150, -230, 0, 200)
doAdd('skin_sun_jian_5', -50, 0, 150, -130, 0, 200)

doAdd('skin_sun_quan_1', -30, -10, 150, -90, -15, 200)
doAdd('skin_sun_quan_2', -60, 0, 150, -130, 0, 200)
doAdd('skin_sun_quan_3', -40, 0, 150, -100, 0, 200)
doAdd('skin_sun_quan_4', -70, 0, 150, -150, -10, 200)
doAdd('skin_sun_quan_5', -20, 0, 150, -70, -20, 200)

doAdd('skin_sun_shang_xiang_1', -60, 0, 150, -110, -20, 170)
doAdd('skin_sun_shang_xiang_2', -40, -10, 150, -80, -20, 170)
doAdd('skin_sun_shang_xiang_3', -30, 0, 150, -60, 0, 170)
doAdd('skin_sun_shang_xiang_4', -30, -10, 150, -60, -10, 170)
doAdd('skin_sun_shang_xiang_5', -50, -10, 150, -80, 0, 170)

doAdd('skin_tai_shi_ci_1', -60, -10, 150, -130, -20, 200)
doAdd('skin_tai_shi_ci_2', -100, -10, 150, -190, -50, 200)
doAdd('skin_tai_shi_ci_3', -50, -10, 150, -110, -40, 200)
doAdd('skin_tai_shi_ci_4', -40, -10, 150, -80, -40, 200)
doAdd('skin_tai_shi_ci_5', -120, -10, 150, -160, -20, 170)

doAdd('skin_tian_feng_1', -50, 0, 150, -70, -20, 150)
doAdd('skin_tian_feng_2', -50, 0, 150, -70, -20, 200)
doAdd('skin_tian_feng_3', -50, -10, 150, -70, -20, 200)

doAdd('skin_wei_yan_1', -160, 0, 150, -200, 0, 150)
doAdd('skin_wei_yan_2', -130, -20, 150, -260, -40, 200)
doAdd('skin_wei_yan_3', -20, -30, 150, -60, -40, 200)
doAdd('skin_wei_yan_4', -50, -30, 150, -120, -40, 200)
doAdd('skin_wei_yan_5', -20, -30, 150, -70, -40, 200)

doAdd('skin_wo_long_1', -50, -20, 150, -120, -40, 200)
doAdd('skin_wo_long_2', -60, 0, 150, -130, -10, 200)
doAdd('skin_wo_long_3', -30, -10, 150, -90, -30, 200)
doAdd('skin_wo_long_4', -80, -10, 150, -150, -30, 200)
doAdd('skin_wo_long_5', -120, -40, 150, -160, -50, 150)

doAdd('skin_xia_hou_dun_1', -50, -10, 150, -80, -20, 150)
doAdd('skin_xia_hou_dun_2', -50, -10, 150, -110, 0, 150)
doAdd('skin_xia_hou_dun_3', -80, -10, 150, -110, -20, 150)
doAdd('skin_xia_hou_dun_4', -170, -10, 150, -230, -10, 150)
doAdd('skin_xia_hou_dun_5', -60, -10, 150, -100, -10, 150)

doAdd('skin_xia_hou_yuan_1', -30, -40, 150, -40, -30, 150)
doAdd('skin_xia_hou_yuan_2', -80, 0, 150, -150, 0, 150)
doAdd('skin_xia_hou_yuan_3', -80, -90, 150, -110, -70, 150)
doAdd('skin_xia_hou_yuan_4', -30, 0, 150, -50, 0, 150)
doAdd('skin_xia_hou_yuan_5', -70, -30, 150, -110, -20, 150)

doAdd('skin_xiao_qiao_1', -30, 0, 150, -95, -10, 200)
doAdd('skin_xiao_qiao_2', -20, 0, 150, -25, 0, 150)
doAdd('skin_xiao_qiao_3', -100, -10, 150, -145, -20, 150)
doAdd('skin_xiao_qiao_4', -10, 0, 150, -30, 0, 150)
doAdd('skin_xiao_qiao_5', -60, 0, 150, -90, 0, 150)

//
doAdd('skin_xu_chu_1', -150, 0, 150, -210, -20, 170)
doAdd('skin_xu_chu_2', -140, -10, 150, -210, -20, 170)
doAdd('skin_xu_chu_3', -60, -10, 150, -100, -20, 170)
doAdd('skin_xu_chu_4', -30, -10, 150, -60, -20, 170)
doAdd('skin_xu_chu_5', -140, 0, 150, -220, 0, 170)

doAdd('skin_xu_huang_1', -40, 0, 150, -105, -20, 200)
doAdd('skin_xu_huang_2', -40, 0, 150, -95, -20, 200)
doAdd('skin_xu_huang_3', -140, -20, 150, -275, -40, 200)
doAdd('skin_xu_huang_4', -30, 0, 150, -95, 0, 200)
doAdd('skin_xu_huang_5', -30, -20, 150, -95, -30, 200)

doAdd('skin_xu_sheng_1', -50, 0, 150, -115, 0, 200)
doAdd('skin_xu_sheng_2', -30, -20, 150, -80, 20, 200)
doAdd('skin_xu_sheng_3', -30, -20, 150, -65, -30, 200)
doAdd('skin_xu_sheng_4', -90, 0, 150, -190, 0, 200)

doAdd('skin_xun_you_1', -30, -20, 150, -80, -30, 200)
doAdd('skin_xun_you_2', -30, -30, 150, -85, -40, 200)
doAdd('skin_xun_you_3', -50, -30, 150, -115, -40, 200)
doAdd('skin_xun_you_4', -30, 0, 150, -95, -10, 200)
doAdd('skin_xun_you_5', -30, -50, 150, -105, -70, 200)

doAdd('skin_xun_yu_1', -30, 0, 150, -95, -20, 200)
doAdd('skin_xun_yu_2', -30, 0, 150, -95, -20, 200)
doAdd('skin_xun_yu_3', -30, -10, 150, -95, -30, 200)
doAdd('skin_xun_yu_4', -30, 0, 150, -95, -20, 200)
doAdd('skin_xun_yu_5', -10, 0, 150, -65, -10, 200)

doAdd('skin_yan_liang_wen_chou_1', -20, 0, 120, -25, 0, 100)
doAdd('skin_yan_liang_wen_chou_2', -20, -30, 120, -25, 0, 100)
doAdd('skin_yan_liang_wen_chou_3', -20, 0, 120, -40, 0, 120)
doAdd('skin_yan_liang_wen_chou_4', -10, -10, 120, -30, 0, 120)
doAdd('skin_yan_liang_wen_chou_5', -10, -20, 120, -40, -20, 120)

doAdd('skin_yuan_shao_1', 0, 0, 120, -70, -20, 200)
doAdd('skin_yuan_shao_2', 0, 0, 120, -90, -10, 200)
doAdd('skin_yuan_shao_3', -10, 0, 120, -75, -30, 200)
doAdd('skin_yuan_shao_4', -120, 0, 120, -335, -40, 200)
doAdd('skin_yuan_shao_5', -40, 0, 150, -125, 0, 200)

doAdd('skin_yue_jin_1', -40, -20, 150, -95, -30, 200)
doAdd('skin_yue_jin_2', -30, -20, 150, -75, -30, 200)
doAdd('skin_yue_jin_3', -10, -40, 150, -35, -50, 200)
doAdd('skin_yue_jin_4', -30, -20, 150, -75, -30, 200)

doAdd('skin_zhang_fei_1', -30, -20, 150, -45, -30, 200)
doAdd('skin_zhang_fei_2', -60, -50, 150, -125, -90, 200)
doAdd('skin_zhang_fei_3', -70, -20, 150, -145, -20, 200)
doAdd('skin_zhang_fei_4', -40, -10, 150, -75, -20, 200)
doAdd('skin_zhang_fei_5', -160, -10, 150, -275, -20, 200)

doAdd('skin_zhang_he_1', -160, -10, 150, -285, -40, 200)
doAdd('skin_zhang_he_2', -60, -40, 150, -115, -50, 200)
doAdd('skin_zhang_he_3', -150, -10, 150, -295, -30, 200)
doAdd('skin_zhang_he_4', -60, -20, 150, -150, -30, 200)
doAdd('skin_zhang_he_5', -60, 0, 150, -120, -20, 200)

doAdd('skin_zhang_jiao_1', -160, 0, 150, -230, -20, 170)
doAdd('skin_zhang_jiao_2', -110, -110, 250, -90, -70, 200)
doAdd('skin_zhang_jiao_3', -40, -10, 150, -80, -20, 200)
doAdd('skin_zhang_jiao_4', -60, -40, 150, -120, -60, 200)
doAdd('skin_zhang_jiao_5', -60, -40, 150, -120, -60, 200)

doAdd('skin_zhang_liao_1', -10, 0, 150, -50, -10, 200)
doAdd('skin_zhang_liao_2', -50, 0, 150, -80, -10, 200)
doAdd('skin_zhang_liao_3', -130, 0, 150, -230, -20, 200)
doAdd('skin_zhang_liao_4', -180, -30, 150, -290, -40, 200)
doAdd('skin_zhang_liao_5', -180, 0, 150, -330, -10, 200)

doAdd('skin_zhang_xiu_1', -140, 0, 150, -250, -10, 200)
doAdd('skin_zhang_xiu_2', -80, -20, 150, -160, -50, 200)
doAdd('skin_zhang_xiu_3', -60, -20, 150, -140, -50, 200)
doAdd('skin_zhang_xiu_4', -120, -20, 150, -230, -30, 200)

doAdd('skin_zhao_yun_1', -50, 0, 150, -110, -10, 200)
doAdd('skin_zhao_yun_2', -150, -20, 150, -270, -50, 200)
doAdd('skin_zhao_yun_3', -50, 0, 150, -110, -10, 200)
doAdd('skin_zhao_yun_4', -70, 0, 150, -130, -15, 200)
doAdd('skin_zhao_yun_5', -130, -20, 150, -240, -45, 200)

doAdd('skin_zhen_ji_1', -60, -20, 150, -90, -15, 200)
doAdd('skin_zhen_ji_2', -60, 0, 150, -140, -15, 200)
doAdd('skin_zhen_ji_3', -40, -20, 150, -80, -30, 200)
doAdd('skin_zhen_ji_4', -40, -40, 150, -90, -50, 200)
doAdd('skin_zhen_ji_5', -10, -10, 150, -40, -20, 200)

doAdd('skin_zhou_tai_1', -30, 0, 150, -80, 0, 200)
doAdd('skin_zhou_tai_2', -10, -10, 150, -50, -20, 200)
doAdd('skin_zhou_tai_3', -150, -10, 150, -300, -30, 200)
doAdd('skin_zhou_tai_4', -50, -30, 150, -70, -50, 200)
doAdd('skin_zhou_tai_5', -50, -30, 150, -70, -50, 200)

doAdd('skin_zhou_yu_1', 0, -60, 150, -50, -80, 200)
doAdd('skin_zhou_yu_2', -30, -10, 150, -90, -20, 200)
doAdd('skin_zhou_yu_3', -30, 0, 150, -90, 0, 200)
doAdd('skin_zhou_yu_4', -30, 0, 150, -90, 0, 200)
doAdd('skin_zhou_yu_5', -60, 0, 100, -190, 0, 150)

doAdd('skin_zhu_ge_liang_1', -30, 0, 150, -70, -10, 200)
doAdd('skin_zhu_ge_liang_2', -90, 0, 150, -190, 0, 200)
doAdd('skin_zhu_ge_liang_3', -150, 0, 150, -250, -10, 200)
doAdd('skin_zhu_ge_liang_4', -50, 0, 150, -120, -10, 200)
doAdd('skin_zhu_ge_liang_5', -70, 0, 200, -125, 0, 250)

doAdd('skin_zhu_rong_1', -70, 0, 200, -90, 0, 200)
doAdd('skin_zhu_rong_2', -100, -40, 200, -130, -30, 200)
doAdd('skin_zhu_rong_3', -50, -10, 170, -90, -20, 200)
doAdd('skin_zhu_rong_4', -150, -10, 170, -270, -10, 200)
doAdd('skin_zhu_rong_5', -210, -10, 170, -330, -10, 200)

doAdd('skin_zu_shou_1', -80, -20, 170, -130, -20, 200)
doAdd('skin_zu_shou_2', -70, 0, 170, -110, -10, 200)
doAdd('skin_zu_shou_3', -90, 0, 170, -120, -15, 200)
doAdd('skin_zu_shou_4', -50, 0, 170, -105, -15, 200)





export function toFactionWarAvatarStyle(id: string, isBig: boolean) {
    let render = isBig? bigRender.get(id) : smallRender.get(id)

    return {
        backgroundImage: `url('generals/${id}.png')`, 
        backgroundPosition: `${render.x}px ${render.y}px`,
        width: render.w + '%',
        height: render.h + '%'
    }
}