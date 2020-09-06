import GameManager from "../server/GameManager";
import { EquipOp } from "../server/engine/EquipOp";
import { CardBeingDroppedEvent, CardBeingPlayedEvent, CardBeingTakenEvent, CardBeingUsedEvent, CardAwayEvent } from "../server/flows/Generic";
import { Equipment, CiXiong, QingGang, GuanShi, GuDing, ZhuQue, HanBing, Qilin, LianNu, RenWang, TengJia, BaGua, BaiYin } from "../server/engine/Equipments";
import { CardType } from "../common/cards/Card";
import DamageOp, { DamageSource, DamageTimeline } from "../server/flows/DamageOp";
import { CardPos } from "../common/transit/CardPos";
import { HintType } from "../common/ServerHint";
import { Button, isCancel, getFromAction, UIPosition } from "../common/PlayerAction";
import FactionPlayerInfo from "./FactionPlayerInfo";
import { PlayerInfo } from "../common/PlayerInfo";

const playerAndEquipments = new Map<string, Equipment>()

export default function initializeEquipments(manager: GameManager) {

    playerAndEquipments.clear()
    
    manager.equipmentRegistry.onGeneral<EquipOp>(EquipOp, async (equipOp)=>{
        //register equipments
        if(equipOp.card.type.isHorse()) {
            return //no need to do this for horses
        }
        let type = equipOp.card.type.name
        let equip: Equipment
        switch(type) {
            case CardType.CI_XIONG.name: equip = new CiXiong(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.QING_GANG.name: equip = new QingGang(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.ZHU_QUE.name: equip = new ZhuQue(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.GU_DING.name: equip = new GuDing(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.GUAN_SHI.name: equip = new GuanShi(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.LIAN_NU.name: equip = new LianNu(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.HAN_BING.name: equip = new HanBing(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.QI_LIN.name: equip = new Qilin(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.WU_LIU.name: equip = new WuLiu(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.SAN_JIAN.name: equip = new SanJian(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.ZHANG_BA.name: 
                //丈八的效果仅限于玩家主动施放
                return


            case CardType.SILVER_LION.name: equip = new BaiYin(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.REN_WANG.name: equip = new RenWang(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.TENG_JIA.name: equip = new TengJia(equipOp.beneficiary, equipOp.card.id, manager)
                break
            case CardType.BA_GUA.name: equip = new BaGua(equipOp.beneficiary, equipOp.card.id, manager)
                break
            default:
                throw 'Unknown equipment!!! ' + type
        }

        console.log(`[装备] ${equipOp.beneficiary} 装备了 ${equipOp.card.id}`)
        playerAndEquipments.set(equipOp.card.id, equip)
        await equip.onEquipped()
    })

    
    let checkEquipmentDrop = async (dropEvent: CardAwayEvent): Promise<void> =>{
        //unregister equipments
        for(let d of dropEvent.cards) {
            if(d[1] === CardPos.EQUIP && !d[0].type.isHorse()) {
                console.log(`[装备] ${dropEvent.player} 卸下了 ${d[0].id}`)
                if(!playerAndEquipments.has(d[0].id)) {
                    console.warn('Missing equipment... not registered (这是丈八?) ' + d[0].id)
                    continue
                }
                await playerAndEquipments.get(d[0].id).onDropped()
            }
        }
    }

    manager.equipmentRegistry.onGeneral<CardBeingDroppedEvent>(CardBeingDroppedEvent, checkEquipmentDrop)
    manager.equipmentRegistry.onGeneral<CardBeingPlayedEvent>(CardBeingPlayedEvent, checkEquipmentDrop)
    manager.equipmentRegistry.onGeneral<CardBeingTakenEvent>(CardBeingTakenEvent, checkEquipmentDrop)
    manager.equipmentRegistry.onGeneral<CardBeingUsedEvent>(CardBeingUsedEvent, checkEquipmentDrop)

}


export class WuLiu extends Equipment {

    async onEquipped(): Promise<void> {
        let me = this.manager.context.getPlayer(this.player) as FactionPlayerInfo
        console.log('[装备] 吴六剑装备')
        this.manager.getSortedByCurr(true)
                    .filter(p => p.player.id !== this.player && FactionPlayerInfo.factionSame(me, p as FactionPlayerInfo))
                    .forEach(p => {
                        p.reachModifier += 1
                        console.log(`[装备] ${p.player.id} 受吴六剑装备的影响, reachModifier成为${p.reachModifier}`)
                        this.manager.broadcast(p, PlayerInfo.sanitize)
                    })
        //todo: newly revealed players need to have this as well!
    }

    async onDropped(): Promise<void> {
        let me = this.manager.context.getPlayer(this.player) as FactionPlayerInfo
        console.log('[装备] 吴六剑卸下')
        this.manager.getSortedByCurr(true)
                    .filter(p => p.player.id !== this.player && FactionPlayerInfo.factionSame(me, p as FactionPlayerInfo))
                    .forEach(p => {
                        p.reachModifier -= 1
                        console.log(`[装备] ${p.player.id} 受吴六剑卸下的影响, reachModifier成为${p.reachModifier}`)
                        this.manager.broadcast(p, PlayerInfo.sanitize)
                    })
    }
}


export class SanJian extends Equipment {
    
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
        if(op.timeline !== DamageTimeline.DID_DAMAGE) {
            return
        }
        let potential = op.source.getCards(CardPos.EQUIP).find(c => c.type === CardType.SAN_JIAN)
        if(!potential) {
            throw `不可能! 我登记过的就应该有这个武器! 三尖两刃刀 ${this.player}`
        }
        if(op.target.isDead || op.source.isDead) {
            console.log('[装备] 三尖两刃刀无法发动, 因玩家已死', op.target.isDead, op.source.isDead)
            return 
        }
        let ask = await this.manager.sendHint(this.player, {
            hintType: HintType.MULTI_CHOICE,
            hintMsg: `是否发动三尖两刃刀特效`,
            extraButtons: [Button.OK, Button.CANCEL]
        })
        if(isCancel(ask)) {
            console.log('[装备] 玩家放弃发动三尖两刃刀')
            return
        }
        let resp = await this.manager.sendHint(this.player, {
            hintType: HintType.SPECIAL,
            specialId: CardType.SAN_JIAN.name,
            hintMsg: '发动三尖两刃刀',
            sourcePlayer: op.target.player.id,
            extraButtons: [Button.CANCEL]
        })
        if(isCancel(resp)) {
            console.log('[装备] 玩家放弃发动三尖两刃刀')
            return 
        } else {
            let card = this.manager.getCard(getFromAction(resp, UIPosition.MY_HAND)[0])
            delete card.as
            card.description = this.player + ' 三尖两刃刀弃牌'
            this.manager.sendToWorkflow(this.player, CardPos.HAND, [card], true)
            await new DamageOp(op.source, op.target, 1, [], DamageSource.SKILL).perform(this.manager)
        }
    }
}