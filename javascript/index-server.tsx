import * as express from 'express'

let app = express()

app.use(express.static('public'))

app.listen(8080, ()=>{
    console.log('Server running on 8080')
})

// let ser = Serde.serialize(new Heal('source', 'player', 12))
// console.log(ser)
// let obj = Serde.deserialize(ser)
// console.log(obj)

// console.log(enumValues(Stage))
