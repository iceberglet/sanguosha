import { GameHoster } from "../server/GameHoster";
import GameManager from "../server/GameManager";
import FactionWarInitializer from "./FactionWarInitializer";
import FactionWarGeneral, { allGenerals } from "./FactionWarGenerals";
import { PlayerRegistry } from "../server/PlayerRegistry";
import { BlockedEquipment } from "../server/engine/Equipments";
import { Player } from "../common/Player";
import GameServerContext from "../server/context/GameServerContext";
import FactionWarActionResolver from "./FactionWarActionResolver";
import { GameModeEnum } from "../common/GameModeEnum";
import { shuffle, flattenMap, delay, reorder } from "../common/util/Util";
import FactionPlayerInfo from "./FactionPlayerInfo";
import { HintType, GeneralSelectionResult } from "../common/ServerHint";
import GameStatsCollector from "../server/GameStatsCollector";
import { SequenceAwareSkillPubSub } from "./skill/SkillPubsub";
import FactionWarSkillRepo from "./skill/FactionWarSkillRepo";
import { SkillStatus } from "../common/Skill";
import { Faction } from "../common/General";
import { CardPos, CardPosChangeEvent, CardRearrangeRequest } from "../common/transit/CardPos";
import { UIPosition } from "../common/PlayerAction";
import { cardSorter } from "../common/cards/Card";
import { SkinRequest, SurrenderRequest, VoiceRequest } from "../common/transit/EffectTransit";
import { PlayerInfo } from "../common/PlayerInfo";
import { canSurrender } from "./FactionWarUtil";
import GameEnding from "../server/GameEnding";

const myMode = GameModeEnum.FactionWarGame
const generalsToPickFrom = 7

export default class FactionWarGameHoster implements GameHoster {

    circus: Circus
    choices: Array<Array<FactionWarGeneral>>
    initializer = new FactionWarInitializer()
    manager: GameManager
    statsCollector: GameStatsCollector
    skillRepo: FactionWarSkillRepo
    seating: Array<number> //index for players

    constructor(private registry: PlayerRegistry, private numberOfPlayer: number) {
        registry.pubsub.on<SkillStatus>(SkillStatus, this.onSkillStatusUpate)
        registry.pubsub.on<CardPosChangeEvent>(CardPosChangeEvent, this.shiftCard)
        registry.pubsub.on<VoiceRequest>(VoiceRequest, (request)=>{
            registry.broadcast(request)
        })
        registry.pubsub.on<CardRearrangeRequest>(CardRearrangeRequest, p => {
            if(!this.manager) {
                return
            }
            console.log('整理手牌: ', p.requester)
            let player = this.manager.context.getPlayer(p.requester)
            player.getCards(CardPos.HAND).sort(cardSorter)
            this.manager.send(p.requester, player)
        })
        registry.pubsub.on<SurrenderRequest>(SurrenderRequest, s=>{
            console.log('玩家投降', s.player)
            if(canSurrender(s.player, this.manager?.context) && !this.manager.manualEnding) {
                this.manager.log(`${s.player} 投降了`)
                this.manager.broadcast(s)
                let winners = this.manager.getSortedByCurr(true).filter(p => p.player.id !== s.player).map(p => p.player.id)
                this.manager.manualEnding = new GameEnding(winners)
            }
        })
        registry.pubsub.on<SkinRequest>(SkinRequest, (r)=>{
            if(!this.manager) {
                return
            }
            console.log('更换皮肤', r.player, r.isMain)
            let p = this.manager.context.getPlayer(r.player) as FactionPlayerInfo
            let general = r.isMain? p.general : p.subGeneral
            if(general.skins === 0) {
                return
            }
            let curr = r.isMain? p.mainSkin : p.subSkin
            let idx = 1
            if(curr) {
                let currIdx = parseInt(curr.split('_').reverse()[0])
                idx = (currIdx + 1) % (general.skins + 1)
            }

            let skinName = null
            if(idx > 0) {
                let arr = general.id.split('_')
                arr.splice(0, 1)
                arr.unshift('skin')
                arr.push(idx.toString())
                skinName = arr.join('_')
            }

            if(r.isMain) {
                p.mainSkin = skinName
            } else {
                p.subSkin = skinName
            }
            this.manager.broadcast(p as PlayerInfo, PlayerInfo.sanitize)
        })
    }

