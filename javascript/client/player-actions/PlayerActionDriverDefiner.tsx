import { UIPosition, PlayerUIAction, PlayerAction } from "./PlayerUIAction";
import { PlayerActionDriver, Clickability, NoActionDriver, ClickActionResult } from "./PlayerActionDriver";
import { cardManager, CardType } from "../../common/cards/Card";
import { ServerHint } from "../../common/ServerHint";
import GameClientContext from "./GameClientContext";
import Togglable from "../../common/util/Togglable";

export default class PlayerActionDriverDefiner {

    steps: Step[] = []

    constructor(private name: string){}

    /**
     * expect this step to happen before anything can happen next
     * @param area area expected of the action
     * @param atLeast the least number of cards to proceed
     * @param atMost the least number of cards to proceed
     * @param filter which can be chosen
     */
    public expectChoose(area: UIPosition, atLeast: number, atMost: number, filter: (id: string, context: GameClientContext)=>boolean): PlayerActionDriverDefiner {
        if(this.steps.find(s => s.area === area)) {
            throw `Already has defined step for position ${UIPosition[area]}`
        }
        if(atLeast > atMost) {
            throw `Whaat?`
        }
        if(atMost !== atLeast) {
            this.steps.push(new StepDataLoose(area, atLeast, atMost, filter))
        } else {
            this.steps.push(new StepDataExact(area, atLeast, filter))
        }
        return this
    }

    public build(): PlayerActionDriver {
        if(this.steps.length === 0) {
            throw `You gotta define something!`
        }
        return new StepByStepActionDriver(this.name, this.steps)
    }
}

export interface Step {
    chosen: Togglable<string>
    area: UIPosition
    filter: (id: string, context: GameClientContext)=>boolean
    //can click on this at the current stage
    canClick(id: string): boolean
    //we are at this stage and clicked on this item
    //return true if we want to proceed to next step
    onClick(id: string): boolean
    //we have passed this stage and clicked back...
    //return false if we want to keep the subsequent steps, true if we want to restart
    onRetroClick(id: string): boolean
}

export class StepDataExact implements Step {
    chosen: Togglable<string>
    constructor(public readonly area: UIPosition,
                public readonly exactly: number,
                public readonly filter: (id: string, context: GameClientContext)=>boolean) {
        this.chosen = new Togglable<string>(exactly)
    }
    canClick(id: string): boolean {
        return this.chosen.has(id) || this.chosen.size() < this.exactly
    }
    onRetroClick(id: string): boolean {
        let isChosen = this.chosen.has(id)
        if(isChosen) {
            //we are removing
            this.chosen.toggle(id)
        } else {
            //we are switching
            this.chosen.clear()
            this.chosen.toggle(id)
            if(this.exactly === 1) {
                return false
            }
        }
        return true
    }
    onClick(id: string): boolean {
        this.chosen.toggle(id)
        if(this.chosen.size() === this.exactly) {
            return true
        }
        return false
    }
}

export class StepDataLoose implements Step{
    chosen: Togglable<string>
    constructor(public readonly area: UIPosition,
                public readonly min: number, 
                public readonly max: number,
                public readonly filter: (id: string, context: GameClientContext)=>boolean) {
        this.chosen = new Togglable<string>(max)
    }
    canClick(id: string): boolean {
        return this.chosen.has(id) || this.chosen.size() < this.max
    }
    //we have passed this stage and clicked back...
    //return false if we want to keep the subsequent steps, true if we want to restart
    onRetroClick(id: string): boolean {
        let isChosen = this.chosen.has(id)
        if(isChosen || this.chosen.size() < this.max) {
            //we are removing / adding
            this.chosen.toggle(id)
        } else {
            //we are switching
            this.chosen.clear()
            this.chosen.toggle(id)
        }
        return this.chosen.size() < this.min
    }
    //we are at this stage and clicked on this item
    //return true if we want to proceed to next step
    onClick(id: string): boolean {
        //todo: usage of OK / CANCEL button
        if(this.chosen.has(id) || this.chosen.size() < this.max) {
            this.chosen.toggle(id)
        }
        //as long as it's more than minimum, we proceed to next stage
        //we can always edit this stage safely
        return this.chosen.size() >= this.min
    }
}

export class StepByStepActionDriver extends PlayerActionDriver {
    curr: number = 0

    constructor(private name: string, private steps: Step[]) {
        super()
    }

    onClicked = (action: PlayerUIAction, context: GameClientContext): ClickActionResult => {
        console.log('User Clicked on', action)
        let idx = this.getStepInConcern(action)
        let stepData = this.steps[idx]
        if(stepData !== this.steps[this.curr]) {
            console.log('This is a step already done')
            //an old step
            if(stepData.onRetroClick(action.itemId)) {
                console.log('Retro operation suggests to go back to step: ', idx)
                //clean up the subsequent choices
                for(let i = idx + 1; i <= this.curr; ++i) {
                    this.steps[i].chosen.clear()
                }
                this.curr = idx
            }
        } else {
            console.log('This is the current step')
            //we are at this stage!
            if(stepData.onClick(action.itemId)) {
                console.log('Step complete, proceeding to next step')
                this.curr += 1
                if(this.curr === this.steps.length) {
                    //finish the call!
                    let actionData: {[key in UIPosition]?: string[]} = {}
                    this.steps.forEach(s => {
                        actionData[s.area] = s.chosen.toArray()
                    })
                    let action = {
                        hintId: context.serverHint.hintId,
                        hintType: context.serverHint.hintType,
                        actionData
                    }
                    context.submitAction(action)
                    console.log('All steps done. Finishing the call', action)
                    return ClickActionResult.DONE
                }
            }
        }
        return this.curr === 0 && this.steps[this.curr].chosen.isEmpty()? ClickActionResult.AT_ZERO : ClickActionResult.PROCESSING
    }

    canBeClicked = (action: PlayerUIAction, context: GameClientContext): Clickability => {
        let stepData = this.getStepInConcernSafe(action)

        if(!stepData) {
            return Clickability.NOT_CLICKABLE
        }
        if(stepData !== this.steps[this.curr]) {
            //an old step. if we chose this or this can be chosen, allow it
            if(stepData.chosen.has(action.itemId) || stepData.filter(action.itemId, context)) {
                return Clickability.CLICKABLE
            } else {
                return Clickability.DISABLED
            }
        } else {
            //we are at this stage! make sure we don't click more than we can
            if(stepData.filter(action.itemId, context) && stepData.canClick(action.itemId)) {
                return Clickability.CLICKABLE
            } else {
                return Clickability.DISABLED
            }
        }
    }

    isSelected = (action: PlayerUIAction, context: GameClientContext): boolean => {
        let stepData = this.getStepInConcernSafe(action)
        if(!stepData) {
            return false
        }
        return stepData.chosen.has(action.itemId)
    }

    private getStepInConcernSafe = (action: PlayerUIAction): Step => {
        //find out the step for this
        return this.steps.find((s, idx) => idx <= this.curr && s.area === action.actionArea)
    }

    private getStepInConcern = (action: PlayerUIAction): number => {
        //find out the step for this
        for(let i = 0; i <= this.curr; ++i) {
            if(this.steps[i].area === action.actionArea) {
                return i
            }
        }
        throw `Step not found/reached yet!! ${action.actionArea} ${action.itemId} ${this.constructor.name}`
    }
}