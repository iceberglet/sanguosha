import Flow from "../Flow";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { PlayerAction } from "../../common/PlayerAction";

export default class DamageFlow extends Flow {

    public constructor(public source: PlayerInfo, 
        public target: PlayerInfo, 
        public amount: number,
        public cause: PlayerAction) {
        super()
    }


    public doNext(manager: GameManager): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

    
}