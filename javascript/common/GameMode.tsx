import { CardManager, CardType } from "./cards/Card";
import { IdentityWarCards } from "../game-mode-identity/IdentityWarCardSet";
import { FactionWarCards } from "../game-mode-faction/FactionWarCardSet";
import FactionWarActionResolver from "../game-mode-faction/FactionWarActionResolver";
import { ActionResolver } from "../server/context/PlayerActionResolver";
import GameManager from "../server/GameManager";
import { GameHoster } from "../server/GameHoster";
import FactionWarGameHoster from "../game-mode-faction/FactionWarGameHoster";
import { PlayerRegistry } from "../server/PlayerRegistry";
import { GameModeEnum } from "./GameModeEnum";
import { Skill } from "../game-mode-faction/skill/Skill";
import { FactionSkillProviders } from "../game-mode-faction/skill/FactionWarSkillRepo";
import { describer } from "./util/Describer";


export interface Initializer {
    
    /**
     * initialize game manager after
     * @param manager 
     */
    init(manager: GameManager): void
}

export class GameMode {

    private static rules = new Map<GameModeEnum, GameMode>()

    public static get(name: GameModeEnum) {
        let rule = this.rules.get(name)
        if(!rule) {
            throw `Cannot find game mode! ${name}`
        }
        return rule
    }

    public constructor(public readonly id: GameModeEnum, 
                        public readonly name: string, 
                        public readonly cardManager: CardManager,
                        public readonly resolver: ActionResolver,
                        public readonly gameHosterProvider: (registry: PlayerRegistry, no: number)=>GameHoster,
                        public readonly skillProvider: (skillId: string, playerId: string)=>Skill<any>,
                        public readonly initClient: ()=>void) {
        GameMode.rules.set(id, this)
    }

    // public abstract init(manager: GameManager): void

    // public abstract isTheGameEnded(): boolean
}

new GameMode(GameModeEnum.IdentityWarGame, '身份局', IdentityWarCards, 
                null, null, null, null)
