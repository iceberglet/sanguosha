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
import { shuffle, flattenMap, delay } from "../common/util/Util";
import FactionPlayerInfo from "./FactionPlayerInfo";
import { HintType, GeneralSelectionResult } from "../common/ServerHint";
import GameStatsCollector from "../server/GameStatsCollector";
import { SequenceAwareSkillPubSub } from "./skill/SkillPubsub";
import FactionWarSkillRepo from "./skill/FactionWarSkillRepo";
import { SkillStatus } from "./skill/Skill";
import { Faction } from "../common/General";

const myMode = GameModeEnum.FactionWarGame
const generalsToPickFrom = 7

export default class FactionWarGameHoster implements GameHoster {

    circus: Circus
    choices: Array<Array<FactionWarGeneral>>
    initializer = new FactionWarInitializer()
    manager: GameManager
    statsCollector: GameStatsCollector
    skillRepo: FactionWarSkillRepo

    constructor(private registry: PlayerRegistry, private numberOfPlayer: number) {
        registry.pubsub.on<SkillStatus>(SkillStatus, this.onSkillStatusUpate)
    }

    init(): void {
        console.log('[选将] 进入准备工作, 分发将牌, 等待玩家选将')
        this.choices = this.generateGeneralChoices(this.numberOfPlayer)
        this.circus = new Circus()
        this.circus.playerNo = this.numberOfPlayer
        this.manager = null
    }

    async onPlayerConnected(playerId: string): Promise<void> {
        if(!this.manager) {
            if(!this.circus.statuses.find(s => s.player.id === playerId))  {
                let status = new PlayerPrepChoice({id: playerId})
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
            this.manager.onPlayerReconnected(playerId)
            this.skillRepo.getSkills(playerId).forEach(s => {
                this.manager.send(playerId, s.toStatus())
            })
        }
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
        let context = new GameServerContext(this.circus.statuses.map(s => {
                                                let info = new FactionPlayerInfo(s.player, s.chosenGeneral, s.chosenSubGeneral)
                                                info.init()
                                                return info
                                            }), 
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

        this.skillRepo = new FactionWarSkillRepo(this.manager, skillRegistry)
        resolver.register(this.skillRepo)

        this.initializer.init(this.manager)
        //强制广播context
        this.circus.statuses.forEach(s => {
            this.manager.onPlayerReconnected(s.player.id)
        })
        
        //1. display results (by sending a server hint to all ppl)
        //2. wait till all are okay to proceed
        //3. init again
        //4. broadcast new circus again
        //5. start asking general selections (note we can take the responders from 2. as players for next round)
        this.manager.startGame().then((ids)=>{
            this.init()
            ids.forEach(id => {
                let status = new PlayerPrepChoice({id})
                this.circus.statuses.push(status)
            })
            Promise.all(this.circus.statuses.map(sta => this.addNewPlayer(sta)))
        })
    }

    generateGeneralChoices(playerNo: number) {
        let choices: Array<Array<FactionWarGeneral>> = []

        let gs = flattenMap(allGenerals).map(g => g[1])
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
                choice.push(gs.splice(cursor, 1)[0])
            }
            if(choice.length < equalSize) {
                choice.push(...gs.splice(0, equalSize - choice.length))
            }
            choices.push(choice)
        }
        return choices
    }
}

export class Circus {
    statuses: PlayerPrepChoice[] = []
    gameMode: GameModeEnum = myMode
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
    
    constructor(public readonly player: Player) {

    }

    static sanitize(status: PlayerPrepChoice, id: string): PlayerPrepChoice {
        if(!status) {
            throw 'What??'
        }
        if(id === status.player.id) {
            return status
        } else {
            let copy = new PlayerPrepChoice(status.player)
            copy.chosenGeneral = status.chosenGeneral? FactionWarGeneral.soldier_male : null
            copy.chosenSubGeneral = status.chosenSubGeneral? FactionWarGeneral.soldier_male : null
            return copy
        }
    }
}