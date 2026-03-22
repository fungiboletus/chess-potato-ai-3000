# Chess MCP Server

A Model Context Protocol (MCP) server that provides chess move computation using UCI engines (Stockfish by default).

## Features

- **Single Tool**: `compute_next_move(fen: str) -> str`
  - Takes a chess position in FEN format
  - Returns the best move in UCI format (e.g., "e2e4")
  - Uses Stockfish engine with configurable depth (default: 10)

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
# The tool accepts FEN notation
fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
move = compute_next_move(fen)
# Returns: "e2e4" (or another strong opening move)
```
