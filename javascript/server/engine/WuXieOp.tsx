import GameManager from "../GameManager";
import { CardType } from "../../common/cards/Card";
import { Button } from "../../common/PlayerAction";
import { CardPos } from "../../common/transit/CardPos";
import { filterMap, promiseAny, delay } from "../../common/util/Util";
import { HintType } from "../../common/ServerHint";
import { CardBeingPlayedEvent } from "./Generic";
import { PlayerInfo } from "../../common/PlayerInfo";
import PlayerAct from "../context/PlayerAct";

const REFUSE = 'refuse'
const REFUSE_ALL = 'refuse_all'


type WuXieProcessor = (resp: PlayerAct) => Promise<void>

export class WuXieContext {

    public processors = new Map<string, WuXieProcessor>()

    public constructor(private manager: GameManager, 
                        public readonly ruseType: CardType) {
    }

    public async init() {
        // 检查所有人的手牌查看是否有无懈, 没有的直接 null 处理
        this.manager.context.playerInfos.filter(p => !p.isDead).forEach(p => {
            if(p.getCards(CardPos.HAND).filter(c => c.type.isWuxie()).length > 0) {
                this.processors.set(p.player.id, async(act) => this.processNormal(act))
            }
        })
        // publish WuXieFlow event, 比如卧龙和曹仁有技能可以当做无懈可击, 他们会将 null 改回 自己的flow
        await this.manager.events.publish(this)
    }

    /**
     * 多目标锦囊对其中一个人的无懈效果 或者单锦囊对其目标的效果
     * returns true - 锦囊牌失效
     * @param onPlayer 
     */
    public async doOneRound(onPlayer: PlayerInfo): Promise<boolean> {
        //these people are the only ones who can do it
        let candidates = filterMap(this.processors, (k, v)=>!!v)
        let isRuseAbort = false
        let pplNotInterestedInThisPlayer = new Set<string>()

        //不断地反复无懈 (因为无懈还可以无懈)
        while(true) {

            candidates = candidates.filter(kv=>{
                //有无懈牌并且没有放弃无懈的权利
                return this.manager.context.getPlayer(kv[0]).getCards(CardPos.HAND).filter(c => c.type.isWuxie()).length > 0
                        && !pplNotInterestedInThisPlayer.has(kv[0])
            })

            // 若无人possible, 直接完结, 撒花~
            if(candidates.length === 0) {
                return isRuseAbort
            }
    
            // 对于所有并非Impossible也没有refuse的人提出要求
            let msg = `[${onPlayer.player.id}] 为 [${this.ruseType.name}${isRuseAbort? '的无懈' : ''}] 寻求无懈]`
            //OK, Cancel, Refuse, [Refuse All]
            let buttons = [Button.CANCEL, new Button(REFUSE, `放弃针对[${onPlayer.player.id}]的无懈`)]
            if(this.ruseType.isDelayedRuse()) {
                buttons.push(new Button(REFUSE_ALL, `不为本次 [${this.ruseType.name}] 出无懈`))
            }

            this.manager.setPending(candidates.map(c => c[0]))
            let responses = candidates.map(async c => {
                        let resp = await this.manager.sendHint(c[0], {
                            hintType: HintType.WU_XIE,
                            hintMsg: msg,
                            extraButtons: buttons
                        }, true)
                        let button = resp.button
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
                this.processors.get(resp.source.player.id)(resp)

                // 开启新的一轮寻求无懈
                isRuseAbort = !isRuseAbort

                //防止大家直接就点了下一个...汗
                await delay(1000)
            } catch (err) {
                // 若无人使用无懈, 则break, 本轮宣告完结, 撒花~
                console.log('[无懈的结算] 无人使用无懈, 进行锦囊牌结算', err)
                //取消对所有人征求无懈的请求
                this.manager.rescindAll()
                return isRuseAbort
            }
        }
    }

    private async processNormal(action: PlayerAct): Promise<void> {
        let card = action.getSingleCardAndPos()[0]
        console.log(`[无懈的结算] 打出了${card.id}作为无懈`)
        card.description = `${action.source.player.id} 打出`
        this.manager.sendToWorkflow(action.source.player.id, CardPos.HAND, [card])
        await this.manager.events.publish(new CardBeingPlayedEvent(action.source.player.id, [[card, CardPos.HAND]], card.type))
    }
}