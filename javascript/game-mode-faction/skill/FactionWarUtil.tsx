import GameManager from "../../server/GameManager";
import FactionPlayerInfo from "../FactionPlayerInfo";
import { Faction } from "../../common/General";
import { PlayerInfo } from "../../common/PlayerInfo";
import PlayerAct from "../../server/context/PlayerAct";
import { HintType } from "../../common/ServerHint";
import { UIPosition, Button } from "../../common/PlayerAction";
import { CardPos } from "../../common/transit/CardPos";

export function getNumberOfFactions(manager: GameManager): number {
    let revealed = manager.getSortedByCurr(true).filter(p => (p as FactionPlayerInfo).isRevealed())
    let count = 0
    let facs = new Set<string>()
    revealed.forEach(r => {
        if(r.getFaction() === Faction.UNKNOWN) {
            throw 'Not possible!!'
        } else if (r.getFaction() === Faction.YE) {
            count++
        } else {
            facs.add(r.getFaction().name)
        }
    })
    return facs.size + count
}

/**
 * Return 是否按要求弃置了牌
 * @param manager 
 * @param target 
 * @param canCancel 
 */
export async function askAbandonBasicCard(manager: GameManager, target: PlayerInfo, canCancel: boolean): Promise<boolean> {
    let notBasic = target.getCards(CardPos.HAND).filter(c => !c.type.isBasic()).map(c => c.id)
    let resp = await manager.sendHint(target.player.id, {
        hintType: HintType.CHOOSE_CARD,
        hintMsg: '请弃置一张基本牌',
        positions: [UIPosition.MY_HAND],
        minQuantity: 1,
        quantity: 1,
        forbidden: notBasic,
        extraButtons: canCancel? [Button.CANCEL] : []
    })
    if(resp.isCancel()) {
        return false
    }
    manager.sendToWorkflow(target.player.id, CardPos.HAND, resp.getCardsAtPos(CardPos.HAND)
                                                            .map(c => {c.description = target.player.id + ' 弃置'; return c}))
    return true
}


export async function askAbandonEquip(manager: GameManager, target: PlayerInfo, canCancel: boolean): Promise<boolean> {
    let nonEquip = target.getCards(CardPos.HAND).filter(c => !c.type.isEquipment()).map(c => c.id)
    let resp = await manager.sendHint(target.player.id, {
        hintType: HintType.CHOOSE_CARD,
        hintMsg: '请弃置一张装备牌',
        positions: [UIPosition.MY_EQUIP, UIPosition.MY_HAND],
        minQuantity: 1,
        quantity: 1,
        forbidden: nonEquip,
        extraButtons: canCancel? [Button.CANCEL] : []
    })
    if(resp.isCancel()) {
        return false
    }
    let result = resp.getSingleCardAndPos()
    result[0].description = target.player.id + ' 弃置'
    manager.sendToWorkflow(target.player.id, result[1], [result[0]])
    return true
}