# Chess Potato AI 3000

Chess Potato AI 3000 is a novel chess AI that tries to play like human beginners. It has been train on many human games and uses a thought process to select its moves, targetting similar rates of mistakes and blunders.

## How It Was Made

You can read more about it on the blog post.

[Read the blog post](https://fungiboletus.github.io/chess-potato-ai-3000/article.html).

Because it is science, you are invited to share your thoughts and feedbacks after each game. Thank you.

## What Is In This Repository

- `frontend/`: React 19 + Vite web app with a retro desktop-game look.
- `server/`: Python MCP server that brokers engine calls, evaluation, and feedback storage.
- `uci/`: Python UCI engine entrypoint for the flagship engine.
- `lichess/`: Docker packaging for running the project through lichess-bot.
- `charts/`: Helm charts for the web stack and the Lichess bot deployment.
- `engines/`: bundled external engine sources used in the server image.

## Quick Start

The simplest local setup is:

- run the Python server in Docker so the bundled engine binaries are available
- run the frontend locally with Vite

From the repository root:

```bash
git submodule update --init --recursive
docker compose up --build server
```

In a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Then open `http://localhost:5173`.

When running on localhost, the frontend connects to the local MCP server at `http://localhost:8000/mcp`.

### Server

- Python 3.14
- `uv`

```bash
cd server
uv sync --dev
uv run server.py
```

Useful checks:

```bash
uv run pytest
uv run ruff check .
```

### UCI Engine

```bash
cd uci
uv sync --dev
uv run pytest
uv run python main.py
```

## License

The main project source is licensed under [GPLv3](LICENSE).

This repository also includes or references third-party engine sources and model assets with their own licenses or usage terms. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for a concise summary.
