"""Chess engine wrapper for computing moves using UCI engines."""

import asyncio
import logging
import os
import random
from pathlib import Path
from typing import Any, TypedDict

import chess
import chess.engine
import chess.polyglot
import yaml
from pydantic import BaseModel, Field, field_validator

logger = logging.getLogger(__name__)

# Move variation cache: stores up to 3 variations per FEN position
_move_cache: dict[tuple[str, str], list[MoveData]] = {}

# Global persistent engine instances keyed by engine name
_engines: dict[str, chess.engine.UciProtocol] = {}


class EngineProfile(BaseModel):
    """Configuration describing how to launch and tune a chess engine."""

    key: str = Field(..., description="Unique identifier for this engine profile")
    path: str = Field(..., description="Path to the UCI engine executable")
    display_name: str = Field(..., description="Human-readable name for the engine")
    description: str = Field(
        ..., description="Brief description of the engine's characteristics"
    )
    depth: int | None = Field(None, description="Search depth limit (plies)")
    time_limit: float | None = Field(None, description="Time limit in seconds")
    options: dict[str, int | bool | str] = Field(
        default_factory=dict, description="UCI engine options"
    )
    default: bool = Field(False, description="Whether this is the default engine")

    @field_validator("options")
    @classmethod
    def validate_options(cls, v: dict[str, Any]) -> dict[str, int | bool | str]:
        """Validate that all UCI option values are int, bool, or str."""
        for key, value in v.items():
            if not isinstance(value, (int, bool, str)):
                raise ValueError(
                    f"UCI option '{key}' has invalid type {type(value).__name__}. "
                    "Must be int, bool, or str."
                )
        return v


class EngineConfigFile(BaseModel):
    """Root configuration model for engines.yaml file."""

    engines: list[EngineProfile] = Field(..., description="List of engine profiles")


def _load_engine_profiles() -> dict[str, EngineProfile]:
    """Load engine profiles from YAML configuration file."""
    # Check for config file path in environment variable
    config_path_str = os.getenv("CPAI3000_ENGINES_CONFIG")

    if config_path_str:
        config_path = Path(config_path_str)
    else:
        # Default to engines.yaml in the same directory as this module
        config_path = Path(__file__).parent / "engines.yaml"

        # Also check for engines.local.yaml (for local overrides)
        local_config_path = Path(__file__).parent / "engines.local.yaml"
        if local_config_path.exists():
            config_path = local_config_path

    if not config_path.exists():
        raise FileNotFoundError(
            f"Engine configuration file not found: {config_path}\n"
            f"Create {config_path} or set CPAI3000_ENGINES_CONFIG environment variable."
        )

    try:
        with open(config_path) as f:
            config_data = yaml.safe_load(f)

        # Validate using Pydantic
        config = EngineConfigFile.model_validate(config_data)

        # Build dictionary keyed by engine key
        profiles = {profile.key: profile for profile in config.engines}

        if not profiles:
            raise ValueError(f"No engines defined in {config_path}")

        # Validate that at most one engine is marked as default
        default_engines = [p for p in profiles.values() if p.default]
        if len(default_engines) > 1:
            default_names = ", ".join(f"'{p.key}'" for p in default_engines)
            raise ValueError(
                f"Multiple engines marked as default in {config_path}: {default_names}. "
                "Only one engine can be marked as default."
            )

        return profiles

    except yaml.YAMLError as e:
        raise ValueError(f"Failed to parse YAML config {config_path}: {e}") from e
    except Exception as e:
        raise ValueError(f"Failed to load engine config from {config_path}: {e}") from e


# Load engine profiles from configuration file
_ENGINE_PROFILES: dict[str, EngineProfile] = _load_engine_profiles()


class MoveData(TypedDict):
    """Type for move computation result."""

    move: str
    fen: str


def _get_engine_profile(engine_name: str) -> EngineProfile:
    """Look up an engine profile by its name."""
    try:
        return _ENGINE_PROFILES[engine_name]
    except KeyError as exc:
        available = ", ".join(sorted(_ENGINE_PROFILES.keys()))
        raise ValueError(
            f"Unknown engine '{engine_name}'. Available engines: {available}"
        ) from exc


def get_available_engines() -> list[EngineProfile]:
    """Return metadata for all registered engine profiles."""
    return list(_ENGINE_PROFILES.values())


async def get_engine(engine_name: str) -> chess.engine.UciProtocol:
    """Get or initialize the persistent engine instance for a profile."""
    profile = _get_engine_profile(engine_name)
    engine = _engines.get(engine_name)
    if engine is None:
        logger.info(f"Initializing engine '{engine_name}' at {profile.path}")
        _transport, engine = await chess.engine.popen_uci(profile.path)
        options = profile.options
        if options:
            try:
                await engine.configure(options)
            except chess.engine.EngineError as exc:
                await engine.quit()
                _engines.pop(engine_name, None)
                raise ValueError(
                    f"Failed to configure engine '{engine_name}': {exc}"
                ) from exc

        _engines[engine_name] = engine
    return engine


