import GameManager from "../GameManager";
import { PlayerAction, UIPosition, getFromAction } from "../../common/PlayerAction";
import { CardType } from "../../common/cards/Card";
import PlaySlashOp from "../flows/SlashOp";
import { PlayerInfo } from "../../common/PlayerInfo";
import HealOp from "../flows/HealOp";
import { CardPos } from "../../common/transit/CardPos";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import { CardBeingPlayedEvent, CardBeingDroppedEvent, CardBeingUsedEvent } from "../flows/Generic";
import { checkThat } from "../../common/util/Util";
import { EquipOp } from "./EquipOp";
import { ShunShou, GuoHe, WuZhong, JieDao, HuoGong, JueDou } from "./SingleRuseOp";
import { WanJian, NanMan, TieSuo, WuGu, TaoYuan } from "./MultiRuseOp";
import { UseDelayedRuseOp } from "./DelayedRuseOp";
import { WINE_TAKEN } from "../../common/RoundStat";

export abstract class ActionResolver {
    /**
     * Resolve this action
     * @param act action
     * @returns true if resolved
     */
    abstract async on(act: PlayerAction, manager: GameManager): Promise<boolean>

    protected getTargets=(act: PlayerAction, manager: GameManager): PlayerInfo[] =>{
        let targets = getFromAction(act, UIPosition.PLAYER)
        return targets.map(t => manager.context.getPlayer(t))
    }

}

export default class PlayerActionResolver extends ActionResolver {

    public constructor(private readonly delegate: ActionResolver) {
        super()
    }

    public async on(act: PlayerAction, manager: GameManager): Promise<boolean> {

        let resolved = await this.delegate.on(act, manager)
        if(resolved) {
            return
        }

        if(getFromAction(act, UIPosition.MY_EQUIP).length > 0) {
            //只有丈八有主动技吧??
            let weapon = getFromAction(act, UIPosition.MY_EQUIP)
            if(weapon.length === 1 && manager.getCard(weapon[0]).type === CardType.ZHANG_BA) {
                let hand = getFromAction(act, UIPosition.MY_HAND)
                let targetPs = this.getTargets(act, manager)
                await new PlaySlashOp(act.actionSource, targetPs, hand.map(h => manager.getCard(h))).perform(manager)
            } else {
                throw `不可能吧...只有丈八蛇矛可以用...实际上却是 [${weapon.join(',')}]`
            }
        }

        //just card?
        else if(getFromAction(act, UIPosition.MY_HAND).length > 0) {

            let hand = getFromAction(act, UIPosition.MY_HAND)
            if(hand.length > 1) {
                throw `How can you play 2 cards at once????? ${act}`
            }
            let player = manager.context.getPlayer(act.actionSource)
            let card = manager.getCard(hand[0])
            let icard = manager.interpret(act.actionSource, card.id)

            // can be more than one
            let targetPs = this.getTargets(act, manager)
            let targets = targetPs.map(p => p.player.id)
            if(targets.length > 0) {
                card.description = `${player.player.id} > ${targets.join(', ')}`
            } else {
                card.description = `${player.player.id} 使用`
            }
            

            if(icard.type === CardType.TIE_SUO && targets.length === 0) {
                //铁索重铸算作弃置
                await manager.events.publish(new CardBeingDroppedEvent(act.actionSource, [[card, CardPos.HAND]]))
            } else {
                await manager.events.publish(new CardBeingUsedEvent(act.actionSource, [[card, CardPos.HAND]], card.type))
            }

            //装备牌
            if(icard.type.isEquipment()) {
                card.description = `${player.player.id} 装备`
                manager.sendToWorkflow(act.actionSource, CardPos.HAND, [card], true, true)
                await new EquipOp(act.actionSource, card).perform(manager)
                return
            } else if (!icard.type.isDelayedRuse()) {
                manager.sendToWorkflow(act.actionSource, CardPos.HAND, [card], true)
            }

            switch(icard.type) {
                //slash
                case CardType.SLASH:
                case CardType.SLASH_FIRE:
                case CardType.SLASH_THUNDER:
                    await new PlaySlashOp(act.actionSource, targetPs, [card]).perform(manager)
                    break;
    
                //peach
                case CardType.PEACH:
                    //make sure target is null
                    checkThat(targets.length === 0, '桃不能直接用在别人身上')
                    let info = manager.context.getPlayer(act.actionSource)
                    manager.broadcast(new TextFlashEffect(act.actionSource, [], '桃'))
                    await new HealOp(info, info, 1).perform(manager)
                    break;
    
                //wine
                case CardType.WINE:
                    player.isDrunk = true
                    manager.broadcast(player, PlayerInfo.sanitize)
                    manager.broadcast(new TextFlashEffect(act.actionSource, [], '酒'))
                    manager.roundStats.customData[WINE_TAKEN] = true
                    break;

                case CardType.WU_ZHONG:
                    await new WuZhong(act.actionSource, targets[0], [card]).perform(manager)
                    break
                case CardType.JIE_DAO:
                    await new JieDao(act.actionSource, targets, [card]).perform(manager)
                    break
                case CardType.GUO_HE:
                    await new GuoHe(act.actionSource, targets[0], [card]).perform(manager)
                    break
                case CardType.HUO_GONG:
                    await new HuoGong(act.actionSource, targets[0], [card]).perform(manager)
                    break
                case CardType.SHUN_SHOU:
                    await new ShunShou(act.actionSource, targets[0], [card]).perform(manager)
                    break
                case CardType.JUE_DOU:
                    await new JueDou(act.actionSource, targets[0], [card]).perform(manager)
                    break
                case CardType.TIE_SUO:
                    await new TieSuo(act.actionSource, targets, [card]).perform(manager)
                    break
                case CardType.WAN_JIAN:
                    await new WanJian([card], act.actionSource, CardType.WAN_JIAN, manager.getSortedByCurr(false)).perform(manager)
                    break
                case CardType.NAN_MAN:
                    await new NanMan([card], act.actionSource, CardType.NAN_MAN, manager.getSortedByCurr(false)).perform(manager)
                    break
                case CardType.WU_GU:
                    await new WuGu([card], act.actionSource, CardType.WU_GU, manager.getSortedByCurr(true)).perform(manager)
                    break
                case CardType.TAO_YUAN:
                    await new TaoYuan([card], act.actionSource, CardType.TAO_YUAN, manager.getSortedByCurr(true).filter(p => p.hp < p.maxHp)).perform(manager)
                    break

                case CardType.LE_BU:
                case CardType.BING_LIANG:
                    await new UseDelayedRuseOp(card, act.actionSource, CardPos.HAND, targets[0]).perform(manager)
                    break
                case CardType.SHAN_DIAN:
                    await new UseDelayedRuseOp(card, act.actionSource, CardPos.HAND, act.actionSource).perform(manager)
                    break
                
                //dodge
                case CardType.DODGE:
                case CardType.WU_XIE:
                    throw `无法直接出闪/无懈可击!! ${act}`
                default:
                    throw `无法处理这张卡牌!!! ` + card.type.name
            }

        }

    }

}