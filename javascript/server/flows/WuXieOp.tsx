import GameManager from "../GameManager";
import { CardType } from "../../common/cards/Card";
import { Button, PlayerAction, UIPosition, getFromAction } from "../../common/PlayerAction";
import { CardPos } from "../../common/transit/CardPos";
import { filterMap, promiseAny } from "../../common/util/Util";
import { HintType } from "../../common/ServerHint";
import { ICard } from "../../common/cards/ICard";
import { CardBeingPlayedEvent } from "./Generic";

const REFUSE = 'refuse'
const REFUSE_ALL = 'refuse_all'


type WuXieProcessor = (resp: PlayerAction) => void

export class WuXieEvent {
    constructor(public wuxieAction: PlayerAction, ruseAction: PlayerAction) {}
}

export class WuXieContext {

    public processors = new Map<string, WuXieProcessor>()

    public constructor(private manager: GameManager, 
                        public ruseAction: PlayerAction, 
                        public readonly ruseCard: ICard) {
        // 检查所有人的手牌查看是否有无懈, 没有的直接 null 处理
        manager.context.playerInfos.filter(p => !p.isDead).forEach(p => {
            if(p.getCards(CardPos.HAND).filter(c => c.type === CardType.WU_XIE).length > 0) {
                this.processors.set(p.player.id, this.processNormal)
            }
        })
        // publish WuXieFlow event, 比如卧龙和曹仁有技能可以当做无懈可击, 他们会将 null 改回 自己的flow
        manager.beforeFlowHappen.publish(this, ruseAction.actionSource)
    }

    /**
     * 多目标锦囊对其中一个人的无懈效果 或者单锦囊对其目标的效果
     * returns true - 锦囊牌失效
     * @param onPlayer 
     */
    public async doOneRound(onPlayer: string): Promise<boolean> {
        //these people are the only ones who can do it
        let candidates = filterMap(this.processors, (k, v)=>!!v)
        let isRuseAbort = false
        let pplNotInterestedInThisPlayer = new Set<string>()

        //不断地反复无懈 (因为无懈还可以无懈)
        while(true) {

            candidates = candidates.filter(kv=>{
                //有无懈牌并且没有放弃无懈的权利
                return this.manager.context.getPlayer(kv[0]).getCards(CardPos.HAND).filter(c => c.type === CardType.WU_XIE).length > 0
                        && !pplNotInterestedInThisPlayer.has(kv[0])
            })

            // 若无人possible, 直接完结, 撒花~
            if(candidates.length === 0) {
                return isRuseAbort
            }
    
            // 对于所有并非Impossible也没有refuse的人提出要求
            let msg = `[${onPlayer}] 为 [${this.ruseCard.type.name}${isRuseAbort? '的无懈' : ''}] 寻求无懈]`
            //OK, Cancel, Refuse, [Refuse All]
            let buttons = [Button.CANCEL, new Button(REFUSE, `放弃针对[${onPlayer}]的无懈`)]
            if(this.ruseCard.type.isDelayedRuse()) {
                buttons.push(new Button(REFUSE_ALL, `不为本次 [${this.ruseCard.type.name}] 出无懈`))
            }

            let responses = candidates.map(async c => {
                        let resp = await this.manager.sendHint(c[0], {
                            hintType: HintType.WU_XIE,
                            hintMsg: msg,
                            extraButtons: buttons
                        })
                        let button = resp.actionData[UIPosition.BUTTONS][0]
                        if(button === Button.OK.id) {
                            return resp
                        }
                        if(button === REFUSE) {
                            // 任何回复了 refuse 的人本次将不再被询问
                            pplNotInterestedInThisPlayer.add(c[0])
                        } else if (button === REFUSE_ALL) {
                            // 任何回复了 refuse_all 的人本次及以后将不再被询问
                            pplNotInterestedInThisPlayer.add(c[0])
                            this.processors.delete(c[0])
                        }
                        throw `${c[0]}拒绝了无懈`
                    })
            try {
                // 若有人使用无懈, 第一个回复的人将获得此次无懈的资格. 
                let resp = await promiseAny(responses)
                // 取消对所有人征求无懈的请求
                this.manager.rescindAll()
                // Invoke potentially custom wu_xie process
                this.processors.get(resp.actionSource)(resp)

                // 开启新的一轮寻求无懈
                isRuseAbort = !isRuseAbort
            } catch (err) {
                // 若无人使用无懈, 则break, 本轮宣告完结, 撒花~
                console.log('无人使用无懈, 进行锦囊牌结算', err)
                //取消对所有人征求无懈的请求
                this.manager.rescindAll()
                return isRuseAbort
            }
        }
    }

    private processNormal=(action: PlayerAction)=>{
        let card = getFromAction(action, UIPosition.MY_HAND)[0]
        console.log(`打出了${card}作为无懈`)
        this.manager.sendToWorkflow(action.actionSource, CardPos.HAND, [this.manager.getCard(card)])
        this.manager.afterFlowDone.publish(new CardBeingPlayedEvent(action, this.manager.interpret(action.actionSource, card)), action.actionSource)
    }
}