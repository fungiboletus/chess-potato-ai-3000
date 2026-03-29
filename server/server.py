"""Chess MCP Server - Provides UCI engine move computation."""

import asyncio
import atexit
import json
import logging
import os
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any

import chess
import pyseto
import uvicorn
from fastmcp import FastMCP
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from chess_engines import (
    compute_all_transitions,
    ensure_fen_is_in_transitions,
    ensure_valid_transition,
    get_available_engines,
    shutdown_engines,
)
from chess_engines import (
    compute_next_move_cached as engine_compute_move,
)
from chess_evaluation import evaluate_position, shutdown_evaluator
from feedback_store import (
    FeedbackValidationError,
    ensure_feedback_database,
    normalize_feedback_submission,
    save_feedback_submission,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Enable DEBUG for chess.engine to see UCI protocol info lines
logging.getLogger("chess.engine").setLevel(logging.DEBUG)

logger = logging.getLogger(__name__)

# CORS Configuration
# Override in production with comma-separated origins (e.g., "https://app.example.com,https://chess.example.com")
ALLOWED_ORIGINS = os.getenv(
    "CPAI3000_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")

# Token Configuration
TOKEN_EXPIRATION_SECONDS = int(
    os.getenv("TOKEN_EXPIRATION_SECONDS", "3600")
)  # 1 hour (3600 seconds) by default
TOKEN_EVALUATION_ADDITIONAL_DELAY_SECONDS = int(
    os.getenv("TOKEN_EVALUATION_ADDITIONAL_DELAY_SECONDS", "86400")
)  # 1 day (86400 seconds) by default

# Create MCP server
mcp = FastMCP(
    name="Chess Engine Server",
)

# Secret Key Configuration
# Always generate a cryptographically secure 256-bit key
SECRET_KEY: str | None = os.getenv("CPAI3000_SECRET_KEY", None)

secret_key_bytes: bytes | None = None
if isinstance(SECRET_KEY, str):
    # Decode from hex if provided as a string
    secret_key_bytes = bytes.fromhex(SECRET_KEY)
else:
    logger.warning("No CPAI3000_SECRET_KEY provided - generating a random key")
    secret_key_bytes = secrets.token_bytes(32)

key = pyseto.Key.new(version=4, purpose="local", key=secret_key_bytes)


async def shutdown_all() -> None:
    """Gracefully shutdown all engines and evaluator."""
    await shutdown_engines()
    await shutdown_evaluator()


def shutdown_all_sync():
    """Synchronously shutdown all engines and evaluator with timeout."""

    try:
        asyncio.get_running_loop()
    except RuntimeError:
        pass
    else:
        logger.debug("Skipping synchronous shutdown because an event loop is already running")
        return

    try:
        asyncio.run(asyncio.wait_for(shutdown_all(), timeout=2.0))
    except TimeoutError:
        logger.warning("Shutdown timed out after 2 seconds")
    except Exception as e:
        logger.warning(f"Error during shutdown: {e}")


async def on_shutdown() -> None:
    """Run async cleanup on the active server event loop."""
    try:
        await asyncio.wait_for(shutdown_all(), timeout=2.0)
    except TimeoutError:
        logger.warning("Shutdown timed out after 2 seconds")
    except Exception as e:
        logger.warning(f"Error during shutdown: {e}")


# Register engine shutdown on exit
atexit.register(shutdown_all_sync)


class MoveResponse(BaseModel):
    """Response containing the computed move, resulting FEN, and signed token."""

    move: str
    fen: str
    token: str
    engine: str


class EngineInfoModel(BaseModel):
    """Metadata describing an available engine profile."""

    name: str
    display_name: str
    description: str
    default: bool


class EngineListResponse(BaseModel):
    """Response containing all engine profiles that can be selected."""

    engines: list[EngineInfoModel]


def check_token(token: str, evaluation: bool = False) -> str:
    """Check the token and return the FEN inside it."""
    try:
        decoded_token = pyseto.decode(key, token)
        payload = (  # pyright: ignore[reportUnknownVariableType, reportUnknownMemberType]
            decoded_token.payload
        )
        if not isinstance(payload, (bytes, bytearray)):
            raise ValueError("Token has no valid payload")

        decoded = json.loads(payload)

        # Check subject
        if decoded.get("sub") != "compute_next_move":
            raise ValueError(f"Invalid token subject: {decoded.get('sub')}")

        # Check expiration
        current_time = int(time.time())
        exp = decoded.get("exp")
        if exp is None:
            raise ValueError("Token missing expiration claim")

        if evaluation:
            exp += TOKEN_EVALUATION_ADDITIONAL_DELAY_SECONDS

        if current_time > exp:
            raise ValueError(f"Token expired (exp: {exp}, now: {current_time})")

        # Extract old FEN for transition validation
        return decoded.get("fen")

    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to decode token payload: {e}")
    except Exception as e:
        raise ValueError(f"Token validation failed: {e}")


@mcp.tool
async def compute_next_move(
    fen: str, token: str | None = None, engine_name: str = "chess-potato-ai-3000"
) -> MoveResponse:
    """
    Compute the next best move for a given chess position.

    Args:
        fen: The chess position in FEN (Forsyth-Edwards Notation) format
        token: Optional signed token from previous move for validation
        engine_name: The registered engine profile to use for computation
            (default: chess-potato-ai-3000)

    Returns:
        MoveResponse containing:
            - move: The best move in UCI format (e.g., "e2e4")
            - fen: The resulting FEN after applying the move
            - token: Signed token encoding the move and FEN

    Raises:
        ValueError: If token validation fails (invalid, expired, or subject mismatch)
    """
    # Validate token if present
    if token:
        old_fen = check_token(token)
    else:
        old_fen = None

    # Validate FEN transition if old FEN is available
    ensure_valid_transition(old_fen, fen)

    # Compute next move
    move_data = await engine_compute_move(fen, engine_name)
    move = move_data["move"]
    new_fen = move_data["fen"]

    # Create payload with move and FEN
    expiration = int(time.time()) + TOKEN_EXPIRATION_SECONDS
    payload = json.dumps(
        {
            "sub": "compute_next_move",
            "exp": expiration,
            "fen": new_fen,
        }
    ).encode()

    token_str: str = pyseto.encode(  # pyright: ignore[reportUnknownMemberType]
        key, payload
    ).decode("utf-8")

    return MoveResponse(move=move, fen=new_fen, token=token_str, engine=engine_name)


@mcp.tool
async def list_engines() -> EngineListResponse:
    """Return metadata for all available engine profiles."""
    engines = [
        EngineInfoModel(
            name=profile.key,
            display_name=profile.display_name,
            description=profile.description,
            default=profile.default,
        )
        for profile in get_available_engines()
    ]
    return EngineListResponse(engines=engines)


class PositionEvaluation(BaseModel):
    """Evaluation data for a single chess position."""

    expectation: float  # WDL expectation (0.0 to 1.0)
    score: int  # Centipawn score


class EvaluationResponse(BaseModel):
    """Response containing evaluation scores for multiple positions."""

    evaluations: dict[str, PositionEvaluation]  # FEN -> evaluation data


class FeedbackSubmissionResponse(BaseModel):
    """Response returned after storing post-game feedback."""

    submission_id: str
    stored: bool


def validate_feedback_tokens(
    raw_feedback: dict[str, Any], normalized_feedback: dict[str, Any]
) -> tuple[bool, list[str]]:
    issues: list[str] = []
    previous_fen = chess.Board().fen()
    raw_history = raw_feedback.get("history")
    history = normalized_feedback.get("history", [])
    engine_was_offline = bool(normalized_feedback.get("game", {}).get("engineWasOffline", False))
    saw_token = False

    if not isinstance(raw_history, list) or len(raw_history) != len(history):
        return False, ["feedback history did not match normalized payload"]

    for index, move in enumerate(history):
        current_fen = move["fen"]
        try:
            ensure_valid_transition(previous_fen, current_fen)
        except ValueError:
            issues.append(f"history[{index}] has an invalid transition")

        raw_move = raw_history[index]
        move_tokens: list[str] = []
        if isinstance(raw_move, dict):
            for token_key in ("evaluationToken", "continuationToken"):
                token_value = raw_move.get(token_key)
                if isinstance(token_value, str) and token_value:
                    move_tokens.append(token_value)

        if move_tokens:
            saw_token = True
            for token in move_tokens:
                try:
                    token_fen = check_token(token, evaluation=True)
                except ValueError:
                    issues.append(f"history[{index}] has an invalid token")
                    continue

                if token_fen != current_fen:
                    issues.append(f"history[{index}] token does not match move FEN")
        elif move["playerKey"] != "human" and not engine_was_offline:
            issues.append(f"history[{index}] is missing a validation token")

        previous_fen = current_fen

    final_fen = normalized_feedback.get("game", {}).get("finalFen")
    if history and final_fen != history[-1]["fen"]:
        issues.append("game.finalFen does not match the final move FEN")

    return saw_token and not issues, issues


@mcp.tool
async def evaluate_fens(
    fens: list[str],
    tokens: list[str],
    player_is_white: bool | None = None,
    invert_turns: list[bool] | None = None,
) -> EvaluationResponse:
    """
    Evaluate a list of FEN positions and return their scores using Stockfish's NNUE evaluation.

    Args:
        fens: List of chess positions in FEN format to evaluate
        tokens: Optional list of signed tokens corresponding to each FEN (for validation)
        player_is_white: If provided, orient evaluations from the human player's perspective
        invert_turns: Optional list of flags (aligned with FEN list) that explicitly request
            the evaluation be inverted relative to the active player in the FEN

    Returns:
        EvaluationResponse containing:
            - evaluations: Dictionary mapping FEN to PositionEvaluation with:
                - expectation: WDL expectation value (0.0=losing to 1.0=winning)
                - score: Centipawn evaluation (positive=advantage, ±10000=mate)

    Raises:
        ValueError: If token validation fails or FEN count doesn't match token count
    """
    # if len(fens) != len(tokens):
    #    raise ValueError(
    #        f"Mismatch: {len(fens)} FENs provided but {len(tokens)} tokens provided"
    #    )

    if invert_turns is not None and len(invert_turns) != len(fens):
        raise ValueError(
            f"Mismatch: {len(fens)} FENs provided but {len(invert_turns)} invert flags provided"
        )

    if len(tokens) > 1024:
        raise ValueError(f"Too many tokens provided: {len(tokens)} (maximum is 1024)")

    # validate all the tokens and extract FENs
    fens_from_tokens = [check_token(t, evaluation=True) for t in tokens]
    # add start position too
    fens_from_tokens.append(chess.Board().fen())
    logger.debug("Computed %d FENs from tokens for validation", len(fens_from_tokens))
    all_valid_transitions = compute_all_transitions(fens_from_tokens)

    # validate each fen against the valid transitions
    for fen in fens:
        ensure_fen_is_in_transitions(fen, all_valid_transitions)

    evaluations: dict[str, PositionEvaluation] = {}

    for idx, fen in enumerate(fens):
        # Evaluate the position
        inverse_turn = False

        if invert_turns is not None:
            inverse_turn = invert_turns[idx]
        elif player_is_white is not None:
            try:
                board = chess.Board(fen)
            except ValueError as exc:
                raise ValueError(f"Invalid FEN string '{fen}': {exc}") from exc

            board_turn_is_white = board.turn == chess.WHITE
            inverse_turn = board_turn_is_white != player_is_white

        result = await evaluate_position(fen, inverse_turn=inverse_turn)
        evaluations[fen] = PositionEvaluation(
            expectation=result["expectation"], score=result["score"]
        )

    return EvaluationResponse(evaluations=evaluations)


@mcp.tool
async def submit_game_feedback(feedback: dict[str, Any]) -> FeedbackSubmissionResponse:
    """Store post-game feedback and associated game metadata in SQLite."""
    submission_id = str(uuid.uuid7())
    try:
        normalized_feedback = normalize_feedback_submission(feedback)
        tokens_validated, validation_issues = validate_feedback_tokens(
            feedback, normalized_feedback
        )
        record = save_feedback_submission(
            submission_id,
            normalized_feedback,
            tokens_validated=tokens_validated,
            validation_issues=validation_issues,
        )
    except FeedbackValidationError as exc:
        logger.info("Rejected feedback submission: %s", exc)
        raise ValueError("Feedback submission rejected") from exc
    except Exception as exc:
        logger.exception("Failed to store feedback submission")
        raise RuntimeError("Feedback submission failed") from exc

    return FeedbackSubmissionResponse(
        submission_id=record.submission_id,
        stored=True,
    )

@mcp.custom_route("/health", methods=["GET"])
async def health_check(request: Request):
    """Health check endpoint."""
    return JSONResponse({"status": "healthy", "service": "mcp-server"})


if __name__ == "__main__":
    ensure_feedback_database()
    app = mcp.http_app(stateless_http=True)

    existing_lifespan = app.lifespan

    @asynccontextmanager
    async def app_lifespan(starlette_app):
        async with existing_lifespan(starlette_app):
            yield
        await on_shutdown()

    app.router.lifespan_context = app_lifespan

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["mcp-session-id", "mcp-protocol-version"],
        max_age=86400,
    )

    config = uvicorn.Config(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        ws="wsproto",
    )
    server = uvicorn.Server(config)

    try:
        server.run()
    except KeyboardInterrupt:
        logger.info("Server shutdown requested")
