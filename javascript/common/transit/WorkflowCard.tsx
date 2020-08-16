import { CardType } from "../cards/Card";

export type WorkflowCard = {
    cardId: string,
    //方片当做乐不思蜀, 红牌当杀之类的
    as?: CardType,
    description?: string,
    //是否是弃牌
    isDropped?: boolean
}


export class WorkflowTransit {
    /**
     * 
     * @param isHead true if is head, false then is common flow
     * @param cards 
     */
    public constructor(
        public isHead: boolean,
        public cards: WorkflowCard[]
    ) {}

    public removeHead() {
        return this.isHead && (!this.cards || this.cards.length === 0)
    }
}