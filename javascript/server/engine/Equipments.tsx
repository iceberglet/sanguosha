import GameManager from "../GameManager";
import { SlashCompute, SlashDodgedEvent, SlashOP } from "./SlashOp";
import { CardPos } from "../../common/transit/CardPos";
import { CardType } from "../../common/cards/Card";
import { Timeline } from "../Operation";
import { HintType, CardSelectionResult } from "../../common/ServerHint";
import { Button, UIPosition } from "../../common/PlayerAction";
import DamageOp, { DamageType, DamageTimeline, DamageSource } from "./DamageOp";
import { PlayerInfo } from "../../common/PlayerInfo";
import { DropCardRequest, DropOthersCardRequest } from "./DropCardOp";
import TakeCardOp from "./TakeCardOp";
import { flattenMap, checkThat } from "../../common/util/Util";
import { CardBeingDroppedEvent } from "./Generic";
import { StageStartFlow } from "./StageFlows";
import { Stage } from "../../common/Stage";
import { WanJian, NanMan } from "./MultiRuseOp";
import { isSuitBlack, isSuitRed } from "../../common/cards/ICard";
import DodgeOp from "./DodgeOp";
import JudgeOp from "./JudgeOp";
import HealOp from "./HealOp";
import { TextFlashEffect, PlaySound } from "../../common/transit/EffectTransit";

export const BlockedEquipment = new Set<string>()

export abstract class Equipment {
    constructor(protected player: string, protected cardId: string, protected manager: GameManager) {}
    abstract async onEquipped(): Promise<void>
    abstract async onDropped(): Promise<void>
    protected show() {
        let type = this.manager.getCard(this.cardId).type
        this.manager.broadcast(new PlaySound(`audio/equip/${type.id}.ogg`))
        this.manager.broadcast(new TextFlashEffect(this.player, [], type.name))
    }
}

export abstract class Weapon extends Equipment {
    
    async onEquipped(): Promise<void> {
        this.manager.equipmentRegistry.on<SlashCompute>(SlashCompute, this.player, this.performEffect)
    }

    async onDropped(): Promise<void> {
        this.manager.equipmentRegistry.off<SlashCompute>(SlashCompute, this.player, this.performEffect)
    }

    abstract myType(): CardType

    abstract async doEffect(op: SlashCompute): Promise<void>

    performEffect = async (op: SlashCompute) => {
        if(op.source.player.id !== this.player) {
            return
        }
        let potential = op.source.getCards(CardPos.EQUIP).find(c => c.type === this.myType())
        if(potential) {
            await this.doEffect(op)
        } else {
            throw `不可能! 我登记过的就应该有这个武器! ${this.myType.name} ${this.player}`
        }
    }
}

export class QingGang extends Weapon {

    myType(): CardType {
        return CardType.QING_GANG
    }

    async doEffect(op: SlashCompute) {  
        let shield = op.target.getCards(CardPos.EQUIP)
                .find(c => c.type.genre === 'shield')
        if(shield) {
            if(op.timeline === Timeline.AFTER_CONFIRMING_TARGET) {
                this.show()
                console.log('[装备] 青釭技能发动, 无视防具:', shield.id)
                BlockedEquipment.add(shield.id)
            } else if(op.timeline === Timeline.COMPUTE_FINISH){
                console.log('[装备] 青釭技能结算完毕, 恢复防具:', shield.id)
                BlockedEquipment.delete(shield.id)
            }
        }
    }
}

export class ZhuQue extends Equipment {
    
    async onEquipped(): Promise<void> {
        this.manager.equipmentRegistry.on<SlashOP>(DamageOp, this.player, this.performEffect)
    }

    async onDropped(): Promise<void> {
        this.manager.equipmentRegistry.off<SlashOP>(DamageOp, this.player, this.performEffect)
    }

    async performEffect(op: SlashOP) {
        if(op.damageType === DamageType.NORMAL) {
            //询问是否发动
            let resp = await this.manager.sendHint(this.player, {
                hintType: HintType.MULTI_CHOICE,
                hintMsg: '是否发动朱雀羽扇的效果?',
                extraButtons: [Button.OK, Button.CANCEL]
            })
            if(!resp.isCancel()) {
                this.show()
                console.log(`[装备] ${this.player} 发动了朱雀羽扇`)
                op.damageType = DamageType.FIRE
            }
        }
    }
}

export class CiXiong extends Weapon {
    
    myType(): CardType {
        return CardType.CI_XIONG
    }

