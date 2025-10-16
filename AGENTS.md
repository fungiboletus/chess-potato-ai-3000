# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev        # Start Vite dev server at http://localhost:5173
npm run build      # TypeScript check + production build
npm run typecheck  # Run TypeScript type checking without emitting files
npm run lint       # Run ESLint
npm run lint:fix   # Run ESLint and auto-fix issues
npm run format     # Format code (runs eslint --fix)
npm run check      # Run both typecheck and lint (useful before commits)
npm run preview    # Preview production build locally
```

## Architecture

### State Management (Zustand)

The application uses a centralized Zustand store ([src/stores/chessStore.ts](src/stores/chessStore.ts)) that implements a **state machine pattern** for game flow:

- **Game States**: `initializing` → `player_turn` ↔ `ai_turn` → `ai_thinking` → `game_over`
- **Turn Management**: The `updateTurnState()` method is the central state transition function called after every move
- **AI Move Handling**: Uses a module-level `aiMoveTimeout` variable to prevent race conditions; always clear this timeout before state changes
- **Critical Flow**: State transitions must check for game-over conditions before updating turn state

### Component Architecture

**Provider Pattern**: The app is wrapped in `ChessGameProvider` ([src/providers/ChessGameProvider.tsx](src/providers/ChessGameProvider.tsx)) which initializes the game on mount.

**Window Components**: UI follows a Windows 98-style draggable window pattern:
- `DraggableWindow`: Base wrapper component using react-draggable
- `ChessGameWindow`: Main game window containing the chess board
- `MoveHistoryWindow`, `HelpWindow`, `GameResultWindow`, `LanguageWindow`: Modal-style windows with z-index management

**Chessground Integration**:
- `ChessBoard` component ([src/ChessBoard.tsx](src/ChessBoard.tsx)) wraps the Chessground library
- `useChessgroundConfig` hook generates Chessground configuration from store state
- The Chessground API reference is stored in the Zustand store for programmatic board updates

### Chess Logic

- **chess.js**: Handles all game rules, move validation, and game-over detection
- **Move Flow**: Player moves trigger `makePlayerMove()` → update store → `updateTurnState()` → AI move if needed
- **Legal Moves**: Calculated from chess.js and exposed to Chessground via the `legalMoves` Map

## Internationalization (i18n)

The application supports multiple languages using i18next:
- Translation files: [src/i18n/locales/](src/i18n/locales/) (en, fr, es, no)
- Browser language detection with localStorage caching
- Language selection via LanguageWindow component
- Use `useTranslation()` hook for translated strings in components

## TypeScript Configuration

- **Strict Mode**: All strict checks enabled including `noUnusedLocals`, `noUnusedParameters`
- **Module Resolution**: Uses `bundler` mode for Vite
- **Linting**: React hooks linting enforced via ESLint

## Coding Guidelines

- **Separation of Concerns**: Keep chess game logic (chess.js) separate from UI components (Chessground)
- **Functional Components**: Use React functional components with hooks exclusively
- **Type Safety**: Leverage TypeScript strict typing; no `any` types
- **State Updates**: All game state changes must go through Zustand store actions
- **Mobile Responsive**: Test all UI changes on mobile viewports
- **98.css Styling**: Use 98.css classes for consistent retro Windows 98 aesthetic
- **AI Integration**: The codebase is prepared for future REST API integration to replace the simple random-move AI

## Future Extension Points

The README notes these are planned enhancements:
- REST API integration for sophisticated AI engines
- UCI protocol support for advanced chess engines
- Player vs Player online functionality
- Game analysis and position evaluation
