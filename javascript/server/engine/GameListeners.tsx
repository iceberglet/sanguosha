import { PlayerAction, UIPosition } from "../../common/PlayerAction";
import { CardType } from "../../common/cards/Card";
import { PlayerInfo } from "../../common/PlayerInfo";
import ArrayList from "../../common/util/ArrayList";
import GameManager from "../GameManager";
import { ServerHint } from "../../common/ServerHint";
import SlashFlow from "../flows/SlashFlow";


export type CardPlayedListener = (playerAction: PlayerAction, cardType: CardType, context: GameManager)=>void
export type StageEnterListener = (context: GameManager) => void
export type StageExitListener = (context: GameManager) => void
export type DamageListener = (context: GameManager, player: PlayerInfo, source: PlayerInfo, damageAmount: number) => void
export type HealListener = (context: GameManager, player: PlayerInfo, source: PlayerInfo, healAmount: number) => void
export type DeathListener = (context: GameManager, dead: PlayerInfo, killer: PlayerInfo) => void

export default class GameListeners {
    public onCardPlayed = new ArrayList<CardPlayedListener>()
    public onStageEnter = new ArrayList<StageEnterListener>()
    public onStageExit = new ArrayList<StageExitListener>()
    public onDamage = new ArrayList<DamageListener>()
    public onHeal = new ArrayList<HealListener>()
    public onDeath = new ArrayList<DeathListener>()

    public init() {
        this.onCardPlayed.add((action, type, manager)=>{
            //出杀
            if(type.isSlash()) {
                let targets = manager.context.sortFromPerspective(action.actionSource, action.actionData[UIPosition.PLAYER])
                manager.prependFlows(...targets.map(t => new SlashFlow(action, t)))
            } else if(type.isNonDelayedRuse()) {
                //非延时锦囊
            }

            throw `Donno how this card is played... ${type}`
        })
        
        this.onCardPlayed.addToFront((action, type, manager)=>{
            
        })
    }



}
