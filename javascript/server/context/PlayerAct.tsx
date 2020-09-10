import { PlayerAction, UIPosition, Button } from "../../common/PlayerAction";
import GameManager from "../GameManager";
import { PlayerInfo } from "../../common/PlayerInfo";
import { CardPos } from "../../common/transit/CardPos";
import Card from "../../common/cards/Card";
import { ServerHint } from "../../common/ServerHint";

export default class PlayerAct {

    public readonly source: PlayerInfo
    public readonly targets: PlayerInfo[]
    public readonly skill: string
    public readonly button: string
    public readonly cards: Map<CardPos, Card[]>
    public readonly cardsAndPos: Array<[Card, CardPos]>
    public readonly serverHint: ServerHint
    public readonly customData: any

    public constructor(action: PlayerAction, manager: GameManager) {
        this.serverHint = action.serverHint
        this.customData = action.customData
        this.source = manager.context.getPlayer(action.actionSource)
        this.cards = new Map<CardPos, Card[]>();
        this.cardsAndPos = [];
        this.targets = [];

        //there should always just be one single button!!
        if(!action.actionData) {
            //some custom action this is
            return
        }
        this.button = tryGetSingle(action.actionData[UIPosition.BUTTONS])
        this.skill = tryGetSingle(action.actionData[UIPosition.MY_SKILL])
        if(action.actionData[UIPosition.PLAYER]) {
            this.targets = action.actionData[UIPosition.PLAYER].map(p => manager.context.getPlayer(p))
        }
        
        [UIPosition.MY_EQUIP, UIPosition.MY_HAND, UIPosition.MY_JUDGE].forEach((uiPos: UIPosition) => {
            if(action.actionData[uiPos] && action.actionData[uiPos].length > 0) {
                let cards: Card[] = action.actionData[uiPos].map(c => manager.getCard(c))
                let pos = mapToCardPos(uiPos)
                this.cards.set(pos, cards)
                cards.forEach(card => {
                    delete card.as
                    delete card.description
                    this.cardsAndPos.push([card, pos])
                })
            }
        })
        
    }

    public isCancel() {
        return this.button === Button.CANCEL.id
    }

    public getCardsAndPos(...pos: CardPos[]): Array<[CardPos, Card[]]> {
        let res: Array<[CardPos, Card[]]> = []
        pos.forEach(p => {
            let arr = this.getCardsAtPos(p)
            if(arr.length > 0) {
                res.push([p, arr])
            }
        })
        return res
    }

    public getCardsAtPos(pos: CardPos): Card[] {
        return this.cards.get(pos) || []
    }

    public getSingleCardAndPos(): [Card, CardPos] {
        if(this.cardsAndPos.length !== 1) {
            throw 'Player Action is not a single card! ' + this.cardsAndPos
        }
        return this.cardsAndPos[0]
    }

    public toString(): string {
        return `PlayAct {${this.source} > ${this.targets}}
            ${this.cards}
            ${this.skill} > ${this.button}
        `
    }
}

function tryGetSingle<T>(arr: T[]): T {
    if(arr && arr.length > 0) {
        if(arr.length > 1) {
            throw 'More than one item in array! ' + arr
        }
        return arr[0]
    }
}

function mapToCardPos(ui: UIPosition): CardPos {
    switch(ui) {
        case UIPosition.MY_EQUIP: return CardPos.EQUIP
        case UIPosition.MY_HAND: return CardPos.HAND
        case UIPosition.MY_JUDGE: return CardPos.JUDGE
        default: throw 'Cannot map ' + UIPosition[ui]
    }
}