export class TextFlashEffect {
    public constructor(public sourcePlayer: string, 
        public targetPlayers: string[], 
        public sourceText: string) {

    }
}

export class DamageEffect {
    public constructor(
        public targetPlayer: string
    ) {}
}

export class TransferCardEffect {
    public constructor(
        //if no source, it's coming from middle
        public source: string,
        //if no target, it's going to the middle
        public target: string,
        //can be dummy, which means not shown to users
        public cards: string[],
        ) {}
}