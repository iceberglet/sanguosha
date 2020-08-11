import Card from "../cards/Card"
import { Serde } from "../util/Serializer"
import { Stage } from "../Stage"

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

export class CurrentPlayerEffect {
    public constructor(
        public player: string,
        public stage: Stage
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
    
    static toTransit(effect: TransferCardEffect, player: string) {
        if(player === effect.source || player === effect.target) {
            return effect
        } else {
            return new TransferCardEffect(effect.source, effect.target, effect.cards.map(c => Card.DUMMY.id))
        }
    }
}

Serde.register(TextFlashEffect)
Serde.register(DamageEffect)
Serde.register(TransferCardEffect)
Serde.register(CurrentPlayerEffect)