import { Serde } from "./util/Serializer";
import { CardPos } from "./transit/CardPos";
import GameServerContext from "../server/engine/GameServerContext";

/**
 * Impact is always sent from server to client
 * Impacts are the only way to make changes to the game context
 * - includes movement of cards
 * - hp changes
 * - marks
 * - used up skils (limited skills)
 */
export default abstract class Impact {
    abstract invoke(context: GameServerContext): void
}

export class Heal extends Impact {
    //all must be public in order to be passed through serde
    public constructor(public source: string, public target: string, public amount: number){
        super()
    }

    invoke(context: GameServerContext) {
        context.getPlayer(this.target).heal(this.amount)
    }
}

export class Damage extends Impact {

    //伤害还是体力流失？
    isHurt: boolean = true

    public constructor(public source: string, public target: string, public amount: number){
        super()
    }

    invoke(context: GameServerContext) {
        context.getPlayer(this.target).damage(this.amount)
    }
}

export class CardTransfer extends Impact {

    //from one player to another
    //can also be to/from deck/dropped cards, in which case player ids would be null
    //
    public constructor(public source: string, public fromPos: CardPos, public target: string, public toPos: CardPos, public cardIds: string[]){
        super()
    }

    invoke(context: GameServerContext) {
        if(this.source) {
            this.cardIds.forEach(id => context.getPlayer(this.source).removeCard(id))
        } else {
            if(this.fromPos === CardPos.DROPPED) {
                context.deck.getCardsFromDropped(this.cardIds)
            } else {
                throw `Cannot take specific cards from this position! ${this.fromPos}`
            }
        }
        if(this.target) {
            this.cardIds.forEach(id => context.getPlayer(this.target).addCard(context.getGameMode().cardManager.getCard(id), this.toPos))
        } else {
            if(this.toPos === CardPos.DROPPED) {
                context.deck.dropped.push(...this.cardIds.map(context.getGameMode().cardManager.getCard))
            } else {
                throw `Cannot place specific cards onto this position! ${this.fromPos}`
            }
        }
    }
}

Serde.register(Heal)
Serde.register(Damage)
Serde.register(CardTransfer)