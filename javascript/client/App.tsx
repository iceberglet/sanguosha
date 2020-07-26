import * as React from 'react';
import UIBoard from './ui/UIBoard';
import GameContext from '../common/GameContext';
import Player, { Identity } from '../common/Player';
import { General } from '../common/GeneralManager'
import Card, { cardManager, CardSize, CardType } from '../common/cards/Card';
import { PlayerInfo } from '../common/PlayerInfo';

export default function App() {
    let p = new Player('tester-1')
    let player = new PlayerInfo(p, Identity.ZHU_GONG, General.standard_zhang_liao)
    player.addCard(cardManager.getShuffledDeck()[0], 'hand')
    player.addCard(cardManager.getShuffledDeck()[0], 'hand')
    player.addCard(cardManager.getShuffledDeck()[0], 'hand')
    player.addCard(cardManager.getShuffledDeck()[0], 'hand')
    player.addCard(new Card('diamond', CardSize.FIVE, CardType.GUAN_SHI), 'equip')
    player.addCard(new Card('spade', CardSize.SIX, CardType.LE_BU), 'judge')
    player.addCard(new Card('heart', CardSize.QUEEN, CardType.SHAN_DIAN), 'judge')
    
    let player2 = new PlayerInfo(new Player('欧阳挠挠'), Identity.ZHONG_CHEN, General.forest_dong_zhuo)
    player2.addCard(cardManager.getShuffledDeck()[0], 'hand')
    player2.addCard(new Card('spade', CardSize.QUEEN, CardType.ZHANG_BA), 'equip')
    player2.addCard(new Card('spade', CardSize.KING, CardType.DA_YUAN), 'equip')
    player2.addCard(new Card('diamond', CardSize.KING, CardType.HUA_LIU), 'equip')
    player2.addCard(new Card('diamond', CardSize.ACE, CardType.ZHU_QUE), 'judge', 'le_bu')
    player2.hp = 2;

    let player3 = new PlayerInfo(new Player('东郭旭銮'), Identity.FAN_ZEI, General.standard_cao_cao)
    player3.addCard(cardManager.getShuffledDeck()[0], 'hand')
    player3.addCard(new Card('heart', CardSize.KING, CardType.ZHUA_HUANG), 'equip')

    let player4 = new PlayerInfo(new Player('新荷'), Identity.FAN_ZEI, General.standard_huang_gai)
    player4.addCard(new Card('club', CardSize.JACK, CardType.TIE_SUO), 'judge', 'bing_liang')
    player4.hp = 1

    let player5 = new PlayerInfo(new Player('Iceberglet'), Identity.FAN_ZEI, General.standard_guan_yu)
    
    let player6 = new PlayerInfo(new Player('广东吴彦祖'), Identity.FAN_ZEI, General.standard_ma_chao)
    player6.addCard(new Card('club', CardSize.TWO, CardType.BA_GUA), 'equip')
    
    let player7 = new PlayerInfo(new Player('豫章铁锅'), Identity.FAN_ZEI, General.standard_zhang_fei)
    player7.hp = 3

    let player8 = new PlayerInfo(new Player('tester-8'), Identity.FAN_ZEI, General.standard_xu_chu)

    let context = new GameContext([player, player2, player3, player4, player5, player6, player7, player8])
    return <UIBoard 
        context={context}
        myId={p.id}
    />
}



{/* <UICard card={cardManager.getShuffledDeck()[0]} isShown={false} 
        onMouseClick={c=>console.log('click')}
        onMouseDown={c=>console.log('down')}
        onMouseUp={c=>console.log('up')}
    /> */}