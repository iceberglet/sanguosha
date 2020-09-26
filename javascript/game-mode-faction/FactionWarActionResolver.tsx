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
import { Skill } from "./skill/Skill";
import { RevealGeneralEvent } from "./FactionWarInitializer";
import PlayerAct from "../server/context/PlayerAct";
import HealOp from "../server/engine/HealOp";
import AskSavingOp from '../server/engine/AskSavingOp'
import { TextFlashEffect } from "../common/transit/EffectTransit";



export default class FactionWarActionResolver extends ActionResolver {

    skillRepo: FactionWarSkillRepo

    public register(skillRepo: FactionWarSkillRepo) {
        this.skillRepo = skillRepo
    }

    private async getSkillAndRevealIfNeeded(act: PlayerAct, manager: GameManager): Promise<Skill> {
        let skillId = act.skill
        let skill = this.skillRepo.getSkill(act.source.player.id, skillId)
        if(!skill.isRevealed) {
            await manager.events.publish(new RevealGeneralEvent(act.source.player.id, skill.isMain, !skill.isMain))
        }
        return skill
    }

    public async onSkillAction(act: PlayerAct, event: any, manager: GameManager): Promise<void> {
        if(act.skill) {
            //武将技能
            let skill = await this.getSkillAndRevealIfNeeded(act, manager)
            await skill.onPlayerAction(act, event, manager)
        } else {
            throw 'what?'
        }
    }
    
    public async onSignAction(act: PlayerAct, event: AskSavingOp, manager: GameManager): Promise<void> {
        if(act.signChosen === '珠') {
            manager.log(`${act.source} 弃置了 ${act.source.signs[act.signChosen].displayName} 标记作为桃`)
            delete act.source.signs[act.signChosen]
            manager.broadcast(act.source, PlayerInfo.sanitize)
            manager.broadcast(new TextFlashEffect(event.goodman.player.id, [event.deadman.player.id], CardType.PEACH.name))
            await new HealOp(event.goodman, event.deadman, 1).perform(manager)
        }
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

        else if(act.signChosen) {
            switch(act.signChosen) {
                case '先': 
                    await this.processXianQu(act.source, act.targets[0] as FactionPlayerInfo, act.button, manager)
                    break
                case '珠':
                    if(act.button === 'regen') {
                        await new HealOp(act.source, act.source, 1).perform(manager)
                    } else if (act.button === 'card') {
                        await new TakeCardOp(act.source, 2).perform(manager)
                    } else {
                        console.error('(珠联璧合)选择有问题！' + act.button)
                    }
                    break;
                case '鱼':
                    await new TakeCardOp(act.source, 1).perform(manager)
                    break;
                default:
                    throw `Can't handle this...` + act.signChosen
            }
            manager.log(`${act.source} 弃置了 ${act.source.signs[act.signChosen].displayName} 标记`)
            delete act.source.signs[act.signChosen]
            manager.broadcast(act.source, PlayerInfo.sanitize)
        }

        else if(act.getCardsAtPos(CardPos.HAND).length > 0) {

            let hand = act.getCardsAtPos(CardPos.HAND)
            if(hand.length > 1) {
                throw `How can you play 2 cards at once????? ${act}`
            }
            let player = act.source as FactionPlayerInfo
            let card = hand[0]
            let icard = manager.interpret(act.source.player.id, card)
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
            

            if(icard.type.isEquipment()) {
                card.description = `${player} 装备`
                manager.sendToWorkflow(act.source.player.id, CardPos.HAND, [card], true, true)
                await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, CardPos.HAND]], card.type))
                await new EquipOp(act.source, card).perform(manager)
            } else {
                manager.sendToWorkflow(act.source.player.id, CardPos.HAND, [card], true)
                if(icard.type === CardType.ZHI_JI && targets.length === 0) {
                    //知己知彼重铸算作弃置
                    await manager.events.publish(new CardBeingDroppedEvent(act.source.player.id, [[card, CardPos.HAND]]))
                } else {
                    await manager.events.publish(new CardBeingUsedEvent(act.source.player.id, [[card, CardPos.HAND]], card.type))
                }
                switch(icard.type) {
    
                    case CardType.YI_YI:
                        //find out the targets
                        await YiYiDaiLao.do([card], player, manager)
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

    private async processXianQu(source: PlayerInfo, target: FactionPlayerInfo, choice: string, manager: GameManager) {
        let curr = source.getCards(CardPos.HAND).length
        if(curr < 4) {
            await new TakeCardOp(source, 4 - curr).perform(manager)
        }
        switch(choice) {
            case 'main':
                manager.log(`(先驱) ${source} 选择观看了 ${target} 的主将`)
                // console.log(`(先驱) ${source} 选择观看了 ${target} 的主将`)
                await manager.sendHint(source.player.id, {
                    hintType: HintType.UI_PANEL,
                    hintMsg: `${target} 的主将`,
                    customRequest: {
                        data: {
                            title: `${target} 的主将`,
                            items: [target.general],
                            mode: 'general'
                        },
                        mode: 'display'
                    }
                })
                break;
            case 'sub':
                manager.log(`(先驱) ${source} 选择观看了 ${target} 的副将`)
                // console.log(`${source} 选择观看了 ${target} 的副将`)
                await manager.sendHint(source.player.id, {
                    hintType: HintType.UI_PANEL,
                    hintMsg: `${target} 的副将`,
                    customRequest: {
                        data: {
                            title: `${target} 的副将`,
                            items: [target.subGeneral],
                            mode: 'general'
                        },
                        mode: 'display'
                    }
                })
                break;
            default: 
                manager.log(`(先驱) ${source} 选择不观看`)
                // console.log(`(先驱) ${source} 选择不观看`)
        }
    }
}


export class YiYiDaiLao extends MultiRuse {


    public static async do(cards: Card[], player: PlayerInfo, manager: GameManager) {
        if(player.getFaction() === Faction.UNKNOWN || player.getFaction() === Faction.YE) {
            //just yourself
            await new YiYiDaiLao(cards, player, CardType.YI_YI, [player]).perform(manager)
        } else {
            let impact = manager.getSortedByCurr(false).filter(p => {
                player.getFaction().name === p.getFaction().name
            })
            await new YiYiDaiLao(cards, player, CardType.YI_YI, [player, ...impact]).perform(manager)
        }
    }

    public async doForOne(target: PlayerInfo, manager: GameManager): Promise<void> {
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

    public async doEffect(manager: GameManager): Promise<void> {

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

        switch(b) {
            case ZhiJiZhiBi.ZHU_JIANG:
                manager.log(`${this.source} 选择观看了 ${this.target} 的主将`)
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
                manager.log(`${this.source} 选择观看了 ${this.target} 的副将`)
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
                manager.log(`${this.source} 选择观看了 ${this.target} 的手牌`)
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

export class YuanJiao extends SingleRuse<void> {

    public constructor(public readonly source: PlayerInfo, 
        public readonly target: PlayerInfo, 
        public readonly cards: Card[]) {
        super(source, target, cards, CardType.YUAN_JIAO)
    }

    public async doEffect(manager: GameManager): Promise<void> {
        //give target one
        await new TakeCardOp(this.target, 1).perform(manager)
        //give self three
        await new TakeCardOp(this.source, 3).perform(manager)
    }
    
}