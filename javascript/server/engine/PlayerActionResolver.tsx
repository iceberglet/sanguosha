import GameManager from "../GameManager";
import { PlayerAction, UIPosition, getFromAction } from "../../common/PlayerAction";
import { CardType } from "../../common/cards/Card";
import PlaySlashOp from "../flows/SlashOp";
import { PlayerInfo } from "../../common/PlayerInfo";
import HealOp from "../flows/HealOp";
import { CardPos } from "../../common/transit/CardPos";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import { CardBeingPlayedEvent, CardBeingDroppedEvent } from "../flows/Generic";
import { checkThat } from "../../common/util/Util";
import { EquipOp } from "./EquipOp";
import { ShunShou, GuoHe, WuZhong, JieDao, HuoGong, JueDou } from "./SingleRuseOp";
import { WanJian, NanMan, TieSuo, WuGu } from "./MultiRuseOp";

export default class PlayerActionResolver {

    public constructor(private readonly manager: GameManager) {
    }

    public async on(act: PlayerAction): Promise<void> {
        //skills?
        if(getFromAction(act, UIPosition.MY_SKILL).length > 0) {

        }

        //weapons?
        else if(getFromAction(act, UIPosition.MY_EQUIP).length > 0) {
            
        }


        //just card?
        else if(getFromAction(act, UIPosition.MY_HAND).length > 0) {

            let hand = getFromAction(act, UIPosition.MY_HAND)
            if(hand.length > 1) {
                throw `How can you play 2 cards at once????? ${act}`
            }
            let player = this.manager.context.getPlayer(act.actionSource)
            let card = this.manager.getCard(hand[0])
            let icard = this.manager.interpret(act.actionSource, card.id)

            // can be more than one
            let targetPs = this.getTargets(act)
            let targets = targetPs.map(p => p.player.id)
            if(targets.length > 0) {
                card.description = `${player.player.id} > ${targets.join(', ')}`
            } else {
                card.description = `${player.player.id} 使用`
            }
            this.manager.sendToWorkflow(act.actionSource, CardPos.HAND, [card], true)
            

            if(icard.type === CardType.TIE_SUO && targets.length === 0) {
                //铁索重铸算作弃置
                await this.manager.events.publish(new CardBeingDroppedEvent(act.actionSource, [[card, CardPos.HAND]]))
            } else {
                await this.manager.events.publish(new CardBeingPlayedEvent(act.actionSource, [[card, CardPos.HAND]], card.type))
            }

            //装备牌
            if(icard.type.isEquipment()) {
                card.description = `${player.player.id} 装备`
                this.manager.sendToWorkflow(act.actionSource, CardPos.HAND, [card], true, true)
                await new EquipOp(act.actionSource, card).perform(this.manager)
                return
            }

            switch(icard.type) {
                //slash
                case CardType.SLASH:
                case CardType.SLASH_FIRE:
                case CardType.SLASH_THUNDER:
                    await new PlaySlashOp(act.actionSource, targetPs, [card]).perform(this.manager)
                    break;
    
                //peach
                case CardType.PEACH:
                    //make sure target is null
                    checkThat(targets.length === 0, '桃不能直接用在别人身上')
                    let info = this.toInfo(act.actionSource)
                    this.manager.broadcast(new TextFlashEffect(act.actionSource, [], '桃'))
                    await new HealOp(info, info, 1).perform(this.manager)
                    break;
    
                //wine
                case CardType.WINE:
                    player.isDrunk = true
                    this.manager.broadcast(player, PlayerInfo.sanitize)
                    this.manager.broadcast(new TextFlashEffect(act.actionSource, [], '酒'))
                    this.manager.roundStats.forbiddenChoices.push('wine')
                    break;

                case CardType.WU_ZHONG:
                    await new WuZhong(act.actionSource, targets[0], [card]).perform(this.manager)
                    break
                case CardType.JIE_DAO:
                    await new JieDao(act.actionSource, targets, [card]).perform(this.manager)
                    break
                case CardType.GUO_HE:
                    await new GuoHe(act.actionSource, targets[0], [card]).perform(this.manager)
                    break
                case CardType.HUO_GONG:
                    await new HuoGong(act.actionSource, targets[0], [card]).perform(this.manager)
                    break
                case CardType.SHUN_SHOU:
                    await new ShunShou(act.actionSource, targets[0], [card]).perform(this.manager)
                    break
                case CardType.JUE_DOU:
                    await new JueDou(act.actionSource, targets[0], [card]).perform(this.manager)
                    break
                case CardType.TIE_SUO:
                    await new TieSuo(act.actionSource, targets, [card]).perform(this.manager)
                    break
                case CardType.WAN_JIAN:
                    await new WanJian([card], act.actionSource, CardType.WAN_JIAN, this.manager.getSortedByCurr(false)).perform(this.manager)
                    break
                case CardType.NAN_MAN:
                    await new NanMan([card], act.actionSource, CardType.WAN_JIAN, this.manager.getSortedByCurr(false)).perform(this.manager)
                    break
                case CardType.WU_GU:
                    await new WuGu([card], act.actionSource, CardType.WAN_JIAN, this.manager.getSortedByCurr(false)).perform(this.manager)
                    break
                case CardType.TAO_YUAN:
                    break

                case CardType.YI_YI:
                    break
                case CardType.ZHI_JI:
                    break
                case CardType.YUAN_JIAO:
                    break

                case CardType.LE_BU:
                    break
                case CardType.BING_LIANG:
                    break
                case CardType.SHAN_DIAN:
                    break
                
                //dodge
                case CardType.DODGE:
                case CardType.WU_XIE:
                    throw `无法直接出闪/无懈可击!! ${act}`
            }

        }

    }

    private getTargets=(act: PlayerAction): PlayerInfo[] =>{
        let targets = getFromAction(act, UIPosition.PLAYER)
        return targets.map(this.toInfo)
    }

    private toInfo=(id: string): PlayerInfo =>{
        return this.manager.context.getPlayer(id)
    }

}