import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { PlayerAction, getFromAction, UIPosition, Button, isCancel } from "../../common/PlayerAction";
import { PlayerInfo } from "../../common/PlayerInfo";
import DamageOp, { DamageType } from "./DamageOp";
import DodgeOp from "./DodgeOp";
import Card, { Suit, CardType } from "../../common/cards/Card";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import { isSuitBlack } from "../../common/cards/ICard";
import { HintType } from "../../common/ServerHint";
import { CardPos } from "../../common/transit/CardPos";



//玩家出杀的行动
export default class PlaySlashOp extends Operation<void> {

    public dodgeRequired = 1
    public damage = 1
    public damageType: DamageType = DamageType.NORMAL
    public suit: Suit
    
    public constructor(public readonly action: PlayerAction, 
                        public targets: PlayerInfo[],
                        public cards: Card[]) {
        super()
    }

    public async perform(manager: GameManager): Promise<void> {
        let icards = this.cards.map(c => manager.interpret(this.action.actionSource, c.id))
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

        manager.roundStats.slashCount--;
        
        if (this.damageType === DamageType.THUNDER) {
            manager.broadcast(new TextFlashEffect(this.action.actionSource, this.targets.map(t => t.player.id), '雷杀'))
        } else if (this.damageType === DamageType.FIRE){
            manager.broadcast(new TextFlashEffect(this.action.actionSource, this.targets.map(t => t.player.id), '火杀'))
        } else {
            manager.broadcast(new TextFlashEffect(this.action.actionSource, this.targets.map(t => t.player.id), isSuitBlack(this.suit)? '杀' : '红杀'))
        }

        //todo: 
        // 可以无效化
        // 裸衣增加伤害? 最后一张手牌,方天画戟询问增加目标?
        // 会不会转移目标? (游离)
        // 雌雄双股剑? > 弃牌然后空城
        // leave to the listeners
        await manager.events.publish(this)

        let actor = manager.context.getPlayer(this.action.actionSource)

        //醒酒
        if(actor.isDrunk) {
            this.damage += 1
            actor.isDrunk = false
            manager.broadcast(actor, PlayerInfo.sanitize)
        }

        for(let t of this.targets) {
            let dodgeNeeded = this.dodgeRequired
            if(t.isDead) {
                console.warn('Player already dead, not doing slash on him', t.player.id)
                continue
            }
            //开始杀的结算, 要求出闪
            while(dodgeNeeded > 0) {
                let success = await new DodgeOp(t, this.action, dodgeNeeded, `[${this.action.actionSource}] 对你出杀, 请出闪`).perform(manager)
                if(!success) {
                    let source = manager.context.getPlayer(this.action.actionSource)
                    await new DamageOp(source, t, this.damage, this.action, this.damageType).perform(manager)
                    break
                }
                dodgeNeeded--
            }
        }
    }
}

export class SlashOp extends Operation<boolean> {
    
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
            manager.sendToWorkflow(this.slasher.player.id, CardPos.HAND, cards)
        }

        return true
    }
}