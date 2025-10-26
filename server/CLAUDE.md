# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
uv sync                    # Install dependencies (requires Python 3.13+)
uv run server.py           # Run the MCP server
uv run ruff check .        # Run linter
uv run ruff format .       # Format code
uv run ruff check --fix .  # Auto-fix linting issues
```

## Prerequisites

Stockfish must be installed and available in PATH:
```bash
brew install stockfish  # macOS
```

## Architecture

This is a **Model Context Protocol (MCP) server** built with FastMCP that provides chess move computation capabilities.

### MCP Server Pattern

- **Entry Point**: [server.py](server.py) defines the MCP server and exposes tools
- **Tools**:
  - `compute_next_move(fen: str, token: str | None, engine_name: str) -> MoveResponse` - computes moves with validation
  - `list_engines() -> EngineListResponse` - returns available engine profiles
- **FastMCP**: Uses the `@mcp.tool` decorator to register functions as MCP tools
- **Server Execution**: Runs via `mcp.run()` which handles MCP protocol communication
- **Security**: Uses PASETO tokens to validate move sequences and prevent cheating

### Chess Engine Integration

- **Engine Wrapper**: [chess_engines.py](chess_engines.py) abstracts UCI engine communication
- **python-chess**: Handles FEN parsing (`chess.Board`) and UCI engine protocol (`chess.engine`)
- **Resource Management**: Persistent engine instances stored in module-level dictionary, shut down on exit
- **Engine Configuration**: Engine profiles loaded from YAML configuration file with Pydantic validation
- **Multiple Engines**: Default engine profiles defined in [engines.yaml](engines.yaml):
  - `chess-potato-ai-3000`: The default engine (10s time limit)
  - `badfish`: Modified Stockfish designed to play poorly (depth 1, 1s time limit)
  - `stockfish_level_0`: Minimum strength for casual play (Skill Level 0, 800 ELO, depth 12, 1.5s)
  - `stockfish_default`: Stockfish's default strength (no constraints)
  - `stockfish_unbeatable`: Maximum strength configuration (Skill Level 20, depth 24, 5.0s, 512MB hash)

### Move Computation Flow

1. Client sends FEN string and optional token via MCP protocol
2. `compute_next_move()` tool receives FEN and validates token (if present)
3. Validates FEN transition is legal from previous position
4. Delegates to `chess_engines.compute_next_move_cached()` with selected engine
5. Gets or creates persistent engine instance via `get_engine()`
6. Creates `chess.Board` from FEN
7. Requests move with engine-specific depth/time constraints via `engine.play()`
8. Returns best move in UCI format (e.g., "e2e4"), resulting FEN, and new signed token
9. Engine process remains running for subsequent moves

### Error Handling

All exceptions are caught and re-raised as `ValueError` with descriptive messages:
- `EngineTerminatedError`: Engine crashed or not found
- `ValueError`: Invalid FEN string
- Generic `Exception`: Catch-all for unexpected errors

## Configuration

### Engine Configuration

Engine profiles are configured via YAML with strict Pydantic validation. The server loads configuration from:

1. `engines.local.yaml` (if present, for local overrides - **not committed to git**)
2. `engines.yaml` (default configuration - **committed to git**)
3. Custom path via `CPAI3000_ENGINES_CONFIG` environment variable

**Example engine configuration:**

```yaml
engines:
  - key: my-engine              # Required: unique identifier
    path: stockfish             # Required: executable path or name in PATH
    display_name: My Engine     # Required: human-readable name
    description: Custom engine  # Required: brief description
    depth: 18                   # Optional: search depth in plies
    time_limit: 2.5             # Optional: time limit in seconds
    options:                    # Optional: UCI engine options (int/bool/str)
      Skill Level: 10
      UCI_LimitStrength: true
      UCI_Elo: 1500
      Hash: 256
      Threads: 2
```

**Validation:**
- All fields are type-checked by Pydantic at startup
- UCI `options` must have values of type `int`, `bool`, or `str`
- Invalid configuration causes immediate server startup failure with helpful error messages

**To add/modify engines:**
1. Copy `engines.yaml` to `engines.local.yaml`
2. Edit `engines.local.yaml` with your custom engines
3. Restart the server

### Other Configuration

- **No environment variables required** - The server generates secure random keys and uses sensible defaults
- **Stockfish required** - Must be installed and available in PATH (`brew install stockfish` on macOS)
- **CORS origins** - Optionally set `CPAI3000_ALLOWED_ORIGINS` environment variable (defaults to localhost:5173,3000)
- **Token expiration** - Optionally set `TOKEN_EXPIRATION_SECONDS` environment variable (defaults to 3600)

## Ruff Configuration

- **Line Length**: 100 characters
- **Target Version**: Python 3.13
- **Enabled Rules**: Error (E), Pyflakes (F), Import sorting (I), Naming (N), Warning (W), Pyupgrade (UP)