    async doEffect(op: SlashCompute) {
        if(op.timeline === Timeline.AFTER_CONFIRMING_TARGET && this.differentSex(op.source, op.target)) {
            //询问是否发动
            let resp = await this.manager.sendHint(this.player, {
                hintType: HintType.MULTI_CHOICE,
                hintMsg: `是否对 ${op.target.player.id} 发动雌雄双股剑`,
                extraButtons: [Button.OK, Button.CANCEL]
            })
            if(!resp.isCancel()) {
                this.show()
                console.log(`[装备] ${this.player} 发动了雌雄双股剑`)
                let resp = await new DropCardRequest().perform(op.target.player.id, 1, this.manager, 
                    `${this.player} 对你发动了雌雄双股剑, 请弃置一张手牌或点击取消令其摸一张牌`, [UIPosition.MY_HAND], true)
                
                //若按了取消
                if(!resp) {
                    console.log(`[装备] ${op.target.player.id} 选择让 ${this.player} 摸一张牌`)
                    await new TakeCardOp(op.source, 1).perform(this.manager)
                } else {
                    console.log(`[装备] ${op.target.player.id} 选择弃置了牌`)
                }
            }
        }
    }

    private differentSex(a: PlayerInfo, b: PlayerInfo) {
        return a.getGender() !== b.getGender() && a.getGender() !== 'Nil' && b.getGender() !== 'Nil'
    }
}


export class GuDing extends Equipment {
    
    async onEquipped(): Promise<void> {
        this.manager.equipmentRegistry.on<DamageOp>(DamageOp, this.player, this.performEffect)
    }

    async onDropped(): Promise<void> {
        this.manager.equipmentRegistry.off<DamageOp>(DamageOp, this.player, this.performEffect)
    }

    performEffect = async (op: DamageOp) => {
        if(!op.source || op.source.player.id !== this.player || op.damageSource !== DamageSource.SLASH) {
            return
        }
        let potential = op.source.getCards(CardPos.EQUIP).find(c => c.type === CardType.GU_DING)
        if(!potential) {
            throw `不可能! 我登记过的就应该有这个武器! 古锭刀 ${this.player}`
        }
        if(op.timeline === DamageTimeline.DOING_DAMAGE && op.target.getCards(CardPos.HAND).length === 0) {
            this.show()
            console.log('[装备] 古锭刀伤害加1')
            op.amount += 1
        }
    }
}


export class GuanShi extends Equipment {

    async onEquipped(): Promise<void> {
        this.manager.equipmentRegistry.on<SlashDodgedEvent>(SlashDodgedEvent, this.player, this.performEffect)
    }

    async onDropped(): Promise<void> {
        this.manager.equipmentRegistry.off<SlashDodgedEvent>(SlashDodgedEvent, this.player, this.performEffect)
    }

    performEffect = async (op: SlashDodgedEvent) => {
        let slashCompute = op.slashOp
        if(slashCompute.source.player.id !== this.player) {
            return
        }
        let potential = slashCompute.source.getCards(CardPos.EQUIP).find(c => c.type === CardType.GUAN_SHI)
        if(!potential){
            throw `不可能! 我登记过的就应该有这个武器! 贯石斧 ${this.player}`
        }
        let resp = await this.manager.sendHint(this.player, {
            hintType: HintType.CHOOSE_CARD,
            hintMsg: `请选择弃置两张牌发动贯石斧或取消放弃发动`,
            positions: [UIPosition.MY_HAND, UIPosition.MY_EQUIP],
            quantity: 2,
            forbidden: [potential.id], //不能弃置贯石斧本身
            extraButtons: [Button.CANCEL],
        })
        if(!resp.isCancel()) {
            this.show()
            let cards = resp.getCardsAndPos(CardPos.HAND, CardPos.EQUIP)
            console.log('[装备] 玩家发动贯石斧造成伤害: ', this.player, cards)
    
            for(let kv of cards) {
                let p: CardPos = kv[0]
                let toDrop = kv[1].map(card => {
                    delete card.as
                    card.description = `[${this.player}] 使用贯石斧弃置`
                    return card
                })
                this.manager.sendToWorkflow(this.player, p, toDrop, true)
                await this.manager.events.publish(new CardBeingDroppedEvent(this.player, toDrop.map(d => [d, p])))
            }
            await new DamageOp(slashCompute.source, slashCompute.target, slashCompute.damageAmount, 
                                slashCompute.cards, DamageSource.SLASH, slashCompute.damageType).perform(this.manager)
        } else {
            console.log('[装备] 玩家放弃发动贯石斧')
        }
    }
}


