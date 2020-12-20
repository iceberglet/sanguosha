import { Operation, UseEventOperation } from "../Operation";
import GameManager from "../GameManager";
import { Button } from "../../common/PlayerAction";
import { PlayerInfo } from "../../common/PlayerInfo";
import DamageOp, { DamageType, DamageSource } from "./DamageOp";
import DodgeOp from "./DodgeOp";
import Card, { CardType, Color } from "../../common/cards/Card";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import { deriveColor, ICard } from "../../common/cards/ICard";
import { HintType } from "../../common/ServerHint";
import { CardPos } from "../../common/transit/CardPos";
import { CardBeingUsedEvent } from "./Generic";

export class SlashDodgedEvent {
    constructor(public readonly slashOp: SlashCompute, public readonly dodgeOp: DodgeOp) {
    }
}

export class SlashType {

    static RED = new SlashType(CardType.SLASH, DamageType.NORMAL, '红杀', 'red')
    static BLACK = new SlashType(CardType.SLASH, DamageType.NORMAL, '杀', 'black')
    static NO_COLOR = new SlashType(CardType.SLASH, DamageType.NORMAL, '杀', 'n.a.')
    static FIRE = new SlashType(CardType.SLASH_FIRE, DamageType.FIRE, '火杀', 'red')
    static THUNDER = new SlashType(CardType.SLASH_THUNDER, DamageType.THUNDER, '雷杀', 'black')
    
    private constructor(public readonly cardType: CardType, 
                        public readonly damageType: DamageType,
                        public readonly text: string,
                        public readonly color: Color) {

    }
}

function deriveSlashType (icards: ICard[]) {
    if(icards.length === 1) {
        let type = icards[0].as || icards[0].type
        if(type === CardType.SLASH_FIRE) {
            return SlashType.FIRE
        } else if(type === CardType.SLASH_THUNDER){
            return SlashType.THUNDER
        }
    }
    
    let color = deriveColor(icards.map(c => c.suit))
    if(color === 'red') {
        return SlashType.RED
    } else if(color === 'black') {
        return SlashType.BLACK
    } else {
        return SlashType.NO_COLOR
    }
}

/**
 * 玩家出杀的行动. 目标已经选择好
 * 
 * 任何和杀有关的技能都在此触发
 * 例: 烈弓, 咆哮, 流离, 无双
 */
export default class PlaySlashOp extends Operation<void> {

    public slashType: SlashType
    
    public constructor(public readonly source: PlayerInfo, 
                        public targets: PlayerInfo[],
                        //non-empty
                        public cards: Card[]) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        let icards = this.cards.map(c =>manager.interpret(this.source.player.id, c))
        this.slashType = deriveSlashType(icards)
        
        manager.broadcast(new TextFlashEffect(this.source.player.id, this.targets.map(t => t.player.id), this.slashType.text))

        //借刀杀人的话是别人出杀跟我们无关
        if(this.source === manager.currPlayer()) {
            manager.roundStats.slashCount++;
        }

        //todo: 
        // 可以无效化 (将自己从target中移除)
        // 裸衣增加伤害? 最后一张手牌,方天画戟询问增加目标?
        // 会不会转移目标? (游离)
        // 雌雄双股剑? > 弃牌然后空城
        // leave to the listeners
        // await manager.events.publish(this)


        await new SlashOP(this.source, this.targets, this.cards, 1, this.slashType.damageType, this.slashType.color).perform(manager)
    }
}

/**
 * 计入出杀限制
 */
export async function PlaySlashOpNoCards(manager: GameManager, source: PlayerInfo, targets: PlayerInfo[], slashType: SlashType) {
    manager.broadcast(new TextFlashEffect(source.player.id, targets.map(t => t.player.id), slashType.text))
    manager.playSound(source.getGender(), slashType.cardType.id)
    manager.roundStats.slashCount++;
    await new SlashOP(source, targets, [], 1, slashType.damageType, slashType.color).perform(manager)
}

export class SlashOP extends UseEventOperation<void> {

    public undodegables = new Set<string>()
    public dodgesRequired = 1

