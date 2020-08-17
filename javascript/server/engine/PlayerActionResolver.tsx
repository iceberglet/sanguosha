import GameManager from "../GameManager";
import { PlayerAction, UIPosition, getFromAction } from "../../common/PlayerAction";
import Card, { CardType } from "../../common/cards/Card";
import SlashFlow from "../flows/SlashFlow";
import { PlayerInfo } from "../../common/PlayerInfo";
import HealOp from "../flows/HealOp";
import { DamageType } from "../flows/DamageOp";
import WuXieOp from "../flows/WuXieOp";
import { CardPos } from "../../common/transit/CardPos";
import { TextFlashEffect } from "../../common/transit/EffectTransit";

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
            let card = this.manager.cardManager().getCard(hand[0])
            this.manager.sendToWorkflow(act.actionSource, CardPos.HAND, [{cardId: hand[0], source: act.actionSource}], true)
            this.manager.beforeFlowHappen.publish(card, act.actionSource)
            
            if(card.type.genre === 'single-immediate-ruse') {
                let target = getFromAction(act, UIPosition.PLAYER)[0]
                if(!await new WuXieOp(this.manager.context.getPlayer(target), card.type).perform(this.manager)) {
                    //this card is shet now, go home dude
                    return;
                }
            }

            let targets = this.getTargets(act).map(p => p.player.id)

            switch(card.type) {
                //slash
                case CardType.SLASH:
                    this.manager.broadcast(new TextFlashEffect(act.actionSource, targets, '杀'))
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
                    let info = this.toInfo(act.actionSource)
                    await new HealOp(info, info, 1, act).perform(this.manager)
                    break;
    
                //wine
                case CardType.WINE:
                    let p = this.manager.context.getPlayer(act.actionSource)
                    p.isDrunk = true
                    this.manager.broadcast(p, PlayerInfo.sanitize)
                    this.manager.roundStats.forbiddenChoices.push('wine')
                    break;

                case CardType.WU_ZHONG:

                case CardType.JIE_DAO:

                case CardType.GUO_HE:

                case CardType.SHUN_SHOU:


                    
                case CardType.WAN_JIAN:

                case CardType.NAN_MAN:

                case CardType.WU_GU:

                case CardType.TAO_YUAN:


                case CardType.YI_YI:

                case CardType.ZHI_JI:

                case CardType.YUAN_JIAO:


                case CardType.LE_BU:

                case CardType.BING_LIANG:

                case CardType.SHAN_DIAN:

                
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


export class CardPlayedEvent {
    public constructor(public readonly act: PlayerAction) {

    }
}