    init(): void {
        console.log('[选将] 进入准备工作, 分发将牌, 等待玩家选将')
        this.choices = this.generateGeneralChoices(this.numberOfPlayer)
        this.seating = shuffle([0, 1, 2, 3, 4, 5, 6, 7].slice(0, this.numberOfPlayer))
        this.circus = new Circus()
        this.circus.playerNo = this.numberOfPlayer
        this.manager = null
    }

    async onPlayerConnected(playerId: string): Promise<void> {
        if(!this.manager) {
            if(!this.circus.statuses.find(s => s.player.id === playerId))  {
                let status = new PlayerPrepChoice({id: playerId}, this.seating.shift())
                this.circus.statuses.push(status)
                await this.addNewPlayer(status)
            } else {
                console.log('[选将] 玩家重连: ' + playerId)
                //circus
                this.registry.send(playerId, Circus.sanitize(this.circus, playerId))
                //pause a bit for UI to load on client
                await delay(300)
                //then server hint
                this.registry.onPlayerReconnected(playerId)
            }
        } else {
            await this.resendGameToPlayer(playerId)
        }
    }

    private async resendGameToPlayer(playerId: string) {
        this.manager.onPlayerReconnected(playerId)
        this.skillRepo.getSkills(playerId).forEach(s => {
            this.manager.send(playerId, s.toStatus())
        })
        
        //await a while so client is properly set up
        await delay(500)
        this.registry.onPlayerReconnected(playerId)
    }

    async addNewPlayer(player: PlayerPrepChoice): Promise<void> {
        //this player has no status
        console.log('[选将] 新玩家加入! ' + player.player.id, player)
        this.registry.broadcast(this.circus, Circus.sanitize)

        //pause a bit for UI to load on client
        await delay(300)
        //send a selection hint
        this.registry.sendServerAsk(player.player.id, {
            hintType: HintType.UI_PANEL,
            hintMsg: '选将',
            customRequest: {
                mode: 'choose',
                data: {
                    yourIdx: player.seating,
                    generals: this.choices.shift()
                }
            }
        }).then((resp) => {
            let res = resp.customData as GeneralSelectionResult
            player.chosenGeneral = allGenerals.get(res[0])
            player.chosenSubGeneral = allGenerals.get(res[1])
            this.registry.broadcast(this.circus, Circus.sanitize)
            this.tryStartTheGame()
        })
    }

    onSkillStatusUpate = (s: SkillStatus) => {
        this.skillRepo.onClientUpdateSkill(s)
    }

    tryStartTheGame(): void {
        if(this.choices.length === 0) {
            for(let s of this.circus.statuses) {
                if(!s.chosenGeneral || !s.chosenSubGeneral) {
                    return
                }
            }
            console.log('[选将] 准备完毕, 开始游戏!')
            this.startGame()
            return
        }
        console.log('[选将] 还没有准备好')
    }

