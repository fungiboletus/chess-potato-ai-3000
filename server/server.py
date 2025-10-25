"""Chess MCP Server - Provides UCI engine move computation."""

import atexit
import json
import logging
import os
import secrets
import time

import pyseto
import uvicorn
from fastmcp import FastMCP
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# Enable DEBUG for chess.engine to see UCI protocol info lines
logging.getLogger("chess.engine").setLevel(logging.DEBUG)

logger = logging.getLogger(__name__)

from chess_engine import compute_next_move_cached as engine_compute_move
from chess_engine import ensure_valid_transition, get_available_engines, shutdown_engine

# CORS Configuration
# Override in production with comma-separated origins (e.g., "https://app.example.com,https://chess.example.com")
ALLOWED_ORIGINS = os.getenv(
    "CPAI3000_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")

# Token Configuration
TOKEN_EXPIRATION_SECONDS = int(
    os.getenv("TOKEN_EXPIRATION_SECONDS", "3600")
)  # 1 hour (3600 seconds) by default


# Create MCP server
mcp = FastMCP("Chess Engine Server")

# Secret Key Configuration
# Always generate a cryptographically secure 256-bit key
SECRET_KEY: bytes = secrets.token_bytes(32)

key = pyseto.Key.new(version=4, purpose="local", key=SECRET_KEY)

# Register engine shutdown on exit
atexit.register(shutdown_engine)


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

            if current_time > exp:
                raise ValueError(f"Token expired (exp: {exp}, now: {current_time})")

            # Extract old FEN for transition validation
            old_fen = decoded.get("fen")

        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to decode token payload: {e}")
        except Exception as e:
            raise ValueError(f"Token validation failed: {e}")
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


if __name__ == "__main__":
    app = mcp.http_app()

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["mcp-session-id", "mcp-protocol-version"],
        max_age=86400,
    )

    uvicorn.run(app, host="0.0.0.0", port=8000)
