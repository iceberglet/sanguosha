import Multimap from "../../common/util/Multimap";
import { Skill, EventRegistryForSkills, SkillStatus } from "./Skill";
import { RevealEvent } from "../FactionWarInitializer";
import GameManager from "../../server/GameManager";
import FactionPlayerInfo from "../FactionPlayerInfo";
import { playerActionDriverProvider } from "../../client/player-actions/PlayerActionDriverProvider";
import { HintType } from "../../common/ServerHint";
import PlayerActionDriverDefiner from "../../client/player-actions/PlayerActionDriverDefiner";
import { UIPosition } from "../../common/PlayerAction";
import { JianXiong, LuoYi, GangLie, TuXi, GuiCai, FanKui, QinGuo, LuoShen, TianDu, ShenSu, DuanLiang } from "./FactionSkillsWei";

class DummySkill extends Skill<void> {

    isLocked = false

    public hookup(skillRegistry: EventRegistryForSkills): void {
        //do-nothing
    }
    protected conditionFulfilled(event: void, manager: GameManager): boolean {
        return false
    }
    public async doInvoke(event: void, manager: GameManager): Promise<void> {
        //do-nothing
        return
    }
    public bootstrapClient(): void {
        playerActionDriverProvider.registerProvider(HintType.PLAY_HAND, (hint)=>{
            return new PlayerActionDriverDefiner('出牌阶段装备东西')
                    .expectChoose([UIPosition.MY_SKILL], 1, 1, (id, context)=>id === this.id)
                    .expectAnyButton('点击确定使用Dummy技能')
                    .build(hint)
        })
    }
    // public async onPlayerAction(act: PlayerAction): Promise<void> {
    //     throw 'Forgot to override me?'
    // }
    
}

class FactionSkillProvider {

    _map = new Map<string, (pid: string)=>Skill<any>>()

    public register(skillId: string, provider: (pid: string)=>Skill<any>) {
        this._map.set(skillId, provider)
    }

    public get(skillId: string, playerId: string): Skill<any> {
        // let dummy = new DummySkill(playerId)
        // dummy.displayName = skillId
        // dummy.id = skillId
        // return dummy
        let provider = this._map.get(skillId)
        if(!provider) {
            throw 'No Skill Provider Found for ' + skillId
        }
        return provider(playerId)
    }
}

export const FactionSkillProviders = new FactionSkillProvider()
FactionSkillProviders.register('奸雄', pid => new JianXiong(pid))
FactionSkillProviders.register('反馈', pid => new FanKui(pid))
FactionSkillProviders.register('鬼才', pid => new GuiCai(pid))
FactionSkillProviders.register('突袭', pid => new TuXi(pid))
FactionSkillProviders.register('刚烈', pid => new GangLie(pid))
FactionSkillProviders.register('裸衣', pid => new LuoYi(pid))
FactionSkillProviders.register('天妒', pid => new TianDu(pid))
// FactionSkillProviders.register('遗计', pid => new TianDu(pid))
FactionSkillProviders.register('倾国', pid => new QinGuo(pid))
FactionSkillProviders.register('洛神', pid => new LuoShen(pid))
FactionSkillProviders.register('神速', pid => new ShenSu(pid))
FactionSkillProviders.register('断粮', pid => new DuanLiang(pid))

export default class FactionWarSkillRepo {
    
    //player id => skills
    private allSkills = new Multimap<string, Skill<any>>()

    constructor(private readonly manager: GameManager, private readonly skillRegistry: EventRegistryForSkills) {
        manager.context.playerInfos.forEach(info => {
            let facInfo = info as FactionPlayerInfo
            facInfo.general.abilities.forEach(skillId => {
                this.addSkill(info.player.id, true, skillId, manager)
            })
            facInfo.subGeneral.abilities.forEach(skillId => {
                this.addSkill(info.player.id, false, skillId, manager)
            })
        })
        manager.adminRegistry.onGeneral<RevealEvent>(RevealEvent, this.onRevealEvent)
    }

    public onClientUpdateSkill(ss: SkillStatus) {
        this.allSkills.get(ss.playerId).forEach(s => {
            if(s.id === ss.id) {
                console.log('[技能] 改变技能预亮', s.id, s.playerId, ss.isForewarned)
                s.isForewarned = ss.isForewarned
            }
        })
    }

    public getSkills(pid: string): Set<Skill<any>> {
        return this.allSkills.get(pid)
    }

    public getSkill(pid: string, skillId: string) {
        let skill: Skill<any>
        this.allSkills.get(pid).forEach(s => {
            if(s.id === skillId) {
                skill = s
            }
        })
        if(!skill) {
            throw '[技能] 未找到技能: ' + pid + ' > ' + skillId
        }
        return skill
    }

    private addSkill(pid: string, isMain: boolean, skillId: string, manager: GameManager) {
        let skill = FactionSkillProviders.get(skillId, pid)
        skill.isMain = isMain
        this.allSkills.set(pid, skill)
        skill.hookup(this.skillRegistry, manager)
    }

    private onRevealEvent= async (e: RevealEvent): Promise<void> => {
        this.allSkills.get(e.playerId).forEach(skill => {
            if(skill.isMain && e.mainReveal) {
                skill.isRevealed = true
            }
            if(!skill.isMain && e.subReveal) {
                skill.isRevealed = true
            }
            console.log('[技能] 有武将明置, 技能展示', e.playerId, skill.id, skill.isRevealed)
            this.manager.send(e.playerId, skill.toStatus())
        })
    }

}

//todo: 加入所有的skill providers