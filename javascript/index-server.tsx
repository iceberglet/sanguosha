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

let app = express()

//serve static files
app.use(express.static('public'))


const server = http.createServer(app)
const wss = new WebSocket.Server({ server });

const pubsub = new Pubsub()
const playerRegistry = new PlayerRegistry(pubsub)
const context = sampleFactionWarContext()
const gameManager = new GameManager(context, playerRegistry)


// let after = Serde.deserialize(Serde.serialize(context.getPlayer('欧阳挠挠'))) as PlayerInfo
// console.log(after)
// console.log(after.getCards(CardPos.EQUIP)[0])
// console.log(after.getCards(CardPos.EQUIP)[1])
// console.log(after.getJudgeCards()[0])

wss.on('connection', (ws: WebSocket) => {
    //connection is up
    ws.on('message', async (message: string) => {
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
            ws.send(Serde.serialize(gameManager.getCurrentState('青青子吟')))

            playerRegistry.sendServerAsk('青青子吟', {
                hintType: HintType.PLAY_HAND,
                hintMsg: '请出牌',
                roundStat: new RoundStat(),
                abortButtonMsg: '结束出牌'
                // slashReach: undefined
            })

            ws.send(Serde.serialize(new CurrentPlayerEffect('青青子吟', Stage.USE_CARD)))
            // ws.send(Serde.serialize(new EffectTransit('欧阳挠挠', ['广东吴彦祖', '新荷', '青青子吟'], '南蛮入侵')))
            // ws.send(Serde.serialize(new EffectTransit('东郭旭銮', ['欧阳挠挠'], '杀')))
            // ws.send(Serde.serialize(new DamageEffect('东郭旭銮')))
            // ws.send(Serde.serialize(new TransferCardEffect('欧阳挠挠', '新荷', cardManager.getShuffledDeck().slice(5, 7).map(c => c.id))))
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