async def shutdown_engines():
    """Gracefully shutdown all engine instances."""
    for _engine_name, engine in list(_engines.items()):
        try:
            await engine.quit()
        finally:
            _engines.pop(_engine_name, None)


async def compute_next_move(fen: str, engine_name: str) -> MoveData:
    """
    Compute the next best move for a given chess position.

    Args:
        fen: The chess position in FEN (Forsyth-Edwards Notation) format
        engine_name: The engine profile to use when computing the move

    Returns:
        MoveData containing:
            - move: The best move in UCI format (e.g., "e2e4")
            - fen: The resulting FEN after applying the move

    Raises:
        ValueError: If the FEN is invalid or engine fails
    """
    try:
        # Create board from FEN
        board = chess.Board(fen)

        # Get the persistent engine
        engine = await get_engine(engine_name)
        profile = _get_engine_profile(engine_name)

        # Get the best move with limits from the engine profile
        limit = chess.engine.Limit(depth=profile.depth, time=profile.time_limit)
        logger.info(
            f"[{engine_name}] Computing move (depth={profile.depth}, time={profile.time_limit}s)"
        )

        # The chess.engine logger will show UCI "info" lines here at DEBUG level
        result = await engine.play(board, limit)

        if result.move is None:
            raise ValueError("No valid moves available from the given position.")

        # Apply the move to get the new board state
        move = result.move.uci()
        board.push_uci(move)
        new_fen = board.fen()

        logger.info(f"[{engine_name}] Best move: {move}")

        # Return both the move and new FEN
        return {"move": move, "fen": new_fen}

    except chess.engine.EngineTerminatedError as e:
        raise ValueError(f"Chess engine error: {e}") from e
    except ValueError as e:
        raise ValueError(f"Invalid FEN string: {e}") from e
    except Exception as e:
        raise ValueError(f"Error computing move: {e}") from e


async def compute_next_move_cached(fen: str, engine_name: str) -> MoveData:
    """
    Compute the next best move with caching and variation support.

    For each unique FEN position:
    - First 3 calls: Computes new moves via the engine, building a cache of variations
    - Subsequent calls: Returns a random cached move with a few seconds simulated thinking delay

    Args:
        fen: The chess position in FEN (Forsyth-Edwards Notation) format
        engine_name: The engine profile to use when computing the move

    Returns:
        MoveData containing:
            - move: The best move in UCI format (e.g., "e2e4")
            - fen: The resulting FEN after applying the move

    Raises:
        ValueError: If the FEN is invalid or engine fails
    """
    cache_key = (engine_name, fen)

    # Check if we have fewer than 3 variations cached for this position
    if cache_key not in _move_cache or len(_move_cache[cache_key]) < 3:
        # Compute a new move and add to cache
        move_data = await compute_next_move(fen, engine_name)

        if cache_key not in _move_cache:
            _move_cache[cache_key] = []
        _move_cache[cache_key].append(move_data)

        # Return immediately (no sleep for cache-building phase)
        return move_data

    # We have 3 variations cached - return a random one with simulated thinking delay
    sleep_duration = random.uniform(0.5, 2.0)
    await asyncio.sleep(sleep_duration)

    return random.choice(_move_cache[cache_key])


def ensure_valid_transition(fen_start: str | None, fen_target: str):
    """Validate that the new FEN is reachable from the previous FEN."""

    if fen_start is None:
        board = chess.Board()
        # if the computer starts as white
        if board.fen() == fen_target:
            return
    else:
        board = chess.Board(fen_start)

    for mv in board.legal_moves:
        board.push(mv)
        if board.fen() == fen_target:
            return
        board.pop()

    raise ValueError("The target FEN is not reachable from the starting FEN.")


def compute_all_transitions(fens: list[str]) -> set[int]:
    """Compute all possible transitions, returning the zobrist hash set."""
    zobrist_hashes: set[int] = set()

    for fen in fens:
        board = chess.Board(fen)
        zobrist_hashes.add(chess.polyglot.zobrist_hash(board))
        print("Computing transitions for FEN:", fen)
        for mv in board.legal_moves:
            board.push(mv)
            print("Transition FEN:", board.fen())
            zobrist_hashes.add(chess.polyglot.zobrist_hash(board))
            board.pop()

    return zobrist_hashes


def ensure_fen_is_in_transitions(fen: str, valid_transitions: set[int]):
    """Validate that the FEN is in the set of valid transitions."""
    board = chess.Board(fen)
    fen_hash = chess.polyglot.zobrist_hash(board)
    if fen_hash not in valid_transitions:
        raise ValueError("The provided FEN is not in the set of valid transitions.")
