//巧变 或者 谋断 移动场上一张牌

import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { HintType, DuoCardSelectionResult, DuoCardSelectionHint } from "../../common/ServerHint";
import { TextFlashEffect } from "../../common/transit/EffectTransit";
import { CardPos } from "../../common/transit/CardPos";
import { Card, cleanDescription } from "../../common/cards/Card";
import { EquipOp } from "./EquipOp";
import { UseDelayedRuseOp } from "./DelayedRuseOp";


const cannotMove = '无法移动'

export async function MoveCardOnField(manager: GameManager, mover: PlayerInfo, skillName: string) {

            //1. 选两个人
            let resp = await manager.sendHint(mover.player.id, {
                hintType: HintType.CHOOSE_PLAYER,
                hintMsg: '选择2名玩家移动装备/判定牌',
                minQuantity: 2,
                quantity: 2
            })
            //2. 左右都可以交换(如果左右都有武器, 则不存在, 同理防具,马,判定牌)
            let left = resp.targets[0]
            let right = resp.targets[1]
            console.log(skillName + ' 挪动者', left.player.id, right.player.id)
            manager.broadcast(new TextFlashEffect(mover.player.id, [left.player.id, right.player.id], skillName))
            let leftEquip = left.getCards(CardPos.EQUIP)
            let rightEquip = right.getCards(CardPos.EQUIP)
            let leftJudge = left.getCards(CardPos.JUDGE)
            let rightJudge = right.getCards(CardPos.JUDGE)
            markUnmovable(leftEquip, rightEquip, true)
            markUnmovable(leftJudge, rightJudge, false)
            let data: DuoCardSelectionHint = {
                title: skillName + '挪牌',
                titleLeft: left.player.id,
                titleRight: right.player.id,
                rowsOfCard: {
                    '装备区': [leftEquip, rightEquip],
                    '判定区': [leftJudge, rightJudge]
                },
                chooseSize: 1,
                canCancel: true
            }
            let exchange = (await manager.sendHint(mover.player.id, {
                hintType: HintType.UI_PANEL,
                hintMsg: '选择一张你想要移动的牌',
                customRequest: {
                    mode: 'duo-choose',
                    data
                }
            })).customData as DuoCardSelectionResult
            if(exchange.length === 0) {
                console.log('挪动 取消', exchange)
                return
            }
            let res = exchange[0]
            console.log('挪动 移动场上的牌为', res)
            
            let card: Card, source: PlayerInfo, target: PlayerInfo
            if(res.rowName === '装备区') {
                if(res.isLeft) {
                    card = leftEquip[res.idx]
                    source = left
                    target = right
                } else {
                    card = rightEquip[res.idx]
                    source = right
                    target = left
                }
                await new EquipOp(target, card, CardPos.EQUIP, source).perform(manager)
                // await manager.transferCards(source.player.id, target.player.id, CardPos.EQUIP, CardPos.EQUIP, [card])
                // await manager.events.publish(new CardObtainedEvent(source.player.id, [[card, CardPos.EQUIP]]))
            } else {
                if(res.isLeft) {
                    card = leftJudge[res.idx]
                    source = left
                    target = right
                } else {
                    card = rightJudge[res.idx]
                    source = right
                    target = left
                }
                await new UseDelayedRuseOp(card, source, CardPos.JUDGE, target).perform(manager)
            }
            manager.log(`${mover.player.id} 发动了 ${skillName} 将 ${source} 的 ${card} 移动给 ${target}`)

            //cleanup
            cleanDescription(...leftEquip, ...rightEquip, ...leftJudge, ...rightJudge)
}

function markUnmovable(left: Card[], right: Card[], isEquip: boolean) {
    cleanDescription(...left, ...right)
    left.forEach(c => {
        delete c.description
        if(isEquip) {
            let match = right.find(r => r.type.genre === c.type.genre)
            if(match) {
                c.description = cannotMove
                match.description = cannotMove
            }
        } else {
            let match = right.find(r => (r.as || r.type).id === (c.as || c.type).id)
            if(match) {
                c.description = cannotMove
                match.description = cannotMove
            }
        }
    })
}