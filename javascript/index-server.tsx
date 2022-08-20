import * as express from 'express'
import * as http from 'http';
import * as WebSocket from 'ws';
var compression = require('compression');
var path = require('path');
import { Serde } from './common/util/Serializer';
import Pubsub from './common/util/PubSub';
import LoginMessage from './server/Login';
import { PlayerRegistry } from './server/PlayerRegistry';
import { GameMode } from './common/GameMode';
import { GameModeEnum } from './common/GameModeEnum';
import { serverConfig } from './server/ServerConfig';


let app = express()

//serve static files
// console.log(path.resolve(__filename, '..', 'public'))
app.use(express.static('public', { maxAge: 31557600 }));
app.use(compression());

const server = http.createServer(app)
const wss = new WebSocket.Server({ server });

const pubsub = new Pubsub()
const playerRegistry = new PlayerRegistry(pubsub, serverConfig.players)
//todo: make game mode from config
const gameHost = GameMode.get(GameModeEnum.FactionWarGame).gameHosterProvider(playerRegistry, serverConfig.players)

try {
    //todo: make this come from config
    gameHost.init()
} catch (err) {
    console.error('Game Failure', err)
}

wss.on('connection', (ws: WebSocket) => {

    let loggedIn = false
    //connection is up
    ws.on('message', (message: string) => {
        let msg = Serde.deserialize(message)
        if(msg.constructor.name === 'LoginMessage') {
            let login = msg as LoginMessage
            console.log(`Player trying to log in: ${login.id}`)
            try {
                playerRegistry.add({...login}, ws)
                loggedIn = true
            } catch (e) {
                console.error('Failed to add player', e)
                login.error = e
                return
            } finally {
                //send back the samething so they know they are logged in.
                ws.send(Serde.serialize(login))
            }
            //send the current state to this newly logged in person
            gameHost.onPlayerConnected(login.id).catch(err => {
                console.error('Player recon failure', msg, err)
            })

        } else {
            if(!loggedIn) {
                ws.send('Failure. You are not logged in.')
            } else {
                pubsub.publish(msg)
            }
        }
    });

    ws.on('close', ()=>{
        playerRegistry.removePlayer(ws)
    })
});

if(serverConfig.url) {
    server.listen(serverConfig.port, serverConfig.url, ()=>{
        console.log('Server running on 7758')
    })
} else {
    server.listen(7758, ()=>{
        console.log('Server running on 7758')
    })
}


