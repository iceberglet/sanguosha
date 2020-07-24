import { v4 as uuidv4 } from 'uuid';

export default class Player {
    public readonly id: string

    constructor(public readonly name: string) {
        this.id = uuidv4()
    }
}

export class Identity {

    public static ZHU_GONG = new Identity('zhu_gong', '主公')
    public static FAN_ZEI = new Identity('fan_zei', '反贼')
    public static ZHONG_CHEN = new Identity('zhong_chen', '忠臣')
    public static NEI_JIAN = new Identity('nei_jian', '内奸')


    private constructor(public readonly id: string, public readonly name: string) {

    }
}