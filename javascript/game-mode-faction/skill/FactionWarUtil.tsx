import GameManager from "../../server/GameManager";
import FactionPlayerInfo from "../FactionPlayerInfo";
import { Faction } from "../../common/General";
import { PlayerInfo } from "../../common/PlayerInfo";
import { HintType } from "../../common/ServerHint";
import { UIPosition, Button } from "../../common/PlayerAction";
import { CardPos } from "../../common/transit/CardPos";
import { CardBeingDroppedEvent } from "../../server/engine/Generic";

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
export async function askAbandonBasicCard(manager: GameManager, target: PlayerInfo, msg: string, canCancel: boolean): Promise<boolean> {
    let notBasic = target.getCards(CardPos.HAND).filter(c => !c.type.isBasic()).map(c => c.id)
    let resp = await manager.sendHint(target.player.id, {
        hintType: HintType.CHOOSE_CARD,
        hintMsg: msg,
        positions: [UIPosition.MY_HAND],
        minQuantity: 1,
        quantity: 1,
        forbidden: notBasic,
        extraButtons: canCancel? [Button.CANCEL] : []
    })
    if(resp.isCancel()) {
        return false
    }
    await resp.dropCardsFromSource(this.playerId + ' 弃置')
    return true
}


export async function askAbandonEquip(manager: GameManager, target: PlayerInfo, msg: string, canCancel: boolean): Promise<boolean> {
    let nonEquip = target.getCards(CardPos.HAND).filter(c => !c.type.isEquipment()).map(c => c.id)
    let resp = await manager.sendHint(target.player.id, {
        hintType: HintType.CHOOSE_CARD,
        hintMsg: msg,
        positions: [UIPosition.MY_EQUIP, UIPosition.MY_HAND],
        minQuantity: 1,
        quantity: 1,
        forbidden: nonEquip,
        extraButtons: canCancel? [Button.CANCEL] : []
    })
    if(resp.isCancel()) {
        return false
    }
    await resp.dropCardsFromSource(this.playerId + ' 弃置')
    return true
}