import { Operation, UseEventOperation } from "../Flow";
import GameManager from "../GameManager";
import { getFromAction, UIPosition, Button, isCancel } from "../../common/PlayerAction";
import { PlayerInfo } from "../../common/PlayerInfo";
import DamageOp, { DamageType, DamageSource } from "./DamageOp";
import DodgeOp from "./DodgeOp";
import Card, { Suit, CardType } from "../../common/cards/Card";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import { isSuitBlack } from "../../common/cards/ICard";
import { HintType } from "../../common/ServerHint";
import { CardPos } from "../../common/transit/CardPos";
import { CardBeingPlayedEvent } from "./Generic";

export class SlashDodgedEvent {
    constructor(public readonly slashOp: SlashCompute) {
    }
}

/**
 * 玩家出杀的行动. 目标已经选择好
 * 
 * 任何和杀有关的技能都在此触发
 * 例: 烈弓, 咆哮, 流离, 无双
 */
export default class PlaySlashOp extends Operation<void> {

    public dodgeRequired = 1
    public damage = 1
    public damageType: DamageType = DamageType.NORMAL
    public suit: Suit
    public currentTarget: PlayerInfo
    public currentDodged: boolean
    
    public constructor(public readonly source: string, 
                        public targets: PlayerInfo[],
                        public cards: Card[]) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        if(!this.cards || this.cards.length === 0) {
            this.suit = 'none'
            this.damageType = DamageType.NORMAL
        } else {
            let icards = this.cards.map(c => manager.interpret(this.source, c.id))
            if(icards.length === 1) {
                if(icards[0].type === CardType.SLASH_FIRE) {
                    this.damageType = DamageType.FIRE
                } else if(icards[0].type === CardType.SLASH_THUNDER){
                    this.damageType = DamageType.THUNDER
                }
                this.suit = icards[0].suit
            } else if (icards.length > 1) {
                this.suit = icards[0].suit
                for(let icard of icards) {
                    if(icard.suit !== this.suit) {
                        this.suit = 'none'
                    }
                }
            }
        }
        
        if (this.damageType === DamageType.THUNDER) {
            manager.broadcast(new TextFlashEffect(this.source, this.targets.map(t => t.player.id), '雷杀'))
        } else if (this.damageType === DamageType.FIRE){
            manager.broadcast(new TextFlashEffect(this.source, this.targets.map(t => t.player.id), '火杀'))
        } else {
            manager.broadcast(new TextFlashEffect(this.source, this.targets.map(t => t.player.id), isSuitBlack(this.suit)? '杀' : '红杀'))
        }

        manager.roundStats.slashCount++;

        //todo: 
        // 可以无效化 (将自己从target中移除)
        // 裸衣增加伤害? 最后一张手牌,方天画戟询问增加目标?
        // 会不会转移目标? (游离)
        // 雌雄双股剑? > 弃牌然后空城
        // leave to the listeners
        // await manager.events.publish(this)

        let actor = manager.context.getPlayer(this.source)

        //醒酒
        if(actor.isDrunk) {
            this.damage += 1
            actor.isDrunk = false
            manager.broadcast(actor, PlayerInfo.sanitize)
        }

        for(let t of this.targets) {
            if(t.isDead) {
                console.warn('Player already dead, not doing slash on him', t.player.id)
                return
            }

            await new SlashCompute(actor, t, this.cards, this.dodgeRequired, this.damage, this.damageType, this.suit).perform(manager)
        }
    }
}

export class SlashCompute extends UseEventOperation<void> {

    //todo: 不可被闪避?
    constructor(public readonly source: PlayerInfo,
                public target: PlayerInfo,
                public readonly cards: Card[],
                public readonly dodgeRequired: number,
                public readonly damageAmount: number,
                public damageType: DamageType,
                public suit: Suit
                ) {
        super()
    }
    
    public async doPerform(manager: GameManager): Promise<void> {
        let dodgeNeeded = this.dodgeRequired
        //开始杀的结算, 要求出闪
        if(dodgeNeeded > 0) {
            let success = await new DodgeOp(this.target, this.source.player.id, dodgeNeeded, `[${this.source.player.id}] 对你出杀, 请出闪`).perform(manager)
            if(!success) {
                await new DamageOp(this.source, this.target, this.damageAmount, this.cards, DamageSource.SLASH, this.damageType).perform(manager)
            } else {
                //闪避成功! 贯石斧?
                await manager.events.publish(new SlashDodgedEvent(this))
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
    
    public constructor(public slasher: PlayerInfo, public target: PlayerInfo, public hintMsg: string) {
        super()
    }

    public async perform(manager: GameManager): Promise<boolean> {
        await manager.events.publish(this)
        
        let resp = await manager.sendHint(this.slasher.player.id, {
            hintType: HintType.SLASH,
            hintMsg: this.hintMsg,
            extraButtons: [new Button(Button.CANCEL.id, '放弃')]
        })
        if(isCancel(resp)) {
            console.log('玩家放弃出杀')
            return false
        } else {
            //todo: it might not be like this... 武圣?龙胆?
            let cards = getFromAction(resp, UIPosition.MY_HAND).map(c => {
                let card = manager.getCard(c)
                card.description = `${this.slasher.player.id} 出杀`
                if(!card.type.isSlash()) {
                    card.as = CardType.SLASH
                }
                return card
            })
            //todo: not good enough (skills and all?)
            await manager.events.publish(new CardBeingPlayedEvent(this.slasher.player.id, cards.map(c => [c, CardPos.HAND]), CardType.SLASH))
            manager.sendToWorkflow(this.slasher.player.id, CardPos.HAND, cards)
        }

        return true
    }
}