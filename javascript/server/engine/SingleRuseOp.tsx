import { Operation } from "../Flow";
import GameManager from "../GameManager";
import { ICard } from "../../common/cards/ICard";
import { getFromAction, PlayerAction, UIPosition } from "../../common/PlayerAction";
import { WuXieContext } from "../flows/WuXieOp";
import { HintType } from "../../common/ServerHint";

export type SingleRuse = {
    ruseAction: PlayerAction, 
    ruseCard: ICard
}

/**
 * true - 锦囊牌失效
 * @param ruse 
 * @param manager 
 */
export async function askForWuXie(ruse: SingleRuse, manager: GameManager) {
    // let target = getFromAction(act, UIPosition.PLAYER)[0]
    let target = getFromAction(ruse.ruseAction, UIPosition.PLAYER)[0]
    return new WuXieContext(manager, ruse.ruseAction, ruse.ruseCard).doOneRound(target)
}

export class ShunShou extends Operation<void> {

    public constructor(public ruseAction: PlayerAction, public ruseCard: ICard) {
        super()
    }

    public async perform(manager: GameManager) {
        if(await askForWuXie(this, manager)) {
            return
        }
        await manager.sendHint(this.ruseAction.actionSource, {
            hintType: HintType.SELECT_CARD_FROM_PLAYER,
            hintMsg: '请选择对方一张手牌',
            //todo: more options on what card to choose
        })
    }
}