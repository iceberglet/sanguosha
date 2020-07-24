export default class Operation {

    tags: string[]
    cards: string[]

    constructor(
        //player-id of the initiator
        public initiator: string,
        //player id of the source of operation
        public source: string,
        //player ids of the targets
        public targets: string[] | 'all',
        //operation types
        public type: OperationType) {}

    withTag(...tags: string[]): Operation {
        this.tags.push(...tags)
        return this
    }

    withCard(...cards: string[]): Operation {
        this.cards.push(...cards)
        return this
    }
}

/**
 * Hint the user to perform an operation
 */
export class OperationHint {
    
}

export class OperationType {

    //used when the player decides NOT to do the operation
    public static NIL : OperationType = new OperationType('nil', '无为')

    public static SLASH : OperationType = new OperationType('slash', '杀')
    public static DODGE : OperationType = new OperationType('dodge', '闪')
    public static PEACH : OperationType = new OperationType('peach', '桃')
    public static WINE : OperationType = new OperationType('wine', '酒')

    public static DUEL : OperationType = new OperationType('duel', '决斗')
    public static DROP_CARD : OperationType = new OperationType('drop_card', '过河拆桥')
    public static TAKE_CARD : OperationType = new OperationType('take_card', '顺手牵羊')
    public static KNOW_YOU : OperationType = new OperationType('know_you', '知己知彼')
    public static INVINCIBLE : OperationType = new OperationType('invincible', '无懈可击')
    public static CONJURE_CARD : OperationType = new OperationType('conjure_card', '无中生有')
    public static BORROW_WEAPON : OperationType = new OperationType('borrow_weapon', '借刀杀人')
    public static FIRE_ATTACK : OperationType = new OperationType('fire_attack', '火攻')

    public static PEACH_GARDEN : OperationType = new OperationType('peach_garden', '桃园结义')
    public static VOLLEY : OperationType = new OperationType('volley', '万箭齐发')
    public static BARBARIAN : OperationType = new OperationType('barbarian', '南蛮入侵')
    public static HARVEST : OperationType = new OperationType('harvest', '五谷丰登')
    public static CHAIN : OperationType = new OperationType('chain', '铁索连环')

    public static HAPPY : OperationType = new OperationType('happy', '乐不思蜀')
    public static HUNGER : OperationType = new OperationType('hunger', '兵粮寸断')
    public static LIGHTNING : OperationType = new OperationType('lightning', '闪电')

    public static EQUIP : OperationType = new OperationType('equip', '装备')
    //use skill or item
    public static USE : OperationType = new OperationType('use', '使用')

    private constructor(id: string, name: string) {

    }
}