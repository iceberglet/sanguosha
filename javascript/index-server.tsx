import * as express from 'express'
import * as http from 'http';
import * as WebSocket from 'ws';
import { Serde } from './common/util/Serializer';
import { playerRegistry } from './server/ServerPlayer';
import Pubsub from './common/util/PubSub';
import LoginMessage from './server/Login';
import GameManager from './server/GameManager';
import { ServerHintTransit } from './common/ServerHint';
import { EffectTransit } from './common/transit/EffectTransit';

let app = express()

//serve static files
app.use(express.static('public'))


const server = http.createServer(app)
const wss = new WebSocket.Server({ server });

const pubsub = new Pubsub()
const gameManager = new GameManager()

wss.on('connection', (ws: WebSocket) => {
    //connection is up
    ws.on('message', (message: string) => {
        let msg = Serde.deserialize(message)
        console.log('received: ', msg)
        if(msg.constructor.name === 'LoginMessage') {
            let login = msg as LoginMessage
            try {
                playerRegistry.add({...login}, ws)
            } catch (e) {
                console.error('Failed to add player', e)
                login.error = e
            }
            //send back the samething so they know they are logged in.
            ws.send(Serde.serialize(login))
            //send the current state to this newly logged in person
            ws.send(Serde.serialize(gameManager.getCurrentState()))

            ws.send(Serde.serialize(new ServerHintTransit({
                hintId: 1,
                playerId: '青青子吟',
                isSecret: false,
                hintType: 'play-hand',
                hintMsg: '请出牌',
                slashNumber: 2,
                abortButtonMsg: '结束出牌'
                // slashReach: undefined
            })))

            ws.send(Serde.serialize(new EffectTransit('欧阳挠挠', ['东郭旭銮', '广东吴彦祖', '新荷', '青青子吟'], 'slash')))
        } else {
            pubsub.publish(msg)
        }
    });

    ws.on('close', ()=>{
        playerRegistry.removePlayer(ws)
    })
});

server.listen(80, ()=>{
    console.log('Server running on 80')
})

