# Chess MCP Server

A Model Context Protocol (MCP) server that provides chess move computation using UCI engines (Stockfish by default).

## Features

- **Single Tool**: `compute_next_move(fen: str) -> str`
  - Takes a chess position in FEN format
  - Returns the best move in UCI format (e.g., "e2e4")
  - Uses Stockfish engine with configurable depth (default: 10)

## Requirements

- Python 3.13+
- Stockfish chess engine installed and available in PATH

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

## Configuration

Edit the constants in `server.py`:

- `ENGINE_PATH`: Path to UCI engine (default: "stockfish")
- `DEFAULT_DEPTH`: Search depth (default: 10)
- `DEFAULT_TIME_LIMIT`: Time limit in seconds (default: 1.0)

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
