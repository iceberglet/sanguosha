import * as express from 'express'
import * as http from 'http';
import * as WebSocket from 'ws';
import { Serde } from './common/util/Serializer';
import Pubsub from './common/util/PubSub';
import LoginMessage from './server/Login';
import { PlayerRegistry } from './server/PlayerRegistry';
import { GameMode } from './common/GameMode';
import { GameModeEnum } from './common/GameModeEnum';
import { serverConfig } from './server/ServerConfig';
import GameContext from './common/GameContext';
import { PlayerInfo } from './common/PlayerInfo';
import FactionPlayerInfo from './game-mode-faction/FactionPlayerInfo';
import FactionWarGeneral from './game-mode-faction/FactionWarGenerals';
import { FWCard } from './game-mode-faction/FactionWarCardSet';
import { CardSize, CardType } from './common/cards/Card';
import { CardPos } from './common/transit/CardPos';

//-------------------------- test -------------------------

// let a = new FactionPlayerInfo({id: 'A'}, FactionWarGeneral.liu_bei, FactionWarGeneral.liu_shan)
// let b = new FactionPlayerInfo({id: 'B'}, FactionWarGeneral.liu_bei, FactionWarGeneral.liu_shan)
// b.isDead = true
// let c = new FactionPlayerInfo({id: 'C'}, FactionWarGeneral.liu_bei, FactionWarGeneral.liu_shan)
// let d = new FactionPlayerInfo({id: 'D'}, FactionWarGeneral.liu_bei, FactionWarGeneral.liu_shan)
// d.addCard(new FWCard('club', CardSize.QUEEN, CardType.DA_YUAN), CardPos.EQUIP)
// let e = new FactionPlayerInfo({id: 'E'}, FactionWarGeneral.liu_bei, FactionWarGeneral.liu_shan)
// let f = new FactionPlayerInfo({id: 'F'}, FactionWarGeneral.liu_bei, FactionWarGeneral.liu_shan)
// let g = new FactionPlayerInfo({id: 'G'}, FactionWarGeneral.liu_bei, FactionWarGeneral.liu_shan)
// let context = new GameContext([a, b, c, d, e, f, g], GameModeEnum.FactionWarGame)
// console.log('hello')
// console.log(context.computeDistance('D', 'A'))


let app = express()

//serve static files
app.use(express.static('public'))


const server = http.createServer(app)
const wss = new WebSocket.Server({ server });

const pubsub = new Pubsub()
const playerRegistry = new PlayerRegistry(pubsub)
//todo: make game mode from config
const gameHost = GameMode.get(GameModeEnum.FactionWarGame).gameHosterProvider(playerRegistry, serverConfig.players)

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

