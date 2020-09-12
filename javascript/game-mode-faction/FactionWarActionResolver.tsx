import { UIPosition, Button } from "../common/PlayerAction";
import GameManager from "../server/GameManager";
import { ActionResolver } from "../server/context/PlayerActionResolver";
import { CardPos } from "../common/transit/CardPos";
import { CardBeingUsedEvent, CardBeingDroppedEvent } from "../server/engine/Generic";
import Card, { CardType } from "../common/cards/Card";
import { SingleRuse } from "../server/engine/SingleRuseOp";
import TakeCardOp from "../server/engine/TakeCardOp";
import FactionPlayerInfo from "./FactionPlayerInfo";
import { HintType } from "../common/ServerHint";
import { MultiRuse } from "../server/engine/MultiRuseOp";
import { PlayerInfo } from "../common/PlayerInfo";
import { DropCardRequest } from "../server/engine/DropCardOp";
import { Faction } from "../common/General";
import { EquipOp } from "../server/engine/EquipOp";
import FactionWarSkillRepo from "./skill/FactionWarSkillRepo";
import DodgeOp from "../server/engine/DodgeOp";
import { SimpleConditionalSkill, Skill } from "./skill/Skill";
import { RevealEvent } from "./FactionWarInitializer";
import { AskForSlashOp } from "../server/engine/SlashOp";
import PlayerAct from "../server/context/PlayerAct";



export default class FactionWarActionResolver extends ActionResolver {

    skillRepo: FactionWarSkillRepo

    public register(skillRepo: FactionWarSkillRepo) {
        this.skillRepo = skillRepo
    }

    private async getSkillAndRevealIfNeeded(act: PlayerAct, manager: GameManager): Promise<Skill> {
        let skillId = act.skill
        let skill = this.skillRepo.getSkill(act.source.player.id, skillId)
        if(!skill.isRevealed) {
            await manager.events.publish(new RevealEvent(act.source.player.id, skill.isMain, !skill.isMain))
        }
        return skill
    }

    public async onAskingForSlash(act: PlayerAct, askForSlashOp: AskForSlashOp, manager: GameManager): Promise<boolean> {
        if(act.skill) {
            //武将技能
            let skill = await this.getSkillAndRevealIfNeeded(act, manager)
            await skill.onPlayerAction(act, askForSlashOp, manager)
            return true
        }
        return false
    }

    public async onDodge(act: PlayerAct, dodgeOp: DodgeOp, manager: GameManager): Promise<boolean> {
        if(act.skill) {
            //武将技能
            let skill = await this.getSkillAndRevealIfNeeded(act, manager)
            await skill.onPlayerAction(act, dodgeOp, manager)
            return true
        }
        return false
    } 
    
    public async on(act: PlayerAct, manager: GameManager): Promise<boolean> {
        //skills?
        if(act.skill) {
            //武将技能
            let skill = await this.getSkillAndRevealIfNeeded(act, manager)
            //no event...
            await skill.onPlayerAction(act, null, manager)
            return true
        }

        //weapons?
        else if(act.getCardsAtPos(CardPos.EQUIP).length > 0) {
            //吴六剑 + 三尖两刃刀 都是没有主动技能的!
            //还给parent resolver
            return false
        }

        else if(act.getCardsAtPos(CardPos.HAND).length > 0) {

            let hand = act.getCardsAtPos(CardPos.HAND)
            if(hand.length > 1) {
                throw `How can you play 2 cards at once????? ${act}`
            }
            let player = act.source as FactionPlayerInfo
            let card = hand[0]
            let icard = act.source.cardInterpreter(card)
            if(icard.type.package !== '国战') {
                return false
            }

            // can be more than one
            let targetPs = act.targets
            let targets = targetPs.map(p => p.player.id)
            if(targets.length > 0) {
                card.description = `${player.player.id} > ${targets.join(', ')}`
            } else {
                card.description = `${player.player.id} 使用`
            }
            
            if(icard.type === CardType.ZHI_JI && targets.length === 0) {
                //知己知彼重铸算作弃置
                await manager.events.publish(new CardBeingDroppedEvent(act.source.player.id, [[card, CardPos.HAND]]))
            } else {
                await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, CardPos.HAND]], card.type))
            }

            if(icard.type.isEquipment()) {
                card.description = `${player} 装备`
                manager.sendToWorkflow(act.source.player.id, CardPos.HAND, [card], true, true)
                await new EquipOp(act.source, card).perform(manager)
            } else {
                manager.sendToWorkflow(act.source.player.id, CardPos.HAND, [card], true)
                switch(icard.type) {
    
                    case CardType.YI_YI:
                        //find out the targets
                        if(player.getFaction() === Faction.UNKNOWN || player.getFaction() === Faction.YE) {
                            //just yourself
                            await new YiYiDaiLao([card], act.source, CardType.YI_YI, [player]).perform(manager)
                        } else {
                            let impact = manager.getSortedByCurr(false).filter(p => {
                                player.getFaction().name === p.getFaction().name
                            })
                            await new YiYiDaiLao([card], act.source, CardType.YI_YI, [player, ...impact]).perform(manager)
                        }
                        break
                    case CardType.ZHI_JI:
                        if(targets.length > 0) {
                            await new ZhiJiZhiBi(act.source, targetPs[0], [card]).perform(manager)
                        } else {
                            await new TakeCardOp(manager.context.getPlayer(act.source.player.id), 1).perform(manager)
                        }
                        break
                    case CardType.YUAN_JIAO:
                        await new YuanJiao(act.source, targetPs[0], [card]).perform(manager)
                        break
                    default:
                        throw '未知国战牌:' + card.id
                }
            }

            return true
        }

        return false
    }

}


