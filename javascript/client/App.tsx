import * as React from 'react';
import UIBoard from './ui/UIBoard';
import UILogin from './ui/UILogin';
import GameClientContext from './GameClientContext';
import { Player } from '../common/Player';
import { Serde } from '../common/util/Serializer';
import LoginMessage from '../server/Login';
import Pubsub from '../common/util/PubSub';
import { checkNotNull } from '../common/util/Util';
import GameContext from '../common/GameContext';
import { Circus } from '../game-mode-faction/FactionWarGameHoster';
import PregameUI from './pregame/PregameUI';
import { PlaySound } from '../common/transit/EffectTransit';
import { audioManager } from './audio-manager/AudioManager';
import './Util'

type AppState = {
    myself?: Player,
    pregame?: Circus,
    context?: GameClientContext,
    socket: WebSocket
}

// const audio = new Audio('无双.mp3')
// setInterval(()=>{
//     audio.play()
// }, 2000)

export default class App extends React.Component<object, AppState> {
    
    pubsub: Pubsub

    constructor(p: any) {
        super(p)
        let socket = new WebSocket('ws://' + location.host)

        let myself = this.getPlayer()
        this.resetPubsub()
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

    resetPubsub() {
        this.pubsub = new Pubsub()
        this.pubsub.on(GameContext, (transit: GameContext)=>{
            checkNotNull(this.state.myself)
            console.log('Received Game Context', transit)
            this.resetPubsub()
            this.setState({
                context: new GameClientContext(transit, this.state.myself, this.state.socket, transit.gameMode),
                pregame: null
            })
        })
        this.pubsub.on(Circus, (circus: Circus)=>{
            console.log('Received Pregame', circus)
            if(this.state.context) {
                this.resetPubsub()
            }
            this.setState({
                pregame: circus,
                context: null
            })
        })
        this.pubsub.on(PlaySound, (sound: PlaySound)=>{
            console.log('[UIBoard] Play Sound ', sound.path)
            audioManager.play(sound.path)
        })
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
        return <PregameUI pubsub={this.pubsub} circus={this.state.pregame} socket={this.state.socket} myId={this.state.myself.id}/>
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
        // return <FactionGeneralUI general={FactionWarGeneral.cao_cao} />
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