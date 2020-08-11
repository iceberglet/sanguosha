import GameManager from "../GameManager";

export default abstract class GameRule {

    public abstract init(manager: GameManager): void

    public abstract isTheGameEnded(): boolean

}