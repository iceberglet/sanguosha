import GameManager from "../GameManager";
import { PlayerAction, UIPosition, getFromAction } from "../../common/PlayerAction";
import { CardType } from "../../common/cards/Card";
import PlaySlashOp, { AskForSlashOp } from "../engine/SlashOp";
import { PlayerInfo } from "../../common/PlayerInfo";
import { CardPos } from "../../common/transit/CardPos";
import { TextFlashEffect, PlaySound } from "../../common/transit/EffectTransit";
import { CardBeingDroppedEvent, CardBeingUsedEvent, CardBeingPlayedEvent } from "../engine/Generic";
import { checkThat } from "../../common/util/Util";
import { EquipOp } from "../engine/EquipOp";
import { ShunShou, GuoHe, WuZhong, JieDao, HuoGong, JueDou } from "../engine/SingleRuseOp";
import { WanJian, NanMan, TieSuo, WuGu, TaoYuan } from "../engine/MultiRuseOp";
import DodgeOp from '../engine/DodgeOp'
import { UseDelayedRuseOp } from "../engine/DelayedRuseOp";
import WineOp from "../engine/WineOp";
import PeachOp from "../engine/PeachOp";

export function getTargets(act: PlayerAction, manager: GameManager): PlayerInfo[] {
    let targets = getFromAction(act, UIPosition.PLAYER)
    return targets.map(t => manager.context.getPlayer(t))
}

export abstract class ActionResolver {
    /**
     * Resolve this action
     * @param act action
     * @returns true if resolved
     */
    abstract async on(act: PlayerAction, manager: GameManager): Promise<boolean>

    abstract async onDodge(act: PlayerAction, dodgeOp: DodgeOp, manager: GameManager): Promise<boolean>

    abstract async onAskingForSlash(act: PlayerAction, dodgeOp: AskForSlashOp, manager: GameManager): Promise<boolean>

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

        if(getFromAction(act, UIPosition.MY_SKILL).length > 0) {
            //武将技能应当在delegate中处理完毕
            throw '武将技能应当在delegate中处理完毕: ' + act.actionSource

        } else if(getFromAction(act, UIPosition.MY_EQUIP).length > 0) {
            //只有丈八有主动技吧??
            let weapon = getFromAction(act, UIPosition.MY_EQUIP)
            if(weapon.length === 1 && manager.getCard(weapon[0]).type === CardType.ZHANG_BA) {
                let hand = getFromAction(act, UIPosition.MY_HAND).map(h => {
                    let cardo = manager.getCard(h)
                    cardo.as = CardType.SLASH
                    cardo.description = '丈八蛇矛'
                    return cardo
                })
                let targetPs = getTargets(act, manager)
                manager.sendToWorkflow(act.actionSource, CardPos.HAND, hand, true)
                await manager.events.publish(new CardBeingUsedEvent(act.actionSource, hand.map(h => [h, CardPos.HAND]), CardType.SLASH))
                await new PlaySlashOp(act.actionSource, targetPs, hand).perform(manager)
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
            let targetPs = getTargets(act, manager)
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
                    await new PeachOp(act.actionSource).perform(manager)
                    break;
    
                //wine
                case CardType.WINE:
                    await new WineOp(act.actionSource).perform(manager)
                    break;

                case CardType.WU_ZHONG:
                    await new WuZhong(act.actionSource, act.actionSource, [card]).perform(manager)
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
                case CardType.WU_XIE_GUO:
                    throw `无法直接出闪/无懈可击!! ${act}`
                default:
                    throw `无法处理这张卡牌!!! ` + card.type.name
            }

        }

    }

    public async onDodge(act: PlayerAction, dodgeOp: DodgeOp, manager: GameManager): Promise<boolean> {
        if(!await this.delegate.onDodge(act, dodgeOp, manager)) {
            manager.broadcast(new TextFlashEffect(dodgeOp.target.player.id, [dodgeOp.source], '闪'))
            //assume he played it
            let cards = getFromAction(act, UIPosition.MY_HAND).map(id => manager.getCard(id))
            if(cards.length !== 1) {
                throw `Player played dodge cards but not one card!!!! ${act.actionSource} ${cards}`
            }
            await manager.events.publish(new CardBeingPlayedEvent(act.actionSource, cards.map(c => [c, CardPos.HAND]), CardType.DODGE))
            manager.sendToWorkflow(dodgeOp.target.player.id, CardPos.HAND, [cards[0]])
        }
        //张角呢??
        return true
    }

    public async onAskingForSlash(resp: PlayerAction, askSlashOp: AskForSlashOp, manager: GameManager): Promise<boolean> {
        if(!await this.delegate.onAskingForSlash(resp, askSlashOp, manager)) {
            let cards = getFromAction(resp, UIPosition.MY_HAND).map(c => {
                let card = manager.getCard(c)
                card.description = `${askSlashOp.slasher.player.id} 出杀`
                if(!card.type.isSlash()) {
                    card.as = CardType.SLASH
                }
                return card
            })
            await manager.events.publish(new CardBeingPlayedEvent(askSlashOp.slasher.player.id, cards.map(c => [c, CardPos.HAND]), CardType.SLASH))
            manager.sendToWorkflow(askSlashOp.slasher.player.id, CardPos.HAND, cards)
        }
        return true
    }
}