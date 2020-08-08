export class EffectTransit {
    public constructor(public sourcePlayer: string, 
        public targetPlayers: string[], 
        public sourceText: string) {

    }
}

export class DamageEffectTransit {
    public constructor(
        public targetPlayer: string
    ) {}
}