new GameMode(GameModeEnum.FactionWarGame, '国战', FactionWarCards, 
                new FactionWarActionResolver(),
                (registry, no) => new FactionWarGameHoster(registry, no),
                (s, p)=>FactionSkillProviders.get(s, p), ()=>{
                    describer.register(CardType.TENG_JIA.id, '锁定技，【南蛮入侵】、【万箭齐发】和普通【杀】对你无效。当你受到火焰伤害时，此伤害+1。')
                    describer.register(CardType.SILVER_LION.id, '锁定技，当你受到伤害时，若此伤害多于1点，则防止多余的伤害；当你失去装备区里的【白银狮子】时，你回复1点体力。')
                    describer.register(CardType.REN_WANG.id, '锁定技，黑色的【杀】对你无效。')
                    describer.register(CardType.BA_GUA.id, '每当你需要使用或打出一张【闪】时，你可以进行一次判定：若判定结果为红色，则视为你使用或打出了一张【闪】。')
                    describer.register(CardType.QI_LIN.id, '当你使用【杀】对目标角色造成伤害时，你可以弃置其装备区里的一张坐骑牌。')
                    describer.register(CardType.ZHU_QUE.id, '你可以将一张普通【杀】当具火焰伤害的【杀】使用。')
                    describer.register(CardType.ZHANG_BA.id, '你可以将两张手牌当【杀】使用或打出。')
                    describer.register(CardType.GUAN_SHI.id, '当你使用的【杀】被抵消时，你可以弃置两张牌，则此【杀】依然造成伤害。')
                    describer.register(CardType.SAN_JIAN.id, '你使用【杀】对目标角色造成伤害后，可弃置一张手牌并对该角色距离1的另一名角色造成1点伤害。')
                    describer.register(CardType.WU_LIU.id, '锁定技，与你势力相同的其他角色攻击范围+1。')
                    describer.register(CardType.HAN_BING.id, '当你使用【杀】对目标角色造成伤害时，若该角色有牌，你可以防止此伤害，改为依次弃置其两张牌。')
                    describer.register(CardType.CI_XIONG.id, '当你使用【杀】指定一名异性角色为目标后，你可以令其选择一项：弃一张手牌；或令你摸一张牌。')
                    describer.register(CardType.QING_GANG.id, '锁定技，当你使用【杀】指定一名角色为目标后，无视其防具。')
                    describer.register(CardType.LIAN_NU.id, '出牌阶段，你可以使用任意数量的【杀】。')
                    describer.register(CardType.BING_LIANG.id, '出牌阶段，对距离为1的一名其他角色使用。将【兵粮寸断】放置于该角色的判定区里，若判定结果不为梅花，跳过其摸牌阶段。')
                    describer.register(CardType.LE_BU.id, '出牌阶段，对一名其他角色使用。将【乐不思蜀】放置于该角色的判定区里，若判定结果不为红桃，则跳过其出牌阶段。')
                    describer.register(CardType.SHAN_DIAN.id, '出牌阶段，对自己使用。将【闪电】放置于自己的判定区里。若判定结果为黑桃2~9，则目标角色受到3点雷电伤害。若判定不为此结果，将之移动到下家的判定区里。')
                    describer.register(CardType.WU_GU.id, '出牌阶段，对所有角色使用。你从牌堆亮出等同于现存角色数量的牌，每名目标角色选择并获得其中的一张。')
                    describer.register(CardType.TAO_YUAN.id, '出牌阶段，对所有角色使用。每名目标角色回复1点体力。')
                    describer.register(CardType.NAN_MAN.id, '出牌阶段，对所有其他角色使用。每名目标角色需打出一张【杀】，否则受到1点伤害。')
                    describer.register(CardType.WAN_JIAN.id, '出牌阶段，对所有其他角色使用。每名目标角色需打出一张【闪】，否则受到1点伤害。')
                    describer.register(CardType.YUAN_JIAO.id, '出牌阶段，对有明置武将牌且与你势力不同的一名角色使用。该角色摸一张牌，然后你摸三张牌。')
                    describer.register(CardType.ZHI_JI.id, '出牌阶段，对一名其他角色使用。观看其一张暗置的武将牌或其手牌。重铸，出牌阶段，你可以将此牌置入弃牌堆，然后摸一张牌。')
                    describer.register(CardType.YI_YI.id, '出牌阶段，对你和与你势力相同的角色使用。每名目标角色各摸两张牌，然后弃置两张牌。')
                    describer.register(CardType.HUO_GONG.id, '该角色展示一张手牌，然后若你弃置一张与所展示牌相同花色的手牌，则【火攻】对其造成1点火焰伤害。')
                    describer.register(CardType.TIE_SUO.id, '连环: 出牌阶段使用，分别横置或重置其武将牌（被横置武将牌的角色处于“连环状态 ·即使第一名受伤害的角色死亡，也会令其它处于连环状态的角色受到该属性伤害。 ·经由连环传导的伤害不能再次被传导。重铸: 出牌阶段，你可以将此牌置入弃牌堆，然后摸一张牌。')
                    describer.register(CardType.WU_XIE.id, '抵消目标锦囊对一名角色产生的效果；或抵消另一张无懈可击产生的效果。')
                    describer.register(CardType.JIE_DAO.id, '出牌阶段，对装备区里有武器牌的一名其他角色使用。该角色需对其攻击范围内，由你指定的另一名角色使用一张【杀】，否则将装备区里的武器牌交给你。')
                    describer.register(CardType.SHUN_SHOU.id, '出牌阶段，对距离为1且区域内有牌的一名其他角色使用。你获得其区域内的一张牌。')
                    describer.register(CardType.GUO_HE.id, '出牌阶段，对一名区域内有牌的其他角色使用。你将其区域内的一张牌弃置。')
                    describer.register(CardType.WU_ZHONG.id, '出牌阶段，对自己使用。摸两张牌。')
                    describer.register(CardType.JUE_DOU.id, '出牌阶段，对一名其他角色使用。由该角色开始，你与其轮流打出一张【杀】，首先不出【杀】的一方受到另一方造成的1点伤害。')
                    describer.register(CardType.WU_XIE_GUO.id, '抵消目标锦囊牌对一名角色或一种势力产生的效果，或抵消另一张【无懈可击】产生的效果。')
                })