export class Qilin extends Equipment {
    
    async onEquipped(): Promise<void> {
        this.manager.equipmentRegistry.on<DamageOp>(DamageOp, this.player, this.performEffect)
    }

    async onDropped(): Promise<void> {
        this.manager.equipmentRegistry.off<DamageOp>(DamageOp, this.player, this.performEffect)
    }

    performEffect = async (op: DamageOp) => {
        if(!op.source || op.source.player.id !== this.player || op.damageSource !== DamageSource.SLASH) {
            return
        }
        let potential = op.source.getCards(CardPos.EQUIP).find(c => c.type === CardType.QI_LIN)
        if(!potential) {
            throw `不可能! 我登记过的就应该有这个武器! 麒麟弓 ${this.player}`
        }
        if(op.timeline === DamageTimeline.DOING_DAMAGE) {
            let horses = op.target.getCards(CardPos.EQUIP).filter(c => c.type.isHorse())
            if(horses.length === 0) {
                console.log('[装备] 麒麟弓发现没啥好射的')
                return
            }
            let ask = await this.manager.sendHint(this.player, {
                hintType: HintType.MULTI_CHOICE,
                hintMsg: `是否对 ${op.target.player.id} 发动麒麟弓特效`,
                extraButtons: [Button.OK, Button.CANCEL]
            })
            if(ask.isCancel()) {
                console.log('[装备] 玩家放弃发动麒麟弓')
                return
            }
            let resp = await this.manager.sendHint(this.player, {
                hintType: HintType.UI_PANEL,
                hintMsg: '请选择对方坐骑',
                customRequest: {
                    data: {
                        rowsOfCard: {
                            '坐骑': horses
                        },
                        title: `麒麟弓射 ${op.target.player.id} 的坐骑`,
                        chooseSize: 1
                    },
                    mode: 'choose'
                }
            })
            this.show()
            let res = resp.customData as CardSelectionResult
            let horseCard = horses[res[0].idx]
            console.log(`[装备] 玩家发动麒麟弓射下了 ${horseCard.id}`)
            horseCard.description = `${op.target.player.id} 被弃置`
            this.manager.sendToWorkflow(op.target.player.id, CardPos.EQUIP, [horseCard])
            await this.manager.events.publish(new CardBeingDroppedEvent(op.target.player.id, [[horseCard, CardPos.EQUIP]]))
        }
    }
}

export class LianNu extends Equipment {
    
    async onEquipped(): Promise<void> {
        if(this.manager.currPlayer().player.id === this.player) {
            //给别人装连弩可不能算
            this.manager.roundStats.slashMax += 900
            console.log(`[装备] ${this.player} 装备了连弩, 立即获得 +900 出杀上限 变成: ${this.manager.roundStats.slashMax}`)
        }
        this.manager.equipmentRegistry.on<StageStartFlow>(StageStartFlow, this.player, this.performEffect)
        this.manager.equipmentRegistry.on<SlashOP>(SlashOP, this.player, async (op) => {
            if(op.source.player.id === this.player && this.manager.roundStats.slashCount > 1) {
                this.show()
            }
        })
    }

    async onDropped(): Promise<void> {
        if(this.manager.currPlayer().player.id === this.player) {
            //给别人拆了连弩可不能算
            this.manager.roundStats.slashMax -= 900
            console.log(`[装备] ${this.player} 卸下了了连弩, 立即损失 900 出杀上限 = ${this.manager.roundStats.slashMax}`)
        }
        this.manager.equipmentRegistry.off<StageStartFlow>(StageStartFlow, this.player, this.performEffect)
    }

    performEffect = async (op: StageStartFlow): Promise<void> => {
        if(op.info.player.id !== this.player) {
            return
        }
        let potential = op.info.getCards(CardPos.EQUIP).find(c => c.type === CardType.LIAN_NU)
        if(!potential) {
            throw `不可能! 我登记过的就应该有这个武器! 连弩 ${this.player}`
        }
        if(op.stage === Stage.ROUND_BEGIN) {
            console.log(`[装备] ${this.player} 回合开始时装备了连弩, 立即获得 +900 出杀上限 = ${this.manager.roundStats.slashMax}`)
            this.manager.roundStats.slashMax += 900
        } 
    }

}

export class HanBing extends Equipment {
    
    async onEquipped(): Promise<void> {
        this.manager.equipmentRegistry.on<DamageOp>(DamageOp, this.player, this.performEffect)
    }

