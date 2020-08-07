import {Player} from "./Player";

export type PreGame = {
    players: Player[]
    //ids of the players who are seated
    seated: string[]

    config: {
        gameType: 'identity' | 'faction',
        cardPackags?: string
        generalPackages?: string
    }

}