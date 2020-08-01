import GameContext from "../../common/GameContext";
import { PlayerInfo } from "../../common/PlayerInfo";
import { ServerHint } from "../../common/ServerHint";
import Impact from "../../common/Impact";
import { PlayerActionDriver, Clickability, ClickActionResult, NoActionDriver } from "./PlayerActionDriver";
import { UIPosition, PlayerAction } from "./PlayerUIAction";
import { playerActionDriverProvider } from "./PlayerActionDriverProvider";
import './PlayerActionDrivers'

export default class GameClientContext extends GameContext {

    private currentDriver: PlayerActionDriver = NoActionDriver.INSTANCE
    private socket: WebSocket

    public constructor(public readonly myself: PlayerInfo, players: PlayerInfo[]) {
        super(players)
        this.serverHint = {
            hintId: 1,
            playerId: myself.player.id,
            isSecret: false,
            hintType: 'play-hand',
            hintMsg: '请出牌',
            slashNumber: 2,
            abortButtonMsg: '结束出牌'
            // slashReach: undefined
        }
        this.currentDriver = playerActionDriverProvider.getDriver(this.serverHint)
        this.socket = new WebSocket("ws://" + location.host + "")
        this.socket.addEventListener('open', ()=>{
            this.onSocketConnected()
            this.socket.send('Greetings')
        })
        this.socket.addEventListener('close', this.onSocketDisconnected)
        this.socket.addEventListener('message', this.onServerMsg)
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

    //-------- Interactions with server -----------
    public submitAction(action: PlayerAction) {
        console.warn('[Client] Submitting Action To Server', action)
    }

    public onServerHint(hint: ServerHint) {

    }

    public onServerImpact(impact: Impact) {

    }

    //------- Connection Stuff ---------------
    private isConnected = false
    private onSocketConnected() {
        this.isConnected = true
        console.log('Socket Connection to Server Established', this.socket)
        //todo: tell server who we are!
    }
    private onSocketDisconnected() {
        this.isConnected = false
        console.error('Socket Connection to Server Lost')
    }
    private onServerMsg(msg: any) {
        console.log('Received Msg From Server', msg, msg.data)
    }
}