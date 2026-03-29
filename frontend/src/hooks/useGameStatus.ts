import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import useChessStore from '../stores/chessStore';
import { getGameStatusText } from '../utils/gameResultI18n';

export const useGameStatus = () => {
  const { t } = useTranslation();
  const { gameState, chess, gameResult } = useChessStore();

  // Compute game status dynamically based on current state
  const gameStatus = useMemo(() => {
    const checkStatus = chess.isCheck() ? `${t('status.check')} ` : '';

    switch (gameState) {
      case 'initializing':
        return t('status.initializing');

      case 'player_turn':
        return `${checkStatus}${t('status.your_turn')}`;

      case 'ai_turn':
        return `${checkStatus}${t('status.ai_to_move')}`;

      case 'ai_thinking':
        return t('status.ai_thinking');

      case 'game_over':
        return getGameStatusText(t, gameResult);

      default:
        return t('status.initializing');
    }
  }, [t, gameState, chess, gameResult]);

  return gameStatus;
};
