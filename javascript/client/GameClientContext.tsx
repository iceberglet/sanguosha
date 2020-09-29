import GameContext from "../common/GameContext";
import { PlayerInfo } from "../common/PlayerInfo";
import { ServerHint, ServerHintTransit, HintType } from "../common/ServerHint";
import { PlayerActionDriver, Clickability, ClickActionResult, NoActionDriver } from "./player-actions/PlayerActionDriver";
import { UIPosition, PlayerAction, PlayerActionTransit } from "../common/PlayerAction";
import { playerActionDriverProvider } from "./player-actions/PlayerActionDriverProvider";
import './player-actions/PlayerActionDrivers'
import { Player } from "../common/Player";
import { Serde } from "../common/util/Serializer";
import { ICard } from "../common/cards/ICard";
import { CardManager } from "../common/cards/Card";
import { GameMode } from "../common/GameMode";
import { GameModeEnum } from "../common/GameModeEnum";
import { SkillStatus } from "../game-mode-faction/skill/Skill";

export default class GameClientContext extends GameContext {

    private currentDriver: PlayerActionDriver = NoActionDriver.INSTANCE
    public readonly cardManager: CardManager
    public myself: PlayerInfo
    public curr: string
    /**
     * Current Server Hint
     */
    public serverHint: ServerHintTransit

    public constructor(context: GameContext, myself: Player, private socket: WebSocket, gameMode: GameModeEnum) {
        super(context.playerInfos, gameMode)
        this.myself = this.playerInfos.find(i => i.player.id === myself.id)
        this.cardManager = GameMode.get(gameMode).cardManager
        GameMode.get(gameMode).initClient()
        this.currentDriver = NoActionDriver.INSTANCE
    }

    public setHint(hint: ServerHintTransit) {
        if(!hint) {
            //rescind
            this.serverHint = null
            this.currentDriver = NoActionDriver.INSTANCE
        } else {
            console.warn('Getting Server Hint', hint)
            if(this.currentDriver !== NoActionDriver.INSTANCE) {
                throw `Invalid State: There is an existing action driver. Cannot start new action when current one is not complete! ${this.currentDriver}`
            }
            this.serverHint = hint
            if(hint.hint.hintType === HintType.UI_PANEL) {
                //don't process this
                return
            }
            this.currentDriver = playerActionDriverProvider.getDriver(hint.hint, this)
        }
    }

    public getCurrentDriver(): PlayerActionDriver {
        return this.currentDriver
    }
 
    public getMyDistanceTo=(playerId: string): number =>{
        return this.computeDistance(this.myself.player.id, playerId)
    }

    //-------- Player UI Interactions ----------
    public canBeClicked(actionArea: UIPosition, itemId: string): Clickability {
        return this.currentDriver.canBeClicked({actionArea, itemId}, this)
    }

    public isSelected(actionArea: UIPosition, itemId: string): boolean {
        return this.currentDriver.isSelected({actionArea, itemId}, this)
    }

    public onClicked(actionArea: UIPosition, itemId: string) {
        if(this.currentDriver.onClicked({actionArea, itemId}, this) === ClickActionResult.DONE) {
            this.currentDriver = NoActionDriver.INSTANCE
        }
    }

    public getButtons() {
        return this.currentDriver.getUsableButtons()
    }

    public getMsg(): string {
        return this.currentDriver.getHintMsg(this)
    }

    public interpret(cardId: string, player: PlayerInfo = null): ICard {
        player = player || this.myself
        let card = this.cardManager.getCard(cardId)
        if(!card) {
            throw `Unable to find this card!! ${cardId}`
        }
        return super.interpretCard(player.player.id, card)
    }

    //-------- Interactions with server -----------
    public submitAction(action: PlayerAction) {
        console.warn('[Client] Submitting Action To Server', this.serverHint.hintId, action)
        this.socket.send(Serde.serialize(new PlayerActionTransit(this.serverHint.hintId, action)))
    }

    public sendToServer(obj: any) {
        console.warn('[Client] Submitting Stuff To Server', obj)
        this.socket.send(Serde.serialize(obj))
    }
}