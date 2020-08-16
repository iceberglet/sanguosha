import GameManager from "../GameManager";
import { PlayerAction, UIPosition, getFromAction } from "../../common/PlayerAction";
import Card, { CardType } from "../../common/cards/Card";
import SlashFlow from "../flows/SlashFlow";
import { PlayerInfo } from "../../common/PlayerInfo";
import HealOp from "../flows/HealOp";
import { DamageType } from "../flows/DamageOp";

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
            let card = this.manager.cardManager().getCard(getFromAction(act, UIPosition.MY_HAND)[0])
            this.manager.beforeFlowHappen.publish(card, act.actionSource)
            switch(card.type) {
                //slash
                case CardType.SLASH:
                    await new SlashFlow(act, this.getTarget(act), DamageType.NORMAL).doNext(this.manager)
                    break;
                case CardType.SLASH_FIRE:
                    await new SlashFlow(act, this.getTarget(act), DamageType.FIRE).doNext(this.manager)
                    break;
                case CardType.SLASH_THUNDER:
                    await new SlashFlow(act, this.getTarget(act), DamageType.THUNDER).doNext(this.manager)
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

    private getTarget(act: PlayerAction): PlayerInfo {
        let targets = getFromAction(act, UIPosition.PLAYER)
        if(targets.length > 1) {
            throw `Expect only one target! ${act}`
        }
        return this.toInfo(targets[0])
    }

    private toInfo(id: string): PlayerInfo {
        return this.manager.context.getPlayer(id)
    }

}


export class CardPlayedEvent {
    public constructor(public readonly act: PlayerAction) {

    }
}