    startGame(): void {
        if(!this.statsCollector) {
            this.statsCollector = new GameStatsCollector(this.circus.statuses.map(s => s.player))
        }
        let infos: Array<FactionPlayerInfo> = this.circus.statuses.sort((a, b)=>a.seating - b.seating).map(s => {
            let info = new FactionPlayerInfo(s.player, s.chosenGeneral, s.chosenSubGeneral)
            info.init()
            return info
        })
        let context = new GameServerContext(infos, 
                                            myMode, 
                                            (size)=>{
                                                this.manager.setDeckRemain(size)
                                            })
        this.initializer = new FactionWarInitializer()
        BlockedEquipment.reinit()

        let resolver = new FactionWarActionResolver()
        this.manager = new GameManager(context, this.registry, resolver, this.statsCollector);

        let skillRegistry = new SequenceAwareSkillPubSub(this.manager, 
                (ids: string[])=>context.sortFromPerspective(this.manager.currPlayer().player.id, ids).map(p => p.player.id))
        this.manager.init(skillRegistry)

        //instantiate all skill objects
        this.skillRepo = new FactionWarSkillRepo(this.manager, skillRegistry)
        resolver.register(this.skillRepo)

        this.initializer.init(this.manager)
        //强制广播context
        this.circus.statuses.forEach(status => {
            this.resendGameToPlayer(status.player.id)
        })
        
        //1. display results (by sending a server hint to all ppl)
        //2. wait till all are okay to proceed
        //3. init again
        //4. broadcast new circus again
        //5. start asking general selections (note we can take the responders from 2. as players for next round)
        this.manager.startGame().then((ids)=>{
            this.init()
            ids.forEach(id => {
                let status = new PlayerPrepChoice({id}, this.seating.shift())
                this.circus.statuses.push(status)
            })
            Promise.all(this.circus.statuses.map(sta => this.addNewPlayer(sta)))
        })
    }

    generateGeneralChoices(playerNo: number) {
        let choices: Array<Array<FactionWarGeneral>> = []

        // console.log(allGenerals.size)
        let gs = flattenMap(allGenerals).map(g => g[1])
        // console.log(gs.map(g => g.name))
        shuffle(gs)
        let equalSize = Math.min(Math.floor(gs.length / playerNo), generalsToPickFrom)
        if(equalSize < 3) {
            throw 'Not enough generals! ' + gs.length + ' ' + playerNo
        }
        console.log('[牌局] 每人选将', gs.length, equalSize)
        for(let i = 0; i < playerNo; ++i) {
            //old method: random
            // choices.push(gs.splice(0, equalSize))

            //new method: make sure there's no 4th faction
            let facs = new Set<Faction>()
            let choice: FactionWarGeneral[] = []
            let cursor = 0
            while(choice.length < equalSize && cursor < gs.length) {
                let candidate = gs[cursor]
                if(facs.size === 3 && !facs.has(candidate.faction)) {
                    cursor++
                    continue
                }
                facs.add(candidate.faction)
                // console.log('Adding for', i, cursor, gs[cursor].name)
                choice.push(gs.splice(cursor, 1)[0])
            }
            if(choice.length < equalSize) {
                // console.log('Adding remaining for', i, gs.map(g => g.name))
                choice.push(...gs.splice(0, equalSize - choice.length))
            }
            choices.push(choice)
        }
        return choices
    }

    private shiftCard = (event: CardPosChangeEvent) => {
        if(this.manager && event.pos === UIPosition.MY_HAND) {
            console.log('Player shifting his cards', event.player)
            let hand = this.manager.context.getPlayer(event.player).getCards(CardPos.HAND)
            reorder(hand, event.from, event.to)
        }
    }
}

export class Circus {
    statuses: PlayerPrepChoice[] = []
    gameMode: GameModeEnum = myMode
    //number of players
    playerNo: number

    static sanitize(circus: Circus, id: string) {
        let cir = new Circus()
        cir.playerNo = circus.playerNo
        cir.statuses = circus.statuses.map(s => PlayerPrepChoice.sanitize(s, id))
        cir.gameMode = circus.gameMode
        return cir
    }
}

export class PlayerPrepChoice {
    chosenGeneral: FactionWarGeneral
    chosenSubGeneral: FactionWarGeneral
    
    constructor(public readonly player: Player, public readonly seating: number) {

    }

    static sanitize(status: PlayerPrepChoice, id: string): PlayerPrepChoice {
        if(!status) {
            throw 'What??'
        }
        if(id === status.player.id) {
            return status
        } else {
            let copy = new PlayerPrepChoice(status.player, status.seating)
            copy.chosenGeneral = status.chosenGeneral? FactionWarGeneral.soldier_male : null
            copy.chosenSubGeneral = status.chosenSubGeneral? FactionWarGeneral.soldier_male : null
            return copy
        }
    }
}