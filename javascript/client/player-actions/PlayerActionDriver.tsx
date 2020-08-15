// export type Action = '摸排'
import GameClientContext from "../GameClientContext"
import { PlayerUIAction, Button } from "../../common/PlayerAction"

export enum Clickability {
    CLICKABLE,
    NOT_CLICKABLE,
    DISABLED
}

export enum ClickActionResult {
    AT_ZERO,
    PROCESSING,
    DONE
}

/**
 * 每个ServerHint产生一个PlayerActionDriver
 * Driver需要控制哪些东西玩家可以点，哪些玩家不能点
 * Driver收集完玩家的input之后产生一个Operation发送给Server
 * 
 * - 手牌
 * - 装备牌
 * - 技能
 * - 其他人
 * - 其他人的牌* (顺手牵羊，过河拆桥，反馈)
 * - 观星
 */
export abstract class PlayerActionDriver {

    /**
     * when player clicked on something
     * if this action is concluded, call context to send operation to server
     * return this driver or NoActionDriver instance if this driver is completed
     * @param action action of the player
     * @param context context used to access stuff
     */
    abstract onClicked(action: PlayerUIAction, context: GameClientContext): ClickActionResult

    abstract canBeClicked(action: PlayerUIAction, context: GameClientContext): Clickability

    abstract isSelected(action: PlayerUIAction, context: GameClientContext): boolean

    /**
     * Buttons to be displayed
     */
    abstract getUsableButtons(): Button[]
    abstract getHintMsg(context: GameClientContext): string
}

export class NoActionDriver extends PlayerActionDriver {

    public static INSTANCE = new NoActionDriver()

    private constructor(){
        super()
    }

    onClicked(action: PlayerUIAction, context: GameClientContext): ClickActionResult {
        //ignore
        return ClickActionResult.AT_ZERO
    }
    canBeClicked(action: PlayerUIAction, context: GameClientContext): Clickability {
        return Clickability.NOT_CLICKABLE
    }
    isSelected(action: PlayerUIAction, context: GameClientContext): boolean {
        return false
    }
    getUsableButtons(): Button[] {
        return []
    }
    getHintMsg(context: GameClientContext): string {
        return ''
    }
}

/**
 * When there are multiple ways of doing the same thing, use CompositeDriver
 * 例：服务器要求出杀
 * - 出牌杀
 * - 丈八蛇矛出杀
 * - 龙胆， 闪当杀
 * - 激将， 要求其他人帮忙出杀
 * 
 * 例2：服务器要求出无懈可击
 * - 出无懈可击
 * - 诸葛亮黑牌当无懈可击
 * 
 * 例3：服务器询问技能发动
 * - 不需要CompositePlayerActionDriver
 * 
 * 例4：服务器要求出牌
 * - 可以出杀
 * - 可以丈八蛇矛出杀
 * - 可以吃桃补血
 * - 可以万箭齐发
 */
export class CompositePlayerActionDriver extends PlayerActionDriver {

    theOne: PlayerActionDriver = null

    public constructor(private delegates: PlayerActionDriver[]) {
        super()
    }

    onClicked(action: PlayerUIAction, context: GameClientContext): ClickActionResult {
        if(this.theOne) {
            console.log('[Composite] there is an existing delegate, invoking: ', this.theOne, action)
            let res = this.theOne.onClicked(action, context)
            if(res === ClickActionResult.AT_ZERO) {
                console.log('[Composite] delegate back to zero', this.theOne)
                this.theOne = null
            }
            return res
        } else {
            console.log('[Composite] no existing delegate, checking', action)
            for(let d of this.delegates) {
                if(d.canBeClicked(action, context) === Clickability.CLICKABLE) {
                    this.theOne = d
                    console.log('[Composite] found delegate, invoking: ', this.theOne)
                    return d.onClicked(action, context)
                }
            }
            console.error('[Composite] no existing delegate and no one can handle this!', action)
        }
    }

    canBeClicked(action: PlayerUIAction, context: GameClientContext): Clickability {
        if(this.theOne) {
            return this.theOne.canBeClicked(action, context)
        }
        let best = Clickability.DISABLED
        for(let d of this.delegates) {
            let clickable = d.canBeClicked(action, context)
            if(clickable===Clickability.CLICKABLE) {
                return Clickability.CLICKABLE
            } else if (clickable===Clickability.NOT_CLICKABLE) {
                best = Clickability.NOT_CLICKABLE
            }
        }
        return best
    }

    isSelected(action: PlayerUIAction, context: GameClientContext): boolean {
        if(this.theOne) {
            return this.theOne.isSelected(action, context)
        }
        return false
    }

    getUsableButtons() {
        if(this.theOne) {
            return this.theOne.getUsableButtons()
        } else {
            let base = this.delegates[0].getUsableButtons()
            for(let i = 1; i < this.delegates.length; ++i) {
                base = base.filter(b => this.delegates[i].getUsableButtons().find(bb => bb.id === b.id))
            }
            return base
        }
    }

    getHintMsg(context: GameClientContext) {
        if(this.theOne) {
            return this.theOne.getHintMsg(context)
        } else {
            return context.serverHint.hint.hintMsg
        }
    }
}