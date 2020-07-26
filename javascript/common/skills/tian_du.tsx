import { Ability } from "../SkillManager";
import { PlayerActionDriver } from "../../client/player-actions/PlayerAction";

class TianDu extends Ability {

    constructor(){
        super('tiandu', '天妒', '当你的判定牌生效后，你可以获得此牌。')
    }

    createDriver(): PlayerActionDriver {
        return null
    }
}

new TianDu()