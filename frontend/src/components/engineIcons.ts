import { OFFLINE_ENGINE } from '../stores/chessStore';

const DEFAULT_ENGINE_ICON = './icons/engine-default.png';
const GENERIC_ENGINE_ICON = './icons/engine-generic.png';

/**
 * Returns the icon path for a given engine name.
 * Keeps mappings centralised so buttons and windows stay in sync.
 */
export const getEngineIcon = (engineName: string | null | undefined): string => {
  if (!engineName) {
    return DEFAULT_ENGINE_ICON;
  }

  switch (engineName) {
    case 'chess-potato-ai-3000':
      return './engines/potato.png';
    case 'badfish':
      return './engines/stockfish-goldfish.png';
    case 'worstfish':
      return './engines/stockfish-pirana.png';
    case 'stockfish_level_0':
      return './engines/stockfish_level_0.png';
    case 'random':
      return './engines/random.png';
    case 'alphabet':
      return './engines/alphabet.png';
    case OFFLINE_ENGINE:
      return './engines/offline.png';
    default:
      if (engineName.includes('stockfish')) {
        return './engines/stockfish.png';
      }
      return GENERIC_ENGINE_ICON;
  }
};

