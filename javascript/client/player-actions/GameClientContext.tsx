import GameContext from "../../common/GameContext";
import { PlayerInfo } from "../../common/PlayerInfo";
import { ServerHint } from "../../common/ServerHint";
import Impact from "../../common/Impact";
import { PlayerActionDriver, Clickability, ClickActionResult, NoActionDriver } from "./PlayerActionDriver";
import { UIPosition, PlayerAction } from "./PlayerUIAction";
import { playerActionDriverProvider } from "./PlayerActionDriverProvider";
import './PlayerActionDrivers'

export default class GameClientContext extends GameContext {

    currentDriver: PlayerActionDriver = NoActionDriver.INSTANCE

    public constructor(public readonly myself: PlayerInfo, players: PlayerInfo[]) {
        super(players)
        this.serverHint = {
            hintId: 1,
            playerId: myself.player.id,
            isSecret: false,
            hintType: 'play-hand',
            slashNumber: 1,
            infiniteReach: true
        }
        this.currentDriver = playerActionDriverProvider.getDriver(this.serverHint)
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

    //-------- Interactions with server -----------
    public submitAction(action: PlayerAction) {

    }

    public onServerHint(hint: ServerHint) {

    }

    public onServerImpact(impact: Impact) {

    }
}