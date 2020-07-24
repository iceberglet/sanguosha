import GameContext from "./GameContext"

export type PlayerResponseListener = (r: PlayerResponse, context: GameContext) => void

export abstract class PlayerResponse {
    //one response for each ask
    askId: number
    //player that gave this response
    playerId: number

}