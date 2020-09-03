export interface GameHoster {

    init(): void

    onPlayerConnected(p: string): void

}