import GameManager from "../GameManager";
import GameContext from "../../common/GameContext";
import { PlayerInfo, Mark } from "../../common/PlayerInfo";
import { CardType } from "../../common/cards/Card";
import Flow, { Operation } from "../Flow";
import { Button, PlayerAction, UIPosition } from "../../common/PlayerAction";
import { CardPos } from "../../common/transit/CardPos";
import { filterMap, promiseAny } from "../../common/util/Util";
import { HintType } from "../../common/ServerHint";

enum Action {
    IMPOSSIBLE,     //此人无法出无懈
    NORMAL,         //可以询问无懈
    REFUSE          //此人拒绝了无懈,莫要再问了
}

const refuse = 'refuse'

export default class WuXieOp extends Operation<boolean> {

    public actionCache = new Map<string, Action>()
    private ruseCanProceed = true

    constructor(
        //从谁开始计算?
        private playerInfo: PlayerInfo, 
        //需要无懈什么?
        private cardType: CardType) {
        super()
        if(!cardType.isRuse()) {
            throw `Invalid Card Type ${cardType} 不是锦囊`
        }
    }

    public async perform(manager: GameManager): Promise<boolean> {
        while(true) {
            // 检查所有人的手牌查看是否有无懈, 没有的直接impossible处理
            manager.context.playerInfos.filter(p => !p.isDead && this.actionCache.get(p.player.id) !== Action.REFUSE).forEach(p => {
                if(p.getCards(CardPos.HAND).filter(c => c.type === CardType.WU_XIE).length > 0) {
                    this.actionCache.set(p.player.id, Action.NORMAL)
                } else {
                    this.actionCache.set(p.player.id, Action.IMPOSSIBLE)
                }
            })
            // publish WuXieFlow event, 比如卧龙和曹仁有技能可以当做无懈可击, 他们会将 Impossible 改回 Normal
            manager.beforeFlowHappen.publish(this, this.playerInfo.player.id)
    
            let candidates = filterMap(this.actionCache, (k, act)=>act === Action.NORMAL)
            // 若无人possible, 直接完结, 撒花~
            if(candidates.length === 0) {
                break;
            } 
    
            // 对于所有并非Impossible也没有refuse的人提出要求
            let msg = `[${this.playerInfo.player.id}] 为 [${this.cardType.name} ${this.ruseCanProceed || '的无懈'} 寻求无懈]`
            let buttons = [new Button(refuse, `不为本次 [${this.cardType.name}] 出无懈`)]
            let responses = candidates.map(c => {
                return this.wrapCallback(c[0], manager.sendHint(c[0], {
                    hintType: HintType.WU_XIE,
                    hintMsg: msg,
                    extraButtons: buttons
                }))
            })
            try {
                // 若有人使用无懈, 第一个回复的人将获得此次无懈的资格. 
                let resp = await promiseAny(responses)
                //   > 对所有人发出取消serverHint的申请
                // 将无懈牌扔进processing workflow
                //   > 开启新的一轮寻求无懈
                this.ruseCanProceed = !this.ruseCanProceed
            } catch (err) {
                // 若无人使用无懈, 则break, 本轮宣告完结, 撒花~
                console.log('无人使用无懈, 进行结算')
                break;
            }
        }
        return this.ruseCanProceed
    }
    
    private async wrapCallback(player: string, p: Promise<PlayerAction>): Promise<PlayerAction> {
        let resp = await p
        let button = resp.actionData[UIPosition.BUTTONS][0]
        if(button === Button.OK.id) {
            return resp
        }
        if(button === refuse) {
            // 任何回复了 refuse 的人将不再被询问 (update actionCache)
            this.actionCache.set(player, Action.REFUSE)
        }
        throw 'this guy refused. He not gonna do it no more'
    }
}