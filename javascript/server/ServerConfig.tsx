import * as fs from 'fs'

// var fs = require('fs');
var file = fs.readFileSync('./config-server.json', "utf8");
console.log(file);

type Config = {
    players: number,
    url: string,
    port: number
}

export const serverConfig = JSON.parse(file) as Config