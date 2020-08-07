

export type Effect = 'slash' | 'dodge' | 'peach' | 'wine' | 'card'

export class EffectTransit {
    public constructor(public sourcePlayer: string, 
        public targetPlayers: string[], 
        public effect: Effect) {

    }
}