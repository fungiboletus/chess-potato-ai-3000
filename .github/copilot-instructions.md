# Copilot Instructions for Chess-Potato-AI-3000

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a TypeScript React Vite application for playing chess against an AI. The project uses:
- **chess.js** for chess game logic and move validation
- **chessground** from Lichess for the interactive chess board UI
- **98.css** for retro Windows 98-style styling
- **React** with TypeScript for the frontend framework
- **Vite** for fast development and building

## Key Components
- `ChessGame`: Main game component that manages game state and AI interaction
- `ChessBoard`: Wrapper component for chessground integration
- Mobile-friendly responsive design
- Random color selection (player vs AI)

## Coding Guidelines
- Use TypeScript with strict typing
- Follow React functional component patterns with hooks
- Maintain clean separation between chess logic and UI components
- Ensure mobile responsiveness for all screen sizes
- Use 98.css classes for consistent retro styling
- Handle chess moves with proper validation via chess.js
- Prepare for future REST API integration for AI moves

## Dependencies
- chess.js: Chess game engine and move validation
- chessground: Interactive chess board from Lichess
- 98.css: Retro Windows 98 CSS framework
- React: Frontend framework
- Vite: Build tool and dev server
