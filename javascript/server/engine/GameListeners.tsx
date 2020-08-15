import { PlayerAction, UIPosition } from "../../common/PlayerAction";
import { CardType } from "../../common/cards/Card";
import { PlayerInfo } from "../../common/PlayerInfo";
import ArrayList from "../../common/util/ArrayList";
import GameManager from "../GameManager";
import SlashFlow from "../flows/SlashFlow";
import { TextFlashEffect, TransferCardEffect } from "../../common/transit/EffectTransit";
import { CardPos } from "../../common/transit/CardPos";
// import { CardTransfer } from "../../common/Impact";


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
                //show effects
                manager.broadcast(new TextFlashEffect(action.actionSource, targets.map(t => t.player.id), '杀'))
                let cards = action.actionData[UIPosition.MY_HAND]
                if(cards) {
                    //show card coming from player
                    manager.broadcast(new TransferCardEffect(action.actionSource, null, cards))
                    //show card at center of playground
                    // manager.broadcast(new CardTransfer(action.actionSource, CardPos.HAND, null, CardPos.WORKFLOW, cards))
                    //actually put cards in temp storage? not needed?
                }

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
