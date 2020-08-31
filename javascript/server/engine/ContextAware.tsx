import GameManager from "../GameManager";

export interface ContextAware {

    onGameLoad(manager: GameManager): void

}