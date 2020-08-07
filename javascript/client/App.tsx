import * as React from 'react';
import UIBoard from './ui/UIBoard';
import UILogin from './ui/UILogin';
import GameClientContext from './player-actions/GameClientContext';
import { PreGame } from '../common/PreGame';
import { Player } from '../common/Player';
import { Serde } from '../common/util/Serializer';
import LoginMessage from '../server/Login';
import Pubsub from '../common/util/PubSub';
import GameTransit from '../common/transit/GameTransit';
import { checkNotNull } from '../common/util/Util';
import { ServerHintTransit } from '../common/ServerHint';

type AppState = {
    myself?: Player,
    pregame?: PreGame,
    context?: GameClientContext,
    socket: WebSocket
}

export default class App extends React.Component<object, AppState> {
    
    pubsub: Pubsub

    constructor(p: any) {
        super(p)
        let socket = new WebSocket('ws://' + location.host)
        this.pubsub = new Pubsub()

        let myself = this.getPlayer()
        this.pubsub.on(GameTransit, (transit: GameTransit)=>{
            checkNotNull(this.state.myself)
            checkNotNull(this.state.socket)
            this.setState({
                context: new GameClientContext(transit.context, this.state.myself, this.state.socket)
            })
        })
        //listen to login results or other messages
        socket.addEventListener('message', message => {
            let msg = Serde.deserialize(message.data)
            if(msg.constructor.name === 'LoginMessage') {
                let login = msg as LoginMessage
                if(login.error) {
                    console.error(login.error)
                }
                this.setPlayer(login)
            } else {
                this.pubsub.publish(msg)
            }
        })

        //if exists, try log in right away
        if(myself.id) {
            socket.addEventListener('open', ()=>{
                this.doLogin(myself)
            })
        }

        this.state = {
            socket,
            context: null, 
            myself: this.getPlayer(),
            pregame: null
        }
    }

    getPlayer() {
        return {
            id: localStorage.getItem('id')
        }
    }

    setPlayer=(player:Player)=>{
        localStorage.setItem('id', player.id)
        this.setState({
            myself: player
        })
    }

    doLogin=(p: Player)=>{
        console.log('Logging in...', p)
        this.state.socket.send(Serde.serialize(new LoginMessage(p.id)))
    }

    renderPrep() {
        return <div />
    }

    renderGame() {
        return <UIBoard context={this.state.context} pubsub={this.pubsub} myId={this.state.myself.id}/>
    }

    doRender() {
        if(this.state.context) {
            return this.renderGame()
        }
        if(this.state.pregame) {
            return this.renderPrep()
        }
        return <UILogin myself={this.state.myself} onDone={this.doLogin}/>
    }

    render() {
        return <div className='occupy'>
            {this.doRender()}
        </div>
    }
}


{/* <UICard card={cardManager.getShuffledDeck()[0]} isShown={false} 
        onMouseClick={c=>console.log('click')}
        onMouseDown={c=>console.log('down')}
        onMouseUp={c=>console.log('up')}
    /> */}