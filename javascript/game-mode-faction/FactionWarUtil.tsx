import GameManager from "../server/GameManager";
import FactionPlayerInfo from "./FactionPlayerInfo";
import { Faction } from "../common/General";
import { PlayerInfo } from "../common/PlayerInfo";
import { HintType } from "../common/ServerHint";
import { UIPosition, Button } from "../common/PlayerAction";
import { CardPos } from "../common/transit/CardPos";
import Multimap from "../common/util/Multimap";

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
 * 返回势力的个数
 * (注: 野势力会被归为一栏,但是并不属于同一势力)
 * @param manager 
 */
export function getFactionMembers(manager: GameManager): Multimap<Faction, PlayerInfo> {
    let revealed = manager.getSortedByCurr(true).filter(p => (p as FactionPlayerInfo).isRevealed())
    let res = new Multimap<Faction, PlayerInfo>()
    revealed.forEach(r => {
        if(r.getFaction() === Faction.UNKNOWN) {
            throw 'Not possible!!'
        }
        res.set(r.getFaction(), r)
    })
    return res
}

export function getFactionsWithLeastMembers(manager: GameManager): Set<Faction> {
    let counts = getFactionMembers(manager)
    let min = 999, minFac = new Set<Faction>()
    counts.forEach((v, k)=>{
        let count = k === Faction.YE? 1 : v.size
        if(count < min) {
            min = count
            minFac = new Set<Faction>([k])
        } else if (count === min) {
            minFac.add(k)
        }
    })
    if(minFac.size === 0) {
        throw 'Unable to determine faction with least members: ' + counts
    }
    return minFac
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
    await resp.dropCardsFromSource(target + ' 弃置')
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
    await resp.dropCardsFromSource(target.player.id + ' 弃置')
    return true
}