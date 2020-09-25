type UiRendering = {
    x: number
    y: number
    w: number
    h: number
}

const smallRender = new Map<string, UiRendering>()
const bigRender = new Map<string, UiRendering>()


function doAdd(id: string, x: number, y: number, w: number, h: number, x2: number, y2: number, w2: number, h2: number) {
    bigRender.set(id, {x, y, w, h})
    smallRender.set(id, {x: x2, y: y2, w: w2, h: h2})
}

doAdd('standard_cao_cao', -80, -30, 180, 180, -130, -25, 200, 200)
doAdd('standard_si_ma_yi', -40, 0, 150, 150, -90, -15, 200, 200)
doAdd('standard_xia_hou_dun', -28, -15, 150, 150, -70, -25, 200, 200)
doAdd('standard_zhang_liao', -28, -15, 150, 150, -90, -25, 200, 200)
doAdd('standard_xu_chu', -48, -18, 150, 150, -110, -45, 200, 200)
doAdd('standard_guo_jia', -48, -18, 150, 150, -120, -15, 200, 200)
doAdd('standard_zhen_ji', -68, -5, 150, 150, -120, -15, 170, 170)
doAdd('wind_xia_hou_yuan', -28, -45, 150, 150, -80, -55, 170, 170)
doAdd('mountain_zhang_he', -38, -15, 150, 150, -80, -25, 170, 170)
doAdd('forest_xu_huang', -38, -5, 150, 150, -80, -25, 170, 170)
doAdd('wind_cao_ren', -158, -65, 250, 250, -160, -45, 250, 250)
doAdd('fire_dian_wei', -45, 0, 150, 150, -110, -5, 200, 200)
doAdd('fire_xun_yu', -30, 0, 150, 150, -90, -25, 200, 200)
doAdd('forest_cao_pi', -35, -30, 150, 150, -90, -55, 200, 200)
doAdd('guo_yue_jin', -105, -70, 200, 200, -110, -55, 200, 200)

doAdd('standard_liu_bei', -30, -10, 150, 150, -90, -15, 200, 200)
doAdd('standard_guan_yu', -30, -10, 150, 150, -90, -15, 200, 200)
doAdd('standard_zhang_fei', -90, -60, 200, 200, -110, -45, 200, 200)
doAdd('standard_zhu_ge_liang', -50, -20, 150, 150, -120, -25, 200, 200)
doAdd('standard_zhao_yun', -30, 0, 150, 150, -70, -10, 170, 170)
doAdd('standard_ma_chao', -40, -20, 150, 150, -80, -10, 170, 170)
doAdd('standard_huang_yue_ying', -20, 0, 150, 150, -60, -0, 170, 170)
doAdd('standard_huang_zhong', -50, 0, 150, 150, -110, -0, 170, 170)
doAdd('wind_wei_yan', -40, -30, 150, 150, -70, -30, 170, 170)
doAdd('fire_pang_tong', -20, -20, 150, 150, -40, -30, 170, 170)
doAdd('fire_zhu_ge_liang', -80, -20, 150, 150, -140, -20, 170, 170)
doAdd('mountain_liu_shan', -30, -20, 150, 150, -80, -20, 170, 170)
doAdd('forest_meng_huo', -40, -50, 150, 150, -80, -50, 170, 170)
doAdd('forest_zhu_rong', -60, -20, 150, 150, -110, -30, 170, 170)
doAdd('guo_gan_fu_ren', -60, 0, 150, 150, -100, -20, 170, 170)

doAdd('standard_sun_quan', -60, -30, 200, 200, -60, -20, 170, 170)
doAdd('standard_gan_ning', -40, 0, 150, 150, -80, -0, 170, 170)
doAdd('standard_lv_meng', -30, 0, 150, 150, -60, -0, 170, 170)
doAdd('standard_huang_gai', -30, 0, 150, 150, -40, -0, 170, 170)
doAdd('standard_zhou_yu', -60, -20, 200, 200, -65, -20, 170, 170)
doAdd('standard_da_qiao', -60, -5, 150, 150, -105, -10, 170, 170)
doAdd('standard_lu_xun', -20, -25, 150, 150, -55, -30, 170, 170)
doAdd('standard_sun_shang_xiang', -20, -35, 150, 150, -35, -40, 170, 170)
doAdd('forest_sun_jian', -120, -80, 240, 240, -140, -70, 250, 250)
doAdd('wind_xiao_qiao', -50, 0, 150, 150, -100, -0, 200, 200)
doAdd('fire_tai_shi_ci', -65, -40, 170, 170, -80, -50, 170, 170)
doAdd('wind_zhou_tai', -55, -20, 170, 170, -80, -20, 170, 170)
doAdd('forest_lu_su', -55, -20, 170, 170, -80, -20, 170, 170)
doAdd('mountain_er_zhang', -55, -20, 150, 150, -40, -70, 170, 170)
doAdd('guo_ding_feng', -25, -50, 150, 150, -40, -50, 170, 170)