class YiYiDaiLao extends MultiRuse {

    public async doPerform(target: PlayerInfo, manager: GameManager): Promise<void> {
        await new TakeCardOp(target, 2).perform(manager)
        await new DropCardRequest().perform(target.player.id, 2, manager, '(以逸待劳) 请弃置2张牌', [UIPosition.MY_HAND, UIPosition.MY_EQUIP])
    }
}

export class ZhiJiZhiBi extends SingleRuse<void> {

    static ZHU_JIANG = 'general'
    static FU_JIANG = 'subGeneral'
    static SHOU_PAI = 'hand'

    public constructor(public readonly source: PlayerInfo, 
                        public readonly target: PlayerInfo, 
                        public readonly cards: Card[]
                        ) {
        super(source, target, cards, CardType.ZHI_JI)
    }

    public async doPerform(manager: GameManager): Promise<void> {

        //ask what to get...
        let targetP = this.target as FactionPlayerInfo
        let buttons: Button[] = []
        buttons.push(new Button(ZhiJiZhiBi.ZHU_JIANG, '观看主将', !targetP.isGeneralRevealed))
        buttons.push(new Button(ZhiJiZhiBi.FU_JIANG, '观看副将', !targetP.isSubGeneralRevealed))
        buttons.push(new Button(ZhiJiZhiBi.SHOU_PAI, '观看手牌', targetP.getCards(CardPos.HAND).length > 0))
        
        let resp = await manager.sendHint(this.source.player.id, {
            hintType: HintType.MULTI_CHOICE,
            hintMsg: '请选择一项',
            extraButtons: buttons
        })

        let b = resp.button

        //todo!!!
        switch(b) {
            case ZhiJiZhiBi.ZHU_JIANG:
                console.log(`${this.source} 选择观看了 ${this.target} 的主将`)
                await manager.sendHint(this.source.player.id, {
                    hintType: HintType.UI_PANEL,
                    hintMsg: `${this.target} 的主将`,
                    customRequest: {
                        data: {
                            title: `${this.target} 的主将`,
                            items: [targetP.general],
                            mode: 'general'
                        },
                        mode: 'display'
                    }
                })
                break;
            case ZhiJiZhiBi.FU_JIANG:
                console.log(`${this.source} 选择观看了 ${this.target} 的副将`)
                await manager.sendHint(this.source.player.id, {
                    hintType: HintType.UI_PANEL,
                    hintMsg: `${this.target} 的副将`,
                    customRequest: {
                        data: {
                            title: `${this.target} 的副将`,
                            items: [targetP.subGeneral],
                            mode: 'general'
                        },
                        mode: 'display'
                    }
                })
                break;
            case ZhiJiZhiBi.SHOU_PAI:
                console.log(`${this.source} 选择观看了 ${this.target} 的手牌`)
                await manager.sendHint(this.source.player.id, {
                    hintType: HintType.UI_PANEL,
                    hintMsg: `${this.target} 的手牌`,
                    customRequest: {
                        data: {
                            title: `${this.target} 的手牌`,
                            items: targetP.getCards(CardPos.HAND),
                            mode: 'card'
                        },
                        mode: 'display'
                    }
                })
                break;
            default:
                throw 'Unknown choice! ' + b
        }
    }
}

class YuanJiao extends SingleRuse<void> {

    public constructor(public readonly source: PlayerInfo, 
        public readonly target: PlayerInfo, 
        public readonly cards: Card[]) {
        super(source, target, cards, CardType.YUAN_JIAO)
    }

    public async doPerform(manager: GameManager): Promise<void> {
        //give target one
        await new TakeCardOp(this.target, 1).perform(manager)
        //give self three
        await new TakeCardOp(this.source, 3).perform(manager)
    }
    
}