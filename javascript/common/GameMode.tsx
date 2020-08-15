import { CardManager } from "./cards/Card";
import { IdentityWarCards } from "../game-mode-identity/IdentityWarCardSet";
import { FactionWarCards } from "../game-mode-faction/FactionWarCardSet";

export enum GameModeEnum {
    IdentityWarGame,
    FactionWarGame
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

    public constructor(public readonly id: GameModeEnum, public readonly name: string, public readonly cardManager: CardManager) {
        GameMode.rules.set(id, this)
    }

    // public abstract init(manager: GameManager): void

    // public abstract isTheGameEnded(): boolean
}

new GameMode(GameModeEnum.IdentityWarGame, '身份局', IdentityWarCards)
new GameMode(GameModeEnum.FactionWarGame, '身份局', FactionWarCards)
