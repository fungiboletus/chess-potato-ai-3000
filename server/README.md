# Chess MCP Server

A Model Context Protocol (MCP) server that provides chess move computation and board evaluation using multiple UCI engines.

## Features

- `compute_next_move(fen: str, token: str | None = None, engine_name: str = "chess-potato-ai-3000")`
- `list_engines()`
- `evaluate_fens(fens: list[str], tokens: list[str], player_is_white: bool | None = None, invert_turns: list[bool] | None = None)`
- Signed move tokens for transition validation between requests
- Multiple bundled engine profiles configured through `engines.yaml`
- Health endpoint at `/health` and MCP endpoint at `/mcp`

## Requirements

- Python 3.14+
- Stockfish chess engine installed and available in PATH

If you want the Docker image to bundle all supported engines, clone the repository with submodules:

```bash
git clone --recurse-submodules https://github.com/fungiboletus/chess-potato-ai-3000.git
```

## Installation

```bash
# Install Stockfish (macOS)
brew install stockfish

# Install dependencies
uv sync
```

## Usage

```bash
# Run the MCP server
uv run server.py
```

For local verification after dependency changes:

```bash
uv sync --dev
uv run pytest
uv run ruff check .
```

## Docker Build

The server image uses a multi-stage build to bundle these engines into a single runtime image:

- `chess-potato-ai-3000` from this repository's `uci/` project
- `chess-potato-random` from `engines/chess-potato-random`
- `potato-alphabet-3000` from `engines/potato-alphabet-3000`
- `badfish` from `engines/Badfish`
- `worstfish` from `engines/worstfish`
- Debian's packaged `stockfish`

Build it from the repository root:

```bash
docker build -f server/Dockerfile .
```

## Configuration

Engine profiles live in `engines.yaml`. You can override the file location with the `CPAI3000_ENGINES_CONFIG` environment variable.

## Development

```bash
# Run linter
uv run ruff check .

# Format code
uv run ruff format .

# Auto-fix issues
uv run ruff check --fix .
```

## Example

```python
fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
move = compute_next_move(fen, engine_name="stockfish")
```
