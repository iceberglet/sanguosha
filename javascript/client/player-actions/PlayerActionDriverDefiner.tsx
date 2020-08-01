import { UIPosition, PlayerUIAction, Button, PlayerAction } from "./PlayerUIAction";
import { PlayerActionDriver, Clickability, ClickActionResult } from "./PlayerActionDriver";
import GameClientContext from "./GameClientContext";
import Togglable from "../../common/util/Togglable";
import { ServerHint } from "../../common/ServerHint";

const ABORT_BUTTON_ID = 'abort'

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
    public expectChoose(area: UIPosition, atLeast: number, atMost: number, 
                        filter: (id: string, context: GameClientContext)=>boolean,
                        msgObtainer: (context: GameClientContext)=>string = ()=>''): PlayerActionDriverDefiner {
        if(this.steps.find(s => s.area === area)) {
            throw `Already has defined step for position ${UIPosition[area]}`
        }
        if(atLeast > atMost) {
            throw `Whaat?`
        }
        if(atMost !== atLeast) {
            this.steps.push(new StepDataLoose(area, atLeast, atMost, filter, msgObtainer))
        } else {
            this.steps.push(new StepDataExact(area, atLeast, filter, msgObtainer))
        }
        if(this.steps.length === 1) {
            //默认一开始没法子cancel. (cancel啥子??)
            this.steps[0].canCancel = false
        }
        return this
    }

    public expectAnyButton(msg: string) {
        return this.expectChoose(UIPosition.BUTTONS, 1, 1, b=>true, (c)=>msg)
    }

    public cannotCancel(): PlayerActionDriverDefiner {
        this.steps[this.steps.length - 1].canCancel = false
        return this
    }

    public build(serverHint: ServerHint, buttons: Button[] = [Button.OK, Button.CANCEL]): PlayerActionDriver {
        if(this.steps.length === 0) {
            throw `You gotta define something!`
        }
        if(serverHint) {
            buttons = [...buttons, new Button(ABORT_BUTTON_ID, serverHint.abortButtonMsg)]
        }
        return new StepByStepActionDriver(this.name, this.steps, buttons)
    }
}

export interface Step {
    chosen: Togglable<string>
    area: UIPosition
    canCancel: boolean
    msgObtainer: (context: GameClientContext)=>string
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
    canCancel: boolean = true
    constructor(public readonly area: UIPosition,
                public readonly exactly: number,
                public readonly filter: (id: string, context: GameClientContext)=>boolean,
                public readonly msgObtainer: (context: GameClientContext)=>string) {
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

export class StepDataLoose implements Step {
    chosen: Togglable<string>
    canCancel: boolean = true
    constructor(public readonly area: UIPosition,
                public readonly min: number, 
                public readonly max: number,
                public readonly filter: (id: string, context: GameClientContext)=>boolean,
                public readonly msgObtainer: (context: GameClientContext)=>string) {
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

    constructor(private name: string, private steps: Step[], private buttons: Button[]) {
        super()
    }

    getUsableButtons() {
        return this.buttons
    }

    onClicked = (action: PlayerUIAction, context: GameClientContext): ClickActionResult => {
        console.log('[Player Action] Clicked on', action)
        //if we clicked on abort:
        if(action.actionArea === UIPosition.BUTTONS) {
            if(action.itemId === ABORT_BUTTON_ID) {
                //abort sends a message to server
                let actionToServer: PlayerAction = {
                    hintId: context.serverHint.hintId,
                    hintType: context.serverHint.hintType,
                    actionData: {
                        [UIPosition.BUTTONS]: [ABORT_BUTTON_ID]
                    }
                }
                context.submitAction(actionToServer)
                console.log('[Player Action] Aborted. Back to server', actionToServer)
                return ClickActionResult.DONE
            } else if (action.itemId === Button.CANCEL.id) {
                //cancel will return to origin
                this.cleanUpState(0)
                this.curr = 0
                return ClickActionResult.AT_ZERO
            }
        }

        let idx = this.getStepInConcern(action)
        let stepData = this.steps[idx]
        if(stepData !== this.currentStep()) {
            console.log('[Player Action] This is a step already done')
            //an old step
            if(stepData.onRetroClick(action.itemId)) {
                console.log('[Player Action] Retro operation suggests to go back to step: ', idx)
                //clean up the subsequent choices
                this.cleanUpState(idx + 1)
                this.curr = idx
            }
        } else {
            console.log('[Player Action] This is the current step')
            //we are at this stage!
            if(stepData.onClick(action.itemId)) {
                console.log('[Player Action] Step complete, proceeding to next step')
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
                    console.log('[Player Action] All steps done. Finishing the call')
                    context.submitAction(action)
                    return ClickActionResult.DONE
                }
            }
        }
        return this.curr === 0 && this.currentStep().chosen.isEmpty()? ClickActionResult.AT_ZERO : ClickActionResult.PROCESSING
    }

    canBeClicked = (action: PlayerUIAction, context: GameClientContext): Clickability => {
        if(action.actionArea === UIPosition.BUTTONS) {
            if(action.itemId === ABORT_BUTTON_ID) {
                return Clickability.CLICKABLE
            } else if (action.itemId === Button.CANCEL.id) {
                console.log('Can Cancel? ', this.curr, this.currentStep())
                return this.currentStep().canCancel? Clickability.CLICKABLE : Clickability.DISABLED
            }
        }
        let stepData = this.getStepInConcernSafe(action)

        if(!stepData) {
            return Clickability.NOT_CLICKABLE
        }
        if(stepData !== this.currentStep()) {
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

    getHintMsg(context: GameClientContext): string {
        return this.currentStep().msgObtainer(context)
    }

    private cleanUpState(from: number) {
        for(let i = from; i <= this.curr; ++i) {
            this.steps[i].chosen.clear()
        }
    }

    private currentStep() {
        return this.steps[this.curr]
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