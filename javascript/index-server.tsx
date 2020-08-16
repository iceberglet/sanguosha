import * as express from 'express'
import * as http from 'http';
import * as WebSocket from 'ws';
import { Serde } from './common/util/Serializer';
import Pubsub from './common/util/PubSub';
import LoginMessage from './server/Login';
import GameManager, { sampleIdentityWarContext, sampleFactionWarContext } from './server/GameManager';
import { PlayerRegistry } from './server/PlayerRegistry';
import { ServerHintTransit, HintType } from './common/ServerHint';
import { TextFlashEffect, DamageEffect, TransferCardEffect, CurrentPlayerEffect } from './common/transit/EffectTransit';
import { Stage } from './common/Stage';
import { PlayerInfo } from './common/PlayerInfo';
import { CardPos } from './common/transit/CardPos';
import RoundStat from './common/RoundStat';
import { WorkflowTransit, WorkflowCard } from './common/transit/WorkflowCard';
import Card, { CardType } from './common/cards/Card';

let app = express()

//serve static files
app.use(express.static('public'))


const server = http.createServer(app)
const wss = new WebSocket.Server({ server });

const pubsub = new Pubsub()
const playerRegistry = new PlayerRegistry(pubsub)
const context = sampleFactionWarContext()
const gameManager = new GameManager(context, playerRegistry)

try {
    gameManager.startGame()
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
            gameManager.onPlayerReconnected(login.id)


            // ws.send(Serde.serialize(new EffectTransit('欧阳挠挠', ['广东吴彦祖', '新荷', '青青子吟'], '南蛮入侵')))
            // ws.send(Serde.serialize(new EffectTransit('东郭旭銮', ['欧阳挠挠'], '杀')))
            // ws.send(Serde.serialize(new DamageEffect('东郭旭銮')))
            // ws.send(Serde.serialize(new TransferCardEffect('欧阳挠挠', '新荷', cardManager.getShuffledDeck().slice(5, 7).map(c => c.id))))

            let cards: Card[] = context.getGameMode().cardManager.getShuffledDeck()
            setInterval(()=>{
                let want = Math.round(Math.random() * 1) + 1
                let thisTime: WorkflowCard[] = []
                while(cards.length > 0 && thisTime.length < want) {
                    let c = cards.shift()
                    if(!c) {
                        throw `WTF???!! ${c}`
                    }
                    thisTime.push({cardId: c.id, description: '', as: CardType.LE_BU, isDropped: false})
                }
                console.log('sending', thisTime.length)
                ws.send(Serde.serialize(new WorkflowTransit(Math.random() > 0.7, thisTime)))
            }, 1500)
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

