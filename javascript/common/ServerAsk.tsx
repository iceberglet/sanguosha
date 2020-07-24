import { Serde } from "./util/Serializer"
import { OperationType } from "../server/Operation"
let counter = 0

export abstract class ServerAsk {
    //monotonically increasing
    askId: number

    protected constructor(
        //if multiple players are asked, individual ServerAsks will be sent
        public playerId: string,
        //if private, other players won't see this ask
        public isPrivate: boolean, 
        //message to display to the player
        public message: string) {
        this.askId = counter++
    }

    //--------- optionals ----------
    //options to choose from, to be displayed to player as multiple choice
    // options: string[]
}

/**
 * Demand user to play certain operations
 * e.g. 被杀的时候打闪
 * 被决斗的时候出杀
 * 被锦囊的时候无懈
 */
export class ServerAskOperation extends ServerAsk {
    public constructor(playerId: string, msg: string, public opType: OperationType) {
        super(playerId, true, msg)
    }
}

/**
 * Demand user whether or not to use skill
 * e.g. 受到伤害发动刚烈
 * 
 */
export class ServerAskSkill extends ServerAsk {
    public constructor(playerId: string, msg: string, public skillName: string) {
        super(playerId, true, msg)
    }
}

Serde.register(ServerAskOperation)
Serde.register(ServerAskSkill)
