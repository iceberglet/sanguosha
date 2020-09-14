import Multimap from "../../common/util/Multimap";
import { SimpleConditionalSkill, EventRegistryForSkills, SkillStatus, Skill, GeneralSkillStatusUpdate, HiddenType } from "./Skill";
import { RevealEvent } from "../FactionWarInitializer";
import GameManager from "../../server/GameManager";
import FactionPlayerInfo from "../FactionPlayerInfo";
import { JianXiong, LuoYi, GangLie, TuXi, GuiCai, FanKui, QinGuo, LuoShen, TianDu, ShenSu, DuanLiang, QiangXi, FangZhu, XingShang, JuShou, JieMing, QuHu, YiJi, QiaoBian, XiaoGuo } from "./FactionSkillsWei";
import { describer } from "../../common/util/Describer";
import { GameMode } from "../../common/GameMode";
import { LongDan, Rende, WuSheng, PaoXiao, MaShu, TieQi, BaZhen, HuoJi, KanPo, KuangGu, LieGong, JiLi, XiangLe, FangQuan, QiCai, JiZhi } from "./FactionSkillsShu";
import { Stage } from "../../common/Stage";
import { PlayerInfo } from "../../common/PlayerInfo";


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
FactionSkillProviders.register('巧变', pid => new QiaoBian(pid))
FactionSkillProviders.register('骁果', pid => new XiaoGuo(pid))


FactionSkillProviders.register('龙胆', pid => new LongDan(pid))
FactionSkillProviders.register('仁德', pid => new Rende(pid))
FactionSkillProviders.register('武圣', pid => new WuSheng(pid))
FactionSkillProviders.register('咆哮', pid => new PaoXiao(pid))
FactionSkillProviders.register('马术', pid => new MaShu(pid))
FactionSkillProviders.register('铁骑', pid => new TieQi(pid))
FactionSkillProviders.register('火计', pid => new HuoJi(pid))
FactionSkillProviders.register('八阵', pid => new BaZhen(pid))
FactionSkillProviders.register('看破', pid => new KanPo(pid))
FactionSkillProviders.register('狂骨', pid => new KuangGu(pid))
FactionSkillProviders.register('烈弓', pid => new LieGong(pid))
FactionSkillProviders.register('蒺藜', pid => new JiLi(pid))
FactionSkillProviders.register('放权', pid => new FangQuan(pid))
FactionSkillProviders.register('享乐', pid => new XiangLe(pid))
FactionSkillProviders.register('集智', pid => new JiZhi(pid))
FactionSkillProviders.register('奇才', pid => new QiCai(pid))

export default class FactionWarSkillRepo {
    
    //player id => skills
    private allSkills = new Multimap<string, Skill>()

    //player id => skillid => disablers
    private disablers: Disabler[] = []

    constructor(private readonly manager: GameManager, private readonly skillRegistry: EventRegistryForSkills) {
        manager.context.playerInfos.forEach(info => {
            let facInfo = info as FactionPlayerInfo
            facInfo.getSkills(GameMode.get(manager.context.gameMode)).forEach(skill => {
                this.addSkill(facInfo.player.id, skill)
                skill.bootstrapServer(this.skillRegistry, manager)
            })
        })
        manager.adminRegistry.onGeneral<RevealEvent>(RevealEvent, this.onRevealEvent)
        manager.adminRegistry.onGeneral<GeneralSkillStatusUpdate>(GeneralSkillStatusUpdate, this.onGeneralSkillUpdate)
    }

    public addSkill(p: string, skill: Skill) {
        console.log('[技能] 添加技能', p, skill.id)
        this.allSkills.set(p, skill)
    }