    constructor(public readonly source: PlayerInfo,
                public targets: PlayerInfo[],
                public readonly cards: Card[],
                public damageAmount: number,
                public damageType: DamageType,
                public color: Color
                ) {
        super(targets)
    }

    public async doPerform(manager: GameManager): Promise<void> {
        await manager.events.publish(this)
        //醒酒
        if(this.source.isDrunk) {
            this.damageAmount += 1
            this.source.isDrunk = false
            manager.broadcast(this.source, PlayerInfo.sanitize)
        }

        for(let t of this.targets) {
            if(t.isDead) {
                console.warn('[Slash Op] Player already dead, not doing slash on him', t.player.id)
                return
            }
            await new SlashCompute(this.source, t, this.cards, this.dodgesRequired, this.damageAmount, this.damageType, this.color, this.undodegables.has(t.player.id)).perform(manager)
        }
    }
}

export class SlashCompute extends Operation<void> {


    constructor(public readonly source: PlayerInfo,
                public target: PlayerInfo,
                public readonly cards: Card[],
                public dodgeRequired: number,
                public readonly damageAmount: number,
                public damageType: DamageType,
                public color: Color,
                //不可被闪避?
                private readonly undodgeable: boolean
                ) {
        super()
    }
    
    public async perform(manager: GameManager): Promise<void> {
        if(this.undodgeable) {
            await new DamageOp(this.source, this.target, this.damageAmount, this.cards, DamageSource.SLASH, this.damageType).perform(manager)
            return
        }
        let dodgeNeeded = this.dodgeRequired
        //开始杀的结算, 要求出闪
        if(dodgeNeeded > 0) {
            let dodgeOp = new DodgeOp(this.target, this.source, dodgeNeeded, `${this.source} 对你出杀, 请出闪`)
            let success = await dodgeOp.perform(manager)
            if(!success) {
                await new DamageOp(this.source, this.target, this.damageAmount, this.cards, DamageSource.SLASH, this.damageType).perform(manager)
            } else {
                //闪避成功! 贯石斧?
                await manager.events.publish(new SlashDodgedEvent(this, dodgeOp))
            }
        }
    }

}

/**
 * 令玩家出杀的操作 (如决斗/激将/南蛮)
 * 打出杀但并非使用杀
 * 注意杀牌和技能的互动 (激昂, 奸雄?)
 */
export class AskForSlashOp extends Operation<boolean> {
    
    public constructor(public slasher: PlayerInfo, public target: PlayerInfo, public hintMsg: string, private repeat: number = 1) {
        super()
    }

    public async perform(manager: GameManager): Promise<boolean> {
        await manager.events.publish(this)
        
        while(this.repeat > 0) {
            this.repeat--
            let resp = await manager.sendHint(this.slasher.player.id, {
                hintType: HintType.SLASH,
                hintMsg: this.hintMsg,
                extraButtons: [new Button(Button.CANCEL.id, '放弃')]
            })
            if(resp.isCancel()) {
                console.log('玩家放弃出杀')
                return false
            } else if (resp.skill) {
                await manager.resolver.onSkillAction(resp, this, manager)
            } else {
                //只可能是手牌或者丈八蛇矛的手牌
                let cards = resp.getCardsAtPos(CardPos.HAND).map(card => {
                    card.description = `${this.slasher.player.id} 出杀`
                    if(!card.type.isSlash()) {
                        card.as = CardType.SLASH
                    }
                    return card
                })
                let slashType = deriveSlashType(cards.map(c => manager.interpret(this.slasher.player.id, c)))
                manager.log(`${resp.source} 打出了 ${cards}`)
                manager.sendToWorkflow(this.slasher.player.id, CardPos.HAND, cards)
                manager.broadcast(new TextFlashEffect(this.slasher.player.id, [this.target.player.id], slashType.cardType.name))
                await manager.events.publish(new CardBeingUsedEvent(this.slasher.player.id, cards.map(c => [c, CardPos.HAND]), slashType.cardType, false, false))
            }
        }

        return true
    }
}