import GameManager from "../GameManager";
import { PlayerAction, UIPosition, getFromAction } from "../../common/PlayerAction";
import Card, { CardType } from "../../common/cards/Card";
import SlashFlow from "../flows/SlashFlow";
import { PlayerInfo } from "../../common/PlayerInfo";
import HealOp from "../flows/HealOp";
import { DamageType } from "../flows/DamageOp";
import { CardPos } from "../../common/transit/CardPos";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import { isSuitBlack } from "../../common/cards/ICard";
import { CardBeingPlayedEvent } from "../flows/Generic";
import { checkThat } from "../../common/util/Util";
import { EquipOp } from "./EquipOp";
import JueDou from "./JueDou";
import { ShunShou } from "./SingleRuseOp";

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
            this.manager.beforeFlowHappen.publish(new CardBeingPlayedEvent(act, icard), act.actionSource)

            //装备牌
            if(icard.type.isEquipment()) {
                this.manager.sendToWorkflow(act.actionSource, CardPos.HAND, [card], true, true)
                await new EquipOp(act.actionSource, this.manager.getCard(hand[0])).perform(this.manager)
                return
            } else {
                this.manager.sendToWorkflow(act.actionSource, CardPos.HAND, [card], true)
            }
            

            // can be more than one
            let targets = this.getTargets(act).map(p => p.player.id)

            switch(icard.type) {
                //slash
                case CardType.SLASH:
                    this.manager.broadcast(new TextFlashEffect(act.actionSource, targets, isSuitBlack(icard)? '杀' : '红杀'))
                    await Promise.all(this.getTargets(act).map(async t => {
                        await new SlashFlow(act, t, DamageType.NORMAL).doNext(this.manager)
                    }))
                    break;
                case CardType.SLASH_FIRE:
                    this.manager.broadcast(new TextFlashEffect(act.actionSource, targets, '火杀'))
                    await Promise.all(this.getTargets(act).map(async t => {
                        await new SlashFlow(act, t, DamageType.FIRE).doNext(this.manager)
                    }))
                    break;
                case CardType.SLASH_THUNDER:
                    this.manager.broadcast(new TextFlashEffect(act.actionSource, targets, '雷杀'))
                    await Promise.all(this.getTargets(act).map(async t => {
                        await new SlashFlow(act, t, DamageType.THUNDER).doNext(this.manager)
                    }))
                    break;
    
                //peach
                case CardType.PEACH:
                    //make sure target is null
                    checkThat(targets.length === 0, '桃不能用在多人上')
                    let info = this.toInfo(act.actionSource)
                    this.manager.broadcast(new TextFlashEffect(act.actionSource, [], '桃'))
                    await new HealOp(info, info, 1, act).perform(this.manager)
                    break;
    
                //wine
                case CardType.WINE:
                    player.isDrunk = true
                    this.manager.broadcast(player, PlayerInfo.sanitize)
                    this.manager.broadcast(new TextFlashEffect(act.actionSource, [], '酒'))
                    this.manager.roundStats.forbiddenChoices.push('wine')
                    break;

                case CardType.WU_ZHONG:
                    break
                case CardType.JIE_DAO:
                    break
                case CardType.GUO_HE:
                    break
                case CardType.SHUN_SHOU:
                    await new ShunShou(act, icard).perform(this.manager)
                    break
                case CardType.JUE_DOU:
                    await new JueDou(act, icard).perform(this.manager)
                    break

                    
                case CardType.WAN_JIAN:
                    break
                case CardType.NAN_MAN:
                    break
                case CardType.WU_GU:
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