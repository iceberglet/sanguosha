import { Package } from "../common/GeneralManager";


export default class GameClient {

    private socket : WebSocket 

    constructor(){
       this.socket = new WebSocket('wss://localhost:8090')
       this.socket.onopen = (event: Event)=>{
           console.log('Socket connected! ', event)
       }
       this.socket.onclose = (event: Event)=>{
           console.log('Socket closed!', event)
       }
    }

    /**
     * Get general choices with given packages
     * @param number of choices
     * @param packages packages
     */
    getGeneralSelections(number: number, ...packages: Package[]) {

    }


}