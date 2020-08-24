import Card from "../cards/Card"
import { Stage } from "../Stage"
import { CardPos, isCardPosHidden } from "./CardPos"

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
        public stage: Stage,
        public pendingUser: Set<string>
    ) {}
}

export class CardTransit {

    public static WORKFLOW = 'workflow'
    public static DECK = 'deck'

    public static toWorkflow(player: string, pos: CardPos, cards: Card[], head: boolean, doNotRemove: boolean) {
        return new CardTransit(player, pos, CardTransit.WORKFLOW, null, cards, 600, head, doNotRemove)
    }

    public static fromWorkflow(player: string, pos: CardPos, cards: Card[]) {
        return new CardTransit(CardTransit.WORKFLOW, CardPos.WORKFLOW, player, pos, cards, 600)
    }

    public static fromDeck(player: string, cards: Card[]) {
        return new CardTransit(CardTransit.DECK, CardPos.DECK_TOP, player, CardPos.HAND, cards, 1200)
    }

    /**
     * Default Sanitization Logic
     * Cards are sanitized if the observer is not recipient or receiver, and the cards are exclusively on the hands
     * @param transit 
     * @param toPlayer 
     */
    public static defaultSanitize(transit: CardTransit, toPlayer: string) {
        if(toPlayer !== transit.from && toPlayer !== transit.to && isCardPosHidden(transit.fromPos) && isCardPosHidden(transit.toPos)) {
            return new CardTransit(transit.from, transit.fromPos, transit.to, transit.toPos, 
                                    transit.cards.map(c => Card.DUMMY), transit.animDurationSeconds)
        }
        return transit
    }


    public constructor(
        public from : string,
        public fromPos: CardPos,
        public to : string,
        public toPos: CardPos,
        public cards: Card[],
        public animDurationSeconds: number,
        public head: boolean = false,
        /**
         * Only workflow may remove this
         */
        public doNotRemove: boolean = false
    ) {}
}