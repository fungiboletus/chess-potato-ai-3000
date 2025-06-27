# Chess Potato AI 3000

A retro-styled chess game built with React, TypeScript, and Vite, featuring the classic Windows 98 aesthetic.

## Features

- **Random Color Selection**: On each game start, the player is randomly assigned white or black pieces
- **Interactive Chess Board**: Powered by Chessground from Lichess for smooth gameplay
- **Simple AI Opponent**: Random move AI for casual play
- **Retro UI**: Authentic Windows 98 styling using 98.css
- **Mobile Responsive**: Optimized for both desktop and mobile devices
- **Move History**: Track all moves in algebraic notation
- **Game Status**: Real-time game state updates in the status bar
- **Progress Indicator**: Visual feedback when AI is thinking

## Technologies Used

- **React 19** with TypeScript for the frontend framework
- **Vite** for fast development and building
- **chess.js** for chess game logic and move validation
- **chessground** for the interactive chess board UI
- **98.css** for retro Windows 98-style styling

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository or download the files
2. Install dependencies:

   ```bash
   npm install
   ```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

### Building for Production

Build the application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## How to Play

1. **Game Start**: When the page loads, you'll be randomly assigned white or black pieces
2. **Making Moves**: Click and drag pieces to make your moves
3. **AI Response**: The AI will automatically respond after your move
4. **New Game**: Click "New Game" to start fresh with a new random color assignment
5. **Resign**: Use the "Resign" button to concede the game (disabled until first move)

## Project Structure

- `src/ChessGame.tsx` - Main game component managing state and AI
- `src/ChessBoard.tsx` - Chessground integration wrapper
- `src/index.css` - Styling with 98.css and responsive design
- `src/App.tsx` - Root application component

## Future Enhancements

This project is designed to be extended with:

- REST API integration for more sophisticated AI engines
- UCI protocol support for advanced chess engines
- Player vs Player online functionality
- Game analysis and position evaluation

## License

This project is open source and available under the MIT License.
