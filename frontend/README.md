# Chess Potato AI 3000 Frontend

This package contains the browser client for Chess Potato AI 3000. It is a React 19 + Vite application with a retro UI that talks to the MCP server for gameplay, engine moves, and post-game feedback.

## Features

- interactive chess board powered by Chessground
- retro desktop-game presentation built on top of `98.css`
- browser-side move validation with `chess.js`
- MCP client integration for engine moves and evaluation flows
- installable PWA shell for the frontend and bundled static assets
- responsive layout for desktop and mobile play

## Prerequisites

- Node.js 20+
- npm
- a running Chess Potato AI 3000 server for full gameplay

For local development, the frontend expects the server at `http://localhost:8000/mcp` when the app itself is running on localhost.

Production builds read `VITE_MCP_SERVER_URL` through the environment. The GitHub Pages workflow expects a repository secret named `PAGES_MCP_SERVER_URL`. For other deployments, provide `VITE_MCP_SERVER_URL` through your own CI or shell environment.

## Development

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```

Or run the combined check command:

```bash
npm run check
```

## Production Preview

```bash
npm run build
npm run preview
```

## PWA Notes

- the app exposes a web app manifest at `/manifest.webmanifest`
- the service worker is registered from `src/main.tsx` in production builds only
- development mode intentionally does not run a service worker, which avoids stale caches and generated `dev-dist` noise
- offline support is limited to the frontend shell and bundled static assets; live engine calls still require the server

## Project Structure

- `src/App.tsx`: root application component
- `src/ChessGame.tsx`: main gameplay flow and state orchestration
- `src/ChessBoard.tsx`: Chessground integration wrapper
- `src/services/`: MCP client and payload helpers
- `src/stores/`: client-side state stores

## License

The frontend is part of the main Chess Potato AI 3000 project and is distributed under GPLv3. See the repository root for the full project context and [../THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) for third-party licensing notes.
