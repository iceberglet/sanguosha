import { Skill } from "../SkillManager";
import GameContext from "../GameContext";
import { PlayerInfo } from "../PlayerInfo";

class TianDu extends Skill {

    constructor(){
        super('tiandu', '天妒', '当你的判定牌生效后，你可以获得此牌。')
    }

    public onMount(context: GameContext, playerInfo: PlayerInfo): void {
        throw new Error("Method not implemented.");
    }
    public onDismount(context: GameContext, playerInfo: PlayerInfo): void {
        throw new Error("Method not implemented.");
    }
    
}

class YiJi extends Skill {

    constructor(){
        super('yiji', '遗计', '当你受到1点伤害后，你可以观看牌堆顶的两张牌，然后将这些牌交给任意角色。')
    }

    public onMount(context: GameContext, playerInfo: PlayerInfo): void {
        throw new Error("Method not implemented.");
    }
    public onDismount(context: GameContext, playerInfo: PlayerInfo): void {
        throw new Error("Method not implemented.");
    }
}

new TianDu()
new YiJi()