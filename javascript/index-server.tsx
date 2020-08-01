import * as express from 'express'
import * as http from 'http';
import * as WebSocket from 'ws';
import { Serde } from './common/util/Serializer';

let app = express()

app.use(express.static('public'))


// let ser = Serde.serialize(new Heal('source', 'player', 12))
// console.log(ser)
// let obj = Serde.deserialize(ser)
// console.log(obj)

// console.log(enumValues(Stage))

const server = http.createServer(app)
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws: WebSocket) => {

    //connection is up, let's add a simple simple event
    ws.on('message', (message: string) => {

        //log the received message and send it back to the client
        console.log('received: ', message);
        ws.send(Serde.serialize({type: 'something', msg: `Hello, you sent -> ${message}`}));
    });

    wss.clients.forEach(client => {
        if (client != ws) {
            client.send(`Hello, broadcasting`);
        }    
    });

    //send immediatly a feedback to the incoming connection    
    ws.send('Hi there, I am a WebSocket server');
});


server.listen(80, ()=>{
    console.log('Server running on 80')
})