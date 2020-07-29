import { PlayerActionDriver, NoActionDriver, Clickability } from "./PlayerActionDriver";
import Card, { cardManager, CardType } from "../../common/cards/Card";
import GameClientContext from "./GameClientContext";
import Togglable from "../../common/util/Togglable";
import { PlayerUIAction, UIPosition, Button } from "./PlayerUIAction";
import { ServerHint } from "../../common/ServerHint";
import PlayerActionDriverDefiner from "./PlayerActionDriverDefiner";
import { playerActionDriverProvider } from "./PlayerActionDriverProvider";


let slashTargetFilter = (id: string, context: GameClientContext)=>{
    return id !== context.myself.player.id && (context.serverHint.infiniteReach ||
        context.getMyDistanceTo(id) <= context.myself.getReach())
}

playerActionDriverProvider.registerProvider('play-hand', (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出杀')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id)=>cardManager.getCard(id).type.isSlash())
            .expectChoose(UIPosition.PLAYER, 1, hint.slashNumber, slashTargetFilter)
            .expectAnyButton()
            .build()
})

playerActionDriverProvider.registerProvider('play-hand', (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段出范围锦囊')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id)=>cardManager.getCard(id).type.genre === 'group-ruse')
            .expectChoose(UIPosition.BUTTONS, 1, 1, (id, context)=>id === Button.OK.id)
            .build()
})

playerActionDriverProvider.registerProvider('play-hand', (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段吃桃')
            .expectChoose(UIPosition.MY_HAND, 1, 1, (id, context)=>{
                return context.myself.hp < context.myself.maxHp && cardManager.getCard(id).type === CardType.PEACH
            })
            .expectChoose(UIPosition.BUTTONS, 1, 1, (id, context)=>id === Button.OK.id || id === Button.CANCEL.id)
            .build()
})

playerActionDriverProvider.registerProvider('drop-cards', (hint)=>{
    if(!hint.dropNumber) {
        throw `Drop Number not specified in hint: ${hint.hintId}`
    }
    return new PlayerActionDriverDefiner('弃牌阶段选择弃牌')
            .expectChoose(UIPosition.MY_HAND, hint.dropNumber, hint.dropNumber, (id, context)=>{
                return context.myself.hp < context.myself.maxHp && cardManager.getCard(id).type === CardType.PEACH
            })
            .expectChoose(UIPosition.BUTTONS, 1, 1, (id, context)=>id === Button.OK.id || id === Button.CANCEL.id)
            .build()
})

playerActionDriverProvider.registerProvider('play-hand', (hint)=>{
    return new PlayerActionDriverDefiner('出牌阶段丈八出杀')
            .expectChoose(UIPosition.MY_EQUIP, 1, 1, (id)=>cardManager.getCard(id).type === CardType.ZHANG_BA)
            .expectChoose(UIPosition.MY_HAND, 2, 2, (id)=>true)
            .expectChoose(UIPosition.PLAYER, 1, hint.slashNumber, slashTargetFilter)
            .expectChoose(UIPosition.BUTTONS, 1, 1, (id, context)=>id === Button.OK.id || id === Button.CANCEL.id)
            .build()
})


// playerActionDriverProvider.registerProvider('dodge', (hint)=>{
//     return new PlayerActionDriverDefiner()
//                 .expectChoose(UIPosition.MY_HAND, 1, 1, (id)=>cardManager.getCard(id).type === CardType.DODGE)
//                 .expectChoose(UIPosition.BUTTONS, 1, 1, (id, context)=>id === Button.OK.id || id === Button.CANCEL.id)
//                 .build()
// })
