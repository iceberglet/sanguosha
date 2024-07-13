// import {Card}from "../../common/cards/Card"
// import * as React from 'react'
// import { DragDropContext, Droppable } from "react-beautiful-dnd"

// type Struct = {[key: string]: Card}

// export type DndProp = {
//     //each key is a different row
//     cards: Struct

// }

// export type DndState = {
//     cards: Struct
// }

// export default class CardDnD extends React.Component<DndProp, DndState> {





//     doGetResult(): Struct {
//         return this.state.cards
//     }

//     render() {
//         return <div className='card-dnd-container'>
//             <DragDropContext onDragEnd={this.onDragEnd}>
//                 {
//                     Object.keys(this.state.cards).map(k => {
//                         return <Droppable droppableId={this.state.cards.}>


//                         </Droppable>
//                     })
//                 }
//             </DragDropContext>
//         </div>
//     }

// }