doAdd('standard_hua_tuo', -50, -5, 150, 150, -90, -10, 170, 170)
doAdd('standard_lv_bu', -20, -25, 150, 150, -50, -20, 170, 170)
doAdd('standard_diao_chan', -30, -15, 150, 150, -60, -20, 170, 170)
doAdd('fire_yuan_shao', -50, -35, 150, 150, -110, -40, 170, 170)
doAdd('fire_yan_liang_wen_chou', -20, -25, 150, 150, -50, -40, 170, 170)
doAdd('forest_jia_xu', -45, -25, 150, 150, -90, -40, 170, 170)
doAdd('fire_pang_de', -25, -25, 150, 150, -60, -30, 170, 170)
doAdd('wind_zhang_jiao', -45, -25, 150, 150, -100, -30, 170, 170)
doAdd('mountain_cai_wen_ji', -55, -55, 150, 150, -100, -60, 170, 170)
doAdd('guo_ma_teng', -45, -15, 150, 150, -80, -30, 170, 170)
doAdd('guo_kong_rong', -55, -55, 150, 150, -60, -10, 170, 170)
doAdd('guo_ji_ling', -55, -55, 150, 150, -75, -10, 170, 170)
doAdd('guo_tian_feng', -35, -5, 150, 150, -55, 0, 170, 170)
doAdd('guo_pan_feng', -55, -5, 150, 150, -95, 0, 170, 170)
doAdd('guo_zou_shi', -35, -20, 120, 120, -105, -20, 170, 170)

doAdd('mountain_deng_ai', -15, -20, 150, 150, -65, -20, 170, 170)
doAdd('guo_cao_hong', -35, -0, 120, 120, -135, 0, 170, 170)
doAdd('guo_jiang_wan_fei_yi', -35, -0, 120, 120, -25, 0, 100, 100)
doAdd('mountain_jiang_wei', -25, -10, 120, 120, -75, 0, 170, 170)
doAdd('fame_xu_sheng', -15, -10, 120, 120, -65, -10, 150, 150)
doAdd('guo_jiang_qin', -35, -0, 120, 120, -55, 0, 150, 150)
doAdd('guo_he_tai_hou', -40, -20, 150, 150, -60, -10, 170, 170)
// doAdd('guo_he_tai_hou 3', -15, -0, 120, 120)
doAdd('wind_yu_ji', -85, -50, 180, 180, -125, -70, 200, 200)

doAdd('bound_li_dian', -55, -20, 150, 150, -105, -40, 200, 200)
doAdd('guo_zang_ba', -35, -40, 150, 150, -95, -70, 200, 200)
doAdd('fame_ma_dai', -55, -40, 150, 150, -125, -50, 200, 200)
doAdd('guo_mi_fu_ren', -55, -40, 150, 150, -65, -30, 200, 200)
doAdd('guo_sun_ce', -45, -20, 150, 150, -105, -20, 200, 200)
doAdd('guo_chen_wu_dong_xi', -45, -50, 150, 150, -50, -30, 120, 120)
doAdd('forest_dong_zhuo', -25, -10, 150, 150, -70, -10, 170, 170)
doAdd('guo_zhang_ren', -25, -10, 150, 150, -50, -10, 170, 170)
doAdd('fame_xun_you', -45, -30, 150, 150, -90, -30, 170, 170)
doAdd('guo_sha_mo_ke', -40, -20, 150, 150, -95, -30, 200, 200)
doAdd('fame_fa_zheng', -25, -10, 150, 150, -50, -10, 170, 170)
doAdd('guo_lv_fan', -5, -10, 150, 150, -40, -10, 170, 170)
doAdd('guo_li_jue_guo_si', -15, -30, 120, 120, -45, -40, 120, 120)
doAdd('guo_zhang_xiu', -50, -30, 150, 150, -100, -40, 170, 170)
doAdd('fame_zu_shou', -170, -35, 300, 300, -210, -50, 350, 350)
doAdd('guo_xun_chen', -50, -30, 150, 150, -80, -20, 170, 170)

export function toFactionWarAvatarStyle(id: string, isBig: boolean) {
    let render = isBig? bigRender.get(id) : smallRender.get(id)

    return {
        backgroundImage: `url('generals/${id}.png')`, 
        backgroundPosition: `${render.x}px ${render.y}px`,
        width: render.w + '%',
        height: render.h + '%'
    }
}