    public async onClientUpdateSkill(ss: SkillStatus): Promise<void> {
        let skill = this.allSkills.getArr(ss.playerId).find(s => s.id === ss.id)
        console.log(skill.isForewarned, ss.isForewarned, skill.isRevealed, ss.isRevealed)
        if(skill.isForewarned !== ss.isForewarned) {
            console.log('[技能] 改变技能预亮', skill.id, skill.playerId, ss.isForewarned)
            skill.isForewarned = ss.isForewarned
            await skill.onStatusUpdated(this.manager)
        }
        if(skill.isRevealed !== ss.isRevealed && ss.isRevealed) {
            if(skill.hiddenType === HiddenType.REVEAL_IN_MY_USE_CARD && 
                this.manager.currPlayer().player.id === skill.playerId &&
                this.manager.currEffect.stage === Stage.USE_CARD) {
                console.log('[技能] 想要reveal??', skill.id, skill.playerId, ss.isRevealed)
                await this.manager.events.publish(new RevealEvent(skill.playerId, skill.isMain, !skill.isMain))
                //会通过Reveal Event 来 update skill
                // await skill.onStatusUpdated(this.manager)
            } else {
                console.warn('[技能] 只能在你自己的出牌阶段里reveal!', skill.id, skill.playerId, ss.isRevealed)
            }
        }
        //update this player's skill status
        this.manager.send(ss.playerId, skill.toStatus())
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

    private onGeneralSkillUpdate = async (update: GeneralSkillStatusUpdate): Promise<void> => {
        let abilities = (update.isMain? update.target.general : update.target.subGeneral).abilities
        let marks = update.isMain? update.target.mainMark : update.target.subMark
        //只有武将牌上的受到影响
        let skills = this.allSkills.getArr(update.target.player.id).filter(s => abilities.find(a => a === s.id))
        if(!update.includeLocked) {
            skills = skills.filter(s => !s.isLocked)
        }
        console.log('[技能] 收到对武将牌封禁的修改', update.reason, update.target.player.id, skills.map(s => s.id))

        for(let s of skills) {
            let disabler = this.disablers.find(d => d.playerId === s.playerId && d.skillId === s.id)
            console.log('[技能] 已有的封禁理由: ', s.id, disabler? disabler.reasons : [])
            if(update.enable) {
                //除掉之前的disabler, 
                if(!disabler || !disabler.reasons.has(update.reason)) {
                    throw 'Impossible!, How can we enable if we did NOT disable?'
                }
                disabler.reasons.delete(update.reason)
                delete marks[update.reason]
                
                //如果干净了, 我们才恢复
                if(disabler.reasons.size === 0) {
                    console.log('[技能] 恢复技能', s.playerId, s.id)
                    s.isDisabled = false
                    await s.onStatusUpdated(this.manager)
                    this.manager.send(s.playerId, s.toStatus())
                }
            } else {
                //如果已经disable了, 不要再来一次
                if(!disabler) {
                    disabler = new Disabler(s.playerId, s.id)
                    this.disablers.push(disabler)
                }
                if(disabler.reasons.size === 0) {
                    console.log('[技能] 禁止技能', s.playerId, s.id)
                    //进行disable作业
                    s.isDisabled = true
                    await s.onStatusUpdated(this.manager)
                    this.manager.send(s.playerId, s.toStatus())
                }

                marks[update.reason] = update.reason
                //加我们一个disabler
                disabler.reasons.add(update.reason)
            }
            this.manager.broadcast(update.target as PlayerInfo, PlayerInfo.sanitize)
        }
    }

    private onRevealEvent= async (e: RevealEvent): Promise<void> => {
        let skills = this.allSkills.getArr(e.playerId)
        for(let skill of skills) {
            if(skill.isMain && e.mainReveal) {
                skill.isRevealed = true
            }
            if(!skill.isMain && e.subReveal) {
                skill.isRevealed = true
            }
            console.log('[技能] 有武将明置, 技能展示', e.playerId, skill.id, skill.isRevealed)
            await skill.onStatusUpdated(this.manager)
            this.manager.send(e.playerId, skill.toStatus())
        }
    }

}

class Disabler {

    reasons = new Set<string>()

    constructor(public playerId: string,
                public skillId: string) {}
}