import { CardManager } from "./cards/Card";
import { IdentityWarCards } from "../game-mode-identity/IdentityWarCardSet";
import { FactionWarCards } from "../game-mode-faction/FactionWarCardSet";
import FactionWarActionResolver from "../game-mode-faction/FactionWarActionResolver";
import { ActionResolver } from "../server/engine/PlayerActionResolver";
import GameManager from "../server/GameManager";
import FactionWarInitializer from "../game-mode-faction/FactionWarInitializer";

export enum GameModeEnum {
    IdentityWarGame,
    FactionWarGame
}

export interface Initializer {
    init(manager: GameManager): void
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
                        public readonly initializer: Initializer) {
        GameMode.rules.set(id, this)
    }

    // public abstract init(manager: GameManager): void

    // public abstract isTheGameEnded(): boolean
}

new GameMode(GameModeEnum.IdentityWarGame, '身份局', IdentityWarCards, null, null)
new GameMode(GameModeEnum.FactionWarGame, '国战', FactionWarCards, new FactionWarActionResolver(), new FactionWarInitializer())
