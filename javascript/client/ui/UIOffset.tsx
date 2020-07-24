/**
 * Offset the general image of the image file
 */

const map = new Map<string, object>()

function put(image: string, top: number, left: number) {
    map.set(image, {
        top: top + '%',
        left: left + '%'
    })
}

const defaultOffset = {
    top: '-10%',
    left: '-0%'
}

put('standard_da_qiao', -3, -13)
put('standard_hua_tuo', 0, -15)
put('standard_guan_yu', 0, 0)
put('standard_huang_gai', 0, 0)
put('standard_zhang_fei', -18, -15)
put('wind_zhang_jiao', -10, -15)
put('standard_xu_chu', -15, -10)
// put('standard_sun_shang_xiang', -30, -20)
// put('standard_xia_hou_dun', -12, -20)
// put('standard_lu_xun', -12, -20)

export function getOffset(image: string): object {
    let res = map.get(image)
    return res? res : defaultOffset
}