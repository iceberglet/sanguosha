import { UIPosition, PlayerUIAction, Button, PlayerAction, isPositionForCard } from "../../common/PlayerAction";
import { PlayerActionDriver, Clickability, ClickActionResult } from "./PlayerActionDriver";
import GameClientContext from "../GameClientContext";
import { TogglableMap } from "../../common/util/Togglable";
import { ServerHint, isDirectButton } from "../../common/ServerHint";


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
    public expectChoose(areas: UIPosition[], atLeast: number, atMost: number, 
                        filter: (id: string, context: GameClientContext, existing: string[])=>boolean,
                        msgObtainer: (context: GameClientContext)=>string = ()=>''): PlayerActionDriverDefiner {
        areas.forEach(a => {
            if(this.steps.find(s => s.isConcernedWith(a))) {
                throw `Already has defined step for position ${UIPosition[a]}`
            }
        })
        if(atLeast > atMost) {
            throw `Whaat?`
        }
        if(atMost !== atLeast) {
            this.steps.push(new StepDataLoose(areas, atLeast, atMost, filter, msgObtainer))
        } else {
            this.steps.push(new StepDataExact(areas, atLeast, filter, msgObtainer))
        }
        if(this.steps.length === 1) {
            //默认一开始没法子cancel. (cancel啥子??)
            this.steps[0].canCancel = false
        }
        return this
    }

    public expectAnyButton(msg: string) {
        return this.expectChoose([UIPosition.BUTTONS], 1, 1, b=>true, (c)=>msg)
    }

    public cannotCancel(): PlayerActionDriverDefiner {
        this.steps[this.steps.length - 1].canCancel = false
        return this
    }

    public noBacksie(): PlayerActionDriverDefiner {
        this.steps[this.steps.length - 1].noBacksie = true
        return this
    }


    public build(serverHint: ServerHint, buttons: Button[] = [Button.OK, Button.CANCEL]): PlayerActionDriver {
        if(this.steps.length === 0) {
            throw `You gotta define something!`
        }
        if(serverHint.extraButtons) {
            buttons = [...buttons, ...serverHint.extraButtons]
        }
        return new StepByStepActionDriver(this.name, this.steps, buttons)
    }
}

interface Step {
    areas: UIPosition[]
    chosen: TogglableMap<string, UIPosition>
    canCancel: boolean
    //cannot go back by clicking on some other cards
    noBacksie: boolean
    msgObtainer: (context: GameClientContext)=>string
    filter: (id: string, context: GameClientContext, existing: string[])=>boolean
    //can click on this at the current stage
    canClick(action: PlayerUIAction): boolean
    //we are at this stage and clicked on this item
    //return true if we want to proceed to next step
    onClick(action: PlayerUIAction): boolean
    //we have passed this stage and clicked back...
    //return false if we want to keep the subsequent steps, true if we want to restart
    onRetroClick(action: PlayerUIAction): boolean
    //whether this step is concerned with this area
    isConcernedWith(area: UIPosition): boolean
    //dump data into
    dumpDataTo(action: PlayerAction): void
}

abstract class AbstractStep implements Step {
    public chosen: TogglableMap<string, UIPosition>
    public canCancel: boolean = true
    public noBacksie: boolean = false
    constructor(public readonly areas: UIPosition[],
                public readonly size: number,
                public readonly filter: (id: string, context: GameClientContext, existing: string[])=>boolean,
                public readonly msgObtainer: (context: GameClientContext)=>string) {
        this.chosen = new TogglableMap<string, UIPosition>(size)
    }
    abstract onClick(action: PlayerUIAction): boolean
    abstract onRetroClick(action: PlayerUIAction): boolean

    canClick(action: PlayerUIAction): boolean {
        return (!this.noBacksie && this.chosen.has(action.itemId)) || this.chosen.size() < this.size
    }
    isConcernedWith(area: UIPosition) {
        return this.areas.findIndex(a => a === area) > -1
    }
    dumpDataTo(action: PlayerAction) {
        let selected = this.chosen.toArray()
        this.areas.forEach(a => {
            if(action.actionData[a]) {
                throw `Unacceptable, overlapping action position! ${a}`
            }
            action.actionData[a] = selected.filter(s => s[1] === a).map(s => s[0])
        })
    }
}

export class StepDataExact extends AbstractStep {
    constructor(areas: UIPosition[],
                size: number,
                filter: (id: string, context: GameClientContext, existing: string[])=>boolean,
                msgObtainer: (context: GameClientContext)=>string) {
        super(areas, size, filter, msgObtainer)
    }
    onRetroClick(action: PlayerUIAction): boolean {
        if(this.noBacksie) {
            return false
        }
        let isChosen = this.chosen.has(action.itemId)
        if(isChosen) {
            //we are removing
            this.chosen.toggle(action.itemId, action.actionArea)
        } else {
            //we are switching
            this.chosen.clear()
            this.chosen.toggle(action.itemId, action.actionArea)
            if(this.size === 1) {
                return false
            }
        }
        return true
    }
    onClick(action: PlayerUIAction): boolean {
        this.chosen.toggle(action.itemId, action.actionArea)
        if(this.chosen.size() === this.size) {
            return true
        }
        return false
    }
}

export class StepDataLoose extends AbstractStep {
    constructor(areas: UIPosition[],
                private min: number, 
                max: number,
                filter: (id: string, context: GameClientContext, existing: string[])=>boolean,
                msgObtainer: (context: GameClientContext)=>string) {
        super(areas, max, filter, msgObtainer)

    }
    //we have passed this stage and clicked back...
    //return false if we want to keep the subsequent steps, true if we want to restart
    onRetroClick(action: PlayerUIAction): boolean {
        console.log('onClick', action, this.chosen.size(), this.size, this.chosen.has(action.itemId))
        if(this.noBacksie) {
            return false
        }
        let isChosen = this.chosen.has(action.itemId)
        if(isChosen) {
            //we are removing
            this.chosen.toggle(action.itemId, action.actionArea)
        } else {
            if(this.chosen.size() === this.size) {
                //we are switching if full
                this.chosen.clear()
            }
            this.chosen.toggle(action.itemId, action.actionArea)
        }
        return this.chosen.size() < this.min
    }
    //we are at this stage and clicked on this item
    //return true if we want to proceed to next step
    onClick(action: PlayerUIAction): boolean {
        //todo: usage of OK / CANCEL button
        if(this.chosen.has(action.itemId) || this.chosen.size() < this.size) {
            this.chosen.toggle(action.itemId, action.actionArea)
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
            if(isDirectButton(context.serverHint.hint, action.itemId)) {
                //abort sends a message to server
                let actionData: {[key in UIPosition]?: string[]} = {}
                let actionToServer: PlayerAction = {
                    serverHint: context.serverHint.hint,
                    actionSource: context.myself.player.id,
                    actionData
                }
                this.steps.forEach(s => s.dumpDataTo(actionToServer))
                actionData[UIPosition.BUTTONS] = [action.itemId]
                context.submitAction(actionToServer)
                console.log('[Player Action] Submit direct action. Back to server', actionToServer)
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
            if(stepData.onRetroClick(action)) {
                console.log('[Player Action] Retro operation suggests to go back to step: ', idx)
                //clean up the subsequent choices
                this.cleanUpState(idx + 1)
                this.curr = idx
            }
        } else {
            console.log('[Player Action] This is the current step')
            //we are at this stage!
            if(stepData.onClick(action)) {
                console.log('[Player Action] Step complete, proceeding to next step')
                this.curr += 1
                if(this.curr === this.steps.length) {
                    //finish the call!
                    let actionData: {[key in UIPosition]?: string[]} = {}
                    let actionToSubmit: PlayerAction = {
                        actionSource: context.myself.player.id,
                        serverHint: context.serverHint.hint,
                        actionData
                    }
                    this.steps.forEach(s => s.dumpDataTo(actionToSubmit))
                    console.log('[Player Action] All steps done. Finishing the call')
                    context.submitAction(actionToSubmit)
                    return ClickActionResult.DONE
                }
            }
        }
        return this.curr === 0 && this.currentStep().chosen.isEmpty()? ClickActionResult.AT_ZERO : ClickActionResult.PROCESSING
    }

    canBeClicked = (action: PlayerUIAction, context: GameClientContext): Clickability => {
        if(action.actionArea === UIPosition.BUTTONS) {
            // console.log(isDirectButton(context.serverHint.hint, action.itemId))
            if(isDirectButton(context.serverHint.hint, action.itemId)) {
                return isDirectButton(context.serverHint.hint, action.itemId).enabled? Clickability.CLICKABLE : Clickability.DISABLED
            } else if (action.itemId === Button.CANCEL.id) {
                // console.log('Can Cancel? ', this.curr, this.currentStep())
                return this.currentStep().canCancel? Clickability.CLICKABLE : Clickability.DISABLED
            }
        }
        let stepData = this.getStepInConcernSafe(action)

        if(!stepData) {
            return Clickability.NOT_CLICKABLE
        }
        if(stepData !== this.currentStep()) {
            //an old step. if we chose this or this can be chosen, allow it
            if(stepData.chosen.has(action.itemId) || stepData.filter(action.itemId, context, stepData.chosen.toArray().map(s => s[0]))) {
                return Clickability.CLICKABLE
            } else {
                return Clickability.DISABLED
            }
        } else {
            //we are at this stage! make sure we don't click more than we can
            if(stepData.filter(action.itemId, context, stepData.chosen.toArray().map(c => c[0])) && 
                stepData.canClick(action)) {
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
        return this.steps.find((s, idx) => idx <= this.curr && s.isConcernedWith(action.actionArea))
    }

    private getStepInConcern = (action: PlayerUIAction): number => {
        //find out the step for this
        for(let i = 0; i <= this.curr; ++i) {
            if(this.steps[i].isConcernedWith(action.actionArea)){
                return i
            }
        }
        throw `Step not found/reached yet!! ${action.actionArea} ${action.itemId} ${this.constructor.name}`
    }
}