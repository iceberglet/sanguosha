import GameManager from "../GameManager";
import { CardType } from "../../common/cards/Card";
import PlaySlashOp, { AskForSlashOp } from "../engine/SlashOp";
import { CardPos } from "../../common/transit/CardPos";
import { TextFlashEffect, LogTransit } from "../../common/transit/EffectTransit";
import { CardBeingDroppedEvent, CardBeingUsedEvent } from "../engine/Generic";
import { checkThat } from "../../common/util/Util";
import { EquipOp } from "../engine/EquipOp";
import { ShunShou, GuoHe, WuZhong, JieDao, HuoGong, JueDou } from "../engine/SingleRuseOp";
import { WanJian, NanMan, TieSuo, WuGu, TaoYuan } from "../engine/MultiRuseOp";
import DodgeOp from '../engine/DodgeOp'
import { UseDelayedRuseOp } from "../engine/DelayedRuseOp";
import WineOp from "../engine/WineOp";
import PeachOp from "../engine/PeachOp";
import PlayerAct from "./PlayerAct";
import AskSavingOp from "../engine/AskSavingOp";
import HealOp from "../engine/HealOp";

export abstract class ActionResolver {
    /**
     * Resolve this action
     * @param act action
     * @returns true if resolved
     */
    abstract on(act: PlayerAct, manager: GameManager): Promise<boolean>

    abstract onSkillAction(act: PlayerAct, event: DodgeOp | AskForSlashOp | AskSavingOp, manager: GameManager): Promise<void>

    abstract onSignAction(act: PlayerAct, event: AskSavingOp, manager: GameManager): Promise<void>

}

export default class PlayerActionResolver extends ActionResolver {

    public constructor(private readonly delegate: ActionResolver) {
        super()
    }

    public async onSkillAction(act: PlayerAct, event: DodgeOp | AskForSlashOp | AskSavingOp, manager: GameManager): Promise<void> {
        await this.delegate.onSkillAction(act, event, manager)
    }

    public async onSignAction(act: PlayerAct, event: AskSavingOp, manager: GameManager): Promise<void> {
        await this.delegate.onSignAction(act, event, manager)
    }

