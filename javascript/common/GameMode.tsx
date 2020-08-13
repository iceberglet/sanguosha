import { CardManager } from "./cards/Card";
import { IdentityWarCards } from "../game-mode-identity/IdentityWarCardSet";

export enum GameModeEnum {
    IdentityWarGame,
    FactionWarGame
}

export class GameMode {

    private static rules = new Map<GameModeEnum, GameMode>()

    public static get(name: GameModeEnum) {
        let rule = this.rules.get(name)
        if(!rule) {
            throw `Cannot find game rule! ${name}`
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
