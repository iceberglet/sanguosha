import { CardManager } from "./cards/Card";
import { IdentityWarCards } from "../game-mode-identity/IdentityWarCardSet";
import { FactionWarCards } from "../game-mode-faction/FactionWarCardSet";
import FactionWarActionResolver from "../game-mode-faction/FactionWarActionResolver";
import { ActionResolver } from "../server/engine/PlayerActionResolver";
import GameManager from "../server/GameManager";
import { GameHoster } from "../server/GameHoster";
import FactionWarGameHoster from "../game-mode-faction/FactionWarGameHoster";
import { PlayerRegistry } from "../server/PlayerRegistry";
import { GameModeEnum } from "./GameModeEnum";
import { Skill } from "../game-mode-faction/skill/Skill";
import { FactionSkillProviders } from "../game-mode-faction/skill/FactionWarSkillRepo";


export interface Initializer {
    
    /**
     * initialize game manager after
     * @param manager 
     */
    init(manager: GameManager): void


    initClient(): void
}

export class GameMode {

    private static rules = new Map<GameModeEnum, GameMode>()

    public static get(name: GameModeEnum) {
        let rule = this.rules.get(name)
        if(!rule) {
            throw `Cannot find game mode! ${name}`
        }
        return rule
    }

    public constructor(public readonly id: GameModeEnum, 
                        public readonly name: string, 
                        public readonly cardManager: CardManager,
                        public readonly resolver: ActionResolver,
                        public readonly gameHosterProvider: (registry: PlayerRegistry, no: number)=>GameHoster,
                        public readonly skillProvider: (skillId: string, playerId: string)=>Skill<any>) {
        GameMode.rules.set(id, this)
    }

    // public abstract init(manager: GameManager): void

    // public abstract isTheGameEnded(): boolean
}

new GameMode(GameModeEnum.IdentityWarGame, '身份局', IdentityWarCards, 
                null, null, null)
new GameMode(GameModeEnum.FactionWarGame, '国战', FactionWarCards, 
                new FactionWarActionResolver(),
                (registry, no) => new FactionWarGameHoster(registry, no),
                (s, p)=>FactionSkillProviders.get(s, p))