    async onDropped(): Promise<void> {
        this.manager.equipmentRegistry.off<DamageOp>(DamageOp, this.player, this.performEffect)
    }

    performEffect = async (op: DamageOp): Promise<void> => {
        if(!op.source || op.source.player.id !== this.player || op.damageSource !== DamageSource.SLASH) {
            return
        }
        let potential = op.source.getCards(CardPos.EQUIP).find(c => c.type === CardType.HAN_BING)
        if(potential) {
            if(op.timeline === DamageTimeline.DOING_DAMAGE) {
                let cards = op.target.getAllCards().length
                if(cards === 0) {
                    console.log('[装备] 对象没有牌, 无法发动寒冰剑')
                    return
                }

                let ask = await this.manager.sendHint(this.player, {
                    hintType: HintType.MULTI_CHOICE,
                    hintMsg: `是否对 ${op.target.player.id} 发动寒冰剑特效`,
                    extraButtons: [Button.OK, Button.CANCEL]
                })

                if(ask.isCancel()) {
                    console.log('[装备] 放弃发动寒冰剑')
                    return
                }

                //取消本次伤害
                console.log('[装备] 选择发动寒冰剑弃牌')
                this.show()
                op.amount = -999

                await new DropOthersCardRequest().perform(this.manager, op.source, op.target, `寒冰剑弃置对方的手牌/装备牌`, 
                                                            [CardPos.HAND, CardPos.EQUIP])
                if(op.target.getAllCards().length > 0) {
                    //再来一次嘿嘿哟
                    console.log('[装备] 发动寒冰剑弃置第二张牌')
                    await new DropOthersCardRequest().perform(this.manager, op.source, op.target, `寒冰剑弃置对方的手牌/装备牌`, 
                                                                [CardPos.HAND, CardPos.EQUIP])
                }
            }
        } else {
            throw `不可能! 我登记过的就应该有这个武器! 寒冰剑 ${this.player}`
        }
    }
}


// 国战与标准版青龙不同, 暂不加入
// export class QingLong extends Weapon {
    
//     myType(): CardType {
//         return CardType.QING_LONG
//     }

//     async doEffect(op: PlaySlashOp) {
//     }
// }


//------------------------------------------------------- 防具 -------------------------------------------------------

export class TengJia extends Equipment {
    
    async onEquipped(): Promise<void> {
        this.manager.equipmentRegistry.on<DamageOp>(DamageOp, this.player, this.amplifyFire)
        this.manager.equipmentRegistry.on<SlashCompute>(SlashCompute, this.player, this.abortSlash)
        this.manager.equipmentRegistry.on<WanJian>(WanJian, this.player, this.abortAOE)
        this.manager.equipmentRegistry.on<NanMan>(NanMan, this.player, this.abortAOE)
    }

    async onDropped(): Promise<void> {
        this.manager.equipmentRegistry.off<DamageOp>(DamageOp, this.player, this.amplifyFire)
        this.manager.equipmentRegistry.off<SlashCompute>(SlashCompute, this.player, this.abortSlash)
        this.manager.equipmentRegistry.off<WanJian>(WanJian, this.player, this.abortAOE)
        this.manager.equipmentRegistry.off<NanMan>(NanMan, this.player, this.abortAOE)
    }

    abortSlash = async (slashOp: SlashCompute): Promise<void> => {
        if(slashOp.target.player.id === this.player && 
            slashOp.timeline === Timeline.AFTER_CONFIRMING_TARGET &&
            slashOp.damageType === DamageType.NORMAL) {
            if(BlockedEquipment.has(this.cardId)) {
                console.warn('[装备] 被无视, 无法发动 ' + this.cardId)
                return
            }
            //目标已经确定, 开始结算
            console.log(`[装备] 藤甲令 ${slashOp.source.player.id} 的杀无效`)
            this.manager.broadcast(new PlaySound(`audio/equip/teng_jia_good.ogg`))
            this.manager.broadcast(new TextFlashEffect(this.player, [], '藤甲_好'))
            slashOp.abort = true
            //todo: show effect
        }
    }

    abortAOE = async (aoe: WanJian | NanMan): Promise<void> => {
        if(BlockedEquipment.has(this.cardId)) {
            console.warn('[装备] 被无视, 无法发动 ' + this.cardId)
            return
        }
        let idx = aoe.targets.findIndex(t => t.player.id === this.player)
        if(idx > -1) {
            console.log(`[装备] 藤甲将 ${this.player} 移出万箭/南蛮的影响对象`)
            this.manager.broadcast(new PlaySound(`audio/equip/teng_jia_good.ogg`))
            this.manager.broadcast(new TextFlashEffect(this.player, [], '藤甲_好'))
            let curr = aoe.targets.length
            aoe.targets.splice(idx, 1)
            checkThat(curr === aoe.targets.length + 1, 'WHAAAT?')
        }
    }

    amplifyFire = async (op: DamageOp) => {

        if(op.target.player.id !== this.player || op.timeline !== DamageTimeline.TAKING_DAMAGE) {
            return
        }
        if(BlockedEquipment.has(this.cardId)) {
            console.warn('[装备] 被无视, 无法发动 ' + this.cardId)
            return
        }
        if(op.type === DamageType.FIRE) {
            this.manager.broadcast(new PlaySound(`audio/equip/teng_jia_bad.ogg`))
            this.manager.broadcast(new TextFlashEffect(this.player, [], '藤甲_坏'))
            console.log('[装备] 藤甲令火伤害+1')
            op.amount += 1
        }
    }
}

export class RenWang extends Equipment {
    
    async onEquipped(): Promise<void> {
        this.manager.equipmentRegistry.on<SlashCompute>(SlashCompute, this.player, this.abortSlash)
    }

    async onDropped(): Promise<void> {
        this.manager.equipmentRegistry.off<SlashCompute>(SlashCompute, this.player, this.abortSlash)
    }

    abortSlash = async (slashOp: SlashCompute) => {
        if(slashOp.target.player.id === this.player && 
            slashOp.timeline === Timeline.AFTER_CONFIRMING_TARGET &&
            isSuitBlack(slashOp.suit)) {
            if(BlockedEquipment.has(this.cardId)) {
                console.warn('[装备] 被无视, 无法发动 ' + this.cardId)
                return
            }
            this.show()
            console.log(`[装备] 仁王盾令 ${slashOp.source.player.id} 的杀无效`)
            slashOp.abort = true
        }
    }
}


export class BaGua extends Equipment {
    
    async onEquipped(): Promise<void> {
        this.manager.equipmentRegistry.on<DodgeOp>(DodgeOp, this.player, this.pretendDodge)
    }

    async onDropped(): Promise<void> {
        this.manager.equipmentRegistry.off<DodgeOp>(DodgeOp, this.player, this.pretendDodge)
    }

    pretendDodge = async (dodgeOp: DodgeOp): Promise<void> => {
        if(dodgeOp.target.player.id === this.player && !dodgeOp.playedDodgeSomehow) {
            if(BlockedEquipment.has(this.cardId)) {
                console.warn('[装备] 被无视, 无法发动 ' + this.cardId)
                return
            }
            let resp = await this.manager.sendHint(this.player, {
                hintType: HintType.MULTI_CHOICE,
                hintMsg: '是否发动八卦阵?',
                extraButtons: [Button.OK, Button.CANCEL]
            })
            if(!resp.isCancel()) {
                this.show()
                let card = await new JudgeOp(`${this.player} 八卦阵判定牌`, this.player).perform(this.manager)
                if(isSuitRed(this.manager.interpret(this.player, card.id).suit)){
                    console.log(`[装备] ${this.player} 八卦判定成功`)
                    dodgeOp.playedDodgeSomehow = true
                } else {
                    console.log(`[装备] ${this.player} 八卦判定失败`)
                }
            }
        }
    }
}


export class BaiYin extends Equipment {

    async onEquipped(): Promise<void> {
        this.manager.equipmentRegistry.on<DamageOp>(DamageOp, this.player, this.reduceDamage)
    }

    async onDropped(): Promise<void> {
        this.manager.equipmentRegistry.off<DamageOp>(DamageOp, this.player, this.reduceDamage)
        let owner = this.manager.context.getPlayer(this.player)
        if(owner.hp < owner.maxHp) {
            this.show()
            await new HealOp(owner, owner, 1).perform(this.manager)
        }
    }

    reduceDamage = async (damageOp: DamageOp): Promise<void> => {
        if(damageOp.target.player.id === this.player && 
            damageOp.timeline === DamageTimeline.TAKING_DAMAGE &&
            damageOp.amount > 1) {
            
            if(BlockedEquipment.has(this.cardId)) {
                console.warn('[装备] 被无视, 无法发动 ' + this.cardId)
                return
            }

            this.show()
            console.log(`[装备] 白银狮子将伤害 ${damageOp.amount} 降低为1`)
            damageOp.amount = 1
        }
    }

}