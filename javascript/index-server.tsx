import * as express from 'express'
import * as http from 'http';
import * as WebSocket from 'ws';
import { Serde } from './common/util/Serializer';
import Pubsub from './common/util/PubSub';
import LoginMessage from './server/Login';
import { PlayerRegistry } from './server/PlayerRegistry';
import { GameMode } from './common/GameMode';
import { GameModeEnum } from './common/GameModeEnum';
import { PlaySound } from './common/transit/EffectTransit';

let app = express()

//serve static files
app.use(express.static('public'))


const server = http.createServer(app)
const wss = new WebSocket.Server({ server });

const pubsub = new Pubsub()
const playerRegistry = new PlayerRegistry(pubsub)
//todo: make game mode from config
const gameHost = GameMode.get(GameModeEnum.FactionWarGame).gameHosterProvider(playerRegistry, 2)

try {
    //todo: make this come from config
    gameHost.init()
} catch (err) {
    console.error('Game Failure', err)
}

// let after = Serde.deserialize(Serde.serialize(context.getPlayer('欧阳挠挠'))) as PlayerInfo
// console.log(after)
// console.log(after.getCards(CardPos.EQUIP)[0])
// console.log(after.getCards(CardPos.EQUIP)[1])
// console.log(after.getJudgeCards()[0])

wss.on('connection', (ws: WebSocket) => {
    //connection is up
    ws.on('message', async (message: string) => {
        let msg = Serde.deserialize(message)
        if(msg.constructor.name === 'LoginMessage') {
            let login = msg as LoginMessage
            console.log(`Player Logged in: ${login.id}`)
            try {
                playerRegistry.add({...login}, ws)
            } catch (e) {
                console.error('Failed to add player', e)
                login.error = e
            }
            //send back the samething so they know they are logged in.
            ws.send(Serde.serialize(login))
            //send the current state to this newly logged in person
            gameHost.onPlayerConnected(login.id)

        } else {
            pubsub.publish(msg)
        }
    });

    ws.on('close', ()=>{
        playerRegistry.removePlayer(ws)
    })
});

server.listen(8080, ()=>{
    console.log('Server running on 8080')
})

// server.listen(8080, '192.168.1.102', ()=>{
//     console.log('Server running on 8080')
// })

