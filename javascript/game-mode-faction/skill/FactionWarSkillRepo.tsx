import Multimap from "../../common/util/Multimap";
import { SimpleConditionalSkill, EventRegistryForSkills, SkillStatus, Skill } from "./Skill";
import { RevealEvent } from "../FactionWarInitializer";
import GameManager from "../../server/GameManager";
import FactionPlayerInfo from "../FactionPlayerInfo";
import { JianXiong, LuoYi, GangLie, TuXi, GuiCai, FanKui, QinGuo, LuoShen, TianDu, ShenSu, DuanLiang, QiangXi, FangZhu, XingShang, JuShou, JieMing, QuHu, YiJi } from "./FactionSkillsWei";
import { describer } from "../../common/util/Describer";
import { GameMode } from "../../common/GameMode";


class FactionSkillProvider {

    _map = new Map<string, (pid: string)=>Skill>()

    public register(skillId: string, provider: (pid: string)=>Skill) {
        this._map.set(skillId, provider)
        describer.register(skillId, provider('dummy').description)
    }

    public get(skillId: string, playerId: string): Skill {
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
FactionSkillProviders.register('遗计', pid => new YiJi(pid))
FactionSkillProviders.register('倾国', pid => new QinGuo(pid))
FactionSkillProviders.register('洛神', pid => new LuoShen(pid))
FactionSkillProviders.register('神速', pid => new ShenSu(pid))
FactionSkillProviders.register('据守', pid => new JuShou(pid))
FactionSkillProviders.register('断粮', pid => new DuanLiang(pid))
FactionSkillProviders.register('强袭', pid => new QiangXi(pid))
FactionSkillProviders.register('放逐', pid => new FangZhu(pid))
FactionSkillProviders.register('行殇', pid => new XingShang(pid))
FactionSkillProviders.register('节命', pid => new JieMing(pid))
FactionSkillProviders.register('驱虎', pid => new QuHu(pid))

export default class FactionWarSkillRepo {
    
    //player id => skills
    private allSkills = new Multimap<string, Skill>()

    constructor(private readonly manager: GameManager, private readonly skillRegistry: EventRegistryForSkills) {
        manager.context.playerInfos.forEach(info => {
            let facInfo = info as FactionPlayerInfo
            facInfo.getSkills(GameMode.get(manager.context.gameMode)).forEach(skill => {
                this.allSkills.set(facInfo.player.id, skill)
                skill.hookup(this.skillRegistry, manager)
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

    public getSkills(pid: string): Set<Skill> {
        return this.allSkills.get(pid)
    }

    public getSkill(pid: string, skillId: string) {
        let skill: Skill
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