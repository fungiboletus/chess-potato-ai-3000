import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
import useChessStore from '../stores/chessStore';

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
        if (gameResult) {
          return gameResult.type === 'win' ? t('status.checkmate_you_win') :
            gameResult.type === 'lose' ? t('status.checkmate_ai_wins') :
              t('status.draw');
        }
        return t('status.draw');

      default:
        return t('status.initializing');
    }
  }, [t, gameState, chess, gameResult]);

  return gameStatus;
};
