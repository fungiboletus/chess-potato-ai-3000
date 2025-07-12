import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useChessStore from '../stores/chessStore';

export const useTranslatedGameStatus = () => {
  const { t } = useTranslation();
  const { gameState, gameResult, playerColor, chess } = useChessStore();

  useEffect(() => {
    const updateGameStatus = () => {
      const state = useChessStore.getState();

      if (state.gameState === 'game_over' && gameResult) {
        const statusMessage = gameResult.type === 'win' ? t('game.victory') :
          gameResult.type === 'lose' ? t('game.defeat') :
            t('game.draw');

        // Update the status directly
        useChessStore.setState({ gameStatus: statusMessage });
        return;
      }

      if (state.gameState === 'ai_thinking') {
        useChessStore.setState({ gameStatus: t('game.thinking') });
        return;
      }

      // For other states, generate appropriate status
      const checkStatus = chess.isCheck() ? 'Check! ' : '';

      if (state.gameState === 'player_turn') {
        const colorText = t(`colors.${playerColor}`);
        useChessStore.setState({
          gameStatus: `${checkStatus}${t('game.playing_as')} ${colorText}`
        });
      } else if (state.gameState === 'ai_turn') {
        useChessStore.setState({
          gameStatus: `${checkStatus}AI to move`
        });
      } else if (state.gameState === 'initializing') {
        useChessStore.setState({
          gameStatus: t('game.title')
        });
      }
    };

    updateGameStatus();
  }, [t, gameState, gameResult, playerColor, chess]);
};