    public async on(act: PlayerAct, manager: GameManager): Promise<boolean> {

        let resolved = await this.delegate.on(act, manager)
        if(resolved) {
            return
        }

        if(act.skill) {
            //武将技能应当在delegate中处理完毕
            throw '武将技能应当在delegate中处理完毕: ' + act

        } else if(act.getCardsAtPos(CardPos.EQUIP).length > 0) {
            //只有丈八有主动技吧??
            let weapon = act.getCardsAtPos(CardPos.EQUIP)[0]
            if(weapon.type === CardType.ZHANG_BA) {
                let hand = act.getCardsAtPos(CardPos.HAND).map(cardo => {
                    cardo.as = CardType.SLASH
                    cardo.description = '丈八蛇矛'
                    return cardo
                })
                let targetPs = act.targets
                manager.sendToWorkflow(act.source.player.id, CardPos.HAND, hand, true)
                await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, hand.map(h => [h, CardPos.HAND]), CardType.SLASH))
                await new PlaySlashOp(act.source, targetPs, hand).perform(manager)
            } else {
                throw `不可能吧...只有丈八蛇矛可以用...实际上却是 [${weapon}]`
            }
        }

        //just card?
        else if(act.getCardsAtPos(CardPos.HAND).length > 0) {

            let hand = act.getCardsAtPos(CardPos.HAND)
            if(hand.length > 1) {
                throw `How can you play 2 cards at once????? ${act}`
            }
            let card = hand[0]
            let icard = manager.interpret(act.source.player.id, card)

            // can be more than one
            let targetPs = act.targets
            let targets = targetPs.map(p => p.player.id)
            //LOG
            let log = act.source + ''
            if(targets.length > 0) {
                log += ' 对 ' + targets.join(', ')
                card.description = `${act.source.player.id} > ${targets.join(', ')}`
            } else {
                card.description = `${act.source.player.id} 使用`
            }
            log += ' 使用了 ' + card
            manager.broadcast(new LogTransit(log))
            
            //装备牌
            if(icard.type.isEquipment()) {
                card.description = `${act.source} 装备`
                manager.sendToWorkflow(act.source.player.id, CardPos.HAND, [card], true, true)
                await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, CardPos.HAND]], card.type))
                await new EquipOp(act.source, card).perform(manager)
                return
            } else if (!icard.type.isDelayedRuse()) {
                manager.sendToWorkflow(act.source.player.id, CardPos.HAND, [card], true)
            }


            if(icard.type === CardType.TIE_SUO && targets.length === 0) {
                //铁索重铸算作弃置
                await manager.events.publish(new CardBeingDroppedEvent(act.source.player.id, [[card, CardPos.HAND]]))
            } else {
                await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, CardPos.HAND]], card.type))
            }

            switch(icard.type) {
                //slash
                case CardType.SLASH:
                case CardType.SLASH_FIRE:
                case CardType.SLASH_THUNDER:
                    await new PlaySlashOp(act.source, targetPs, [card]).perform(manager)
                    break;
    
                //peach
                case CardType.PEACH:
                    //make sure target is null
                    checkThat(targets.length === 0, '桃不能直接用在别人身上')
                    await new PeachOp(act.source).perform(manager)
                    break;
    
                //wine
                case CardType.WINE:
                    await new WineOp(act.source).perform(manager)
                    break;

                case CardType.WU_ZHONG:
                    await new WuZhong(act.source, act.source, [card]).perform(manager)
                    break
                case CardType.JIE_DAO:
                    await new JieDao(act.source, targetPs, [card]).perform(manager)
                    break
                case CardType.GUO_HE:
                    await new GuoHe(act.source, targetPs[0], [card]).perform(manager)
                    break
                case CardType.HUO_GONG:
                    await new HuoGong(act.source, targetPs[0], [card]).perform(manager)
                    break
                case CardType.SHUN_SHOU:
                    await new ShunShou(act.source, targetPs[0], [card]).perform(manager)
                    break
                case CardType.JUE_DOU:
                    await new JueDou(act.source, targetPs[0], [card]).perform(manager)
                    break
                case CardType.TIE_SUO:
                    await new TieSuo(act.source, targetPs, act.button === 'chong_zhu', [card]).perform(manager)
                    break
                case CardType.WAN_JIAN:
                    await new WanJian([card], act.source, CardType.WAN_JIAN, manager.getSortedByCurr(false)).perform(manager)
                    break
                case CardType.NAN_MAN:
                    await new NanMan([card], act.source, CardType.NAN_MAN, manager.getSortedByCurr(false)).perform(manager)
                    break
                case CardType.WU_GU:
                    await new WuGu([card], act.source, CardType.WU_GU, manager.getSortedByCurr(true)).perform(manager)
                    break
                case CardType.TAO_YUAN:
                    await new TaoYuan([card], act.source, CardType.TAO_YUAN, manager.getSortedByCurr(true).filter(p => p.hp < p.maxHp)).perform(manager)
                    break

                case CardType.LE_BU:
                case CardType.BING_LIANG:
                    manager.broadcast(new TextFlashEffect(act.source.player.id, [targetPs[0].player.id], icard.type.name))
                    await new UseDelayedRuseOp(card, act.source, CardPos.HAND, targetPs[0]).perform(manager)
                    break
                case CardType.SHAN_DIAN:
                    manager.broadcast(new TextFlashEffect(act.source.player.id, [], CardType.SHAN_DIAN.name))
                    await new UseDelayedRuseOp(card, act.source, CardPos.HAND, act.source).perform(manager)
                    break
                
                //dodge
                case CardType.DODGE:
                case CardType.WU_XIE:
                case CardType.WU_XIE_GUO:
                    throw `无法直接出闪/无懈可击!! ${act}`
                default:
                    throw `无法处理这张卡牌!!! ` + card.type.name
            }

        }

    }
}