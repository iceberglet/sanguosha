import { ServerAsk } from "../common/ServerAsk";
import { PlayerResponse } from "../common/PlayerResponse";
import Impact from "../common/Impact";

export default class PlayerOpsManager {

    currentAsk: ServerAsk
    myId: number

    registerHandler<T>(type: Function, handler: (ask: T) => void) {

    }

    /**
     * Server sent us to see if we want to do something
     * @param ask 
     */
    onServerAsk(ask: ServerAsk) {
        if(this.currentAsk) {
            console.error('Invalid State. Current Ask is not resolved', this.currentAsk)
        } else {
            this.currentAsk = ask
            //start to allow user to do stuff
        }
    }

    /**
     * Send Server a response against its request
     * @param resp 
     */
    submitResponse(resp: PlayerResponse) {
        resp.askId = this.currentAsk.askId
        resp.playerId = this.myId
        //do submit response

        //mark this as done
        this.currentAsk = null
    }

    /**
     * Server sends an impact. This needs to be updated onto our context
     * e.g. One player drew 2 cards from deck
     * @param impact 
     */
    onImpact(impact: Impact) {
        
    }



}