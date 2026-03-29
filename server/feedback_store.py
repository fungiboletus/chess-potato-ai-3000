import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, ValidationError
from pydantic import Field as PydanticField
from sqlalchemy import Column, Text
from sqlmodel import Field, Session, SQLModel, create_engine


def _default_database_path() -> Path:
    return Path(__file__).resolve().parent / "data" / "feedback.db"


DATABASE_URL = os.getenv(
    "CPAI3000_FEEDBACK_DATABASE_URL",
    f"sqlite:///{_default_database_path()}",
)

MAX_FEEDBACK_PAYLOAD_BYTES = int(os.getenv("CPAI3000_FEEDBACK_MAX_BYTES", "262144"))
MAX_FEEDBACK_HISTORY_LENGTH = int(os.getenv("CPAI3000_FEEDBACK_MAX_HISTORY", "512"))
MAX_FEEDBACK_NOTES_LENGTH = int(os.getenv("CPAI3000_FEEDBACK_MAX_NOTES", "4000"))
MAX_RESULT_MESSAGE_LENGTH = 1024
MAX_GENERIC_TEXT_LENGTH = 128
MAX_DISPLAY_NAME_LENGTH = 256
MAX_FEN_LENGTH = 128
MAX_SAN_LENGTH = 32
MAX_PLAYER_KEY_LENGTH = 64
BOARD_SQUARE_PATTERN = r"^[a-h][1-8]$"

engine = create_engine(DATABASE_URL, echo=False)


class FeedbackValidationError(ValueError):
    """Raised when a feedback submission is invalid or too large."""


class FeedbackSection(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    enjoyment: Literal["loved_it", "it_was_okay", "not_really"] | None = None
    authenticity: Literal["very_human", "somewhat_human", "not_human"] | None = None
    notes: str = PydanticField(default="", max_length=MAX_FEEDBACK_NOTES_LENGTH)


class GameResultSection(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    type: Literal["win", "lose", "draw"] | None = None
    reason: str | None = PydanticField(default=None, max_length=MAX_GENERIC_TEXT_LENGTH)
    message: str | None = PydanticField(default=None, max_length=MAX_RESULT_MESSAGE_LENGTH)


class GameSection(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    result: GameResultSection
    player_color: Literal["white", "black"] | None = PydanticField(
        default=None, alias="playerColor"
    )
    selected_engine: str | None = PydanticField(
        default=None,
        alias="selectedEngine",
        max_length=MAX_GENERIC_TEXT_LENGTH,
    )
    selected_engine_display_name: str | None = PydanticField(
        default=None,
        alias="selectedEngineDisplayName",
        max_length=MAX_DISPLAY_NAME_LENGTH,
    )
    engine_was_offline: bool = PydanticField(default=False, alias="engineWasOffline")
    used_takeback: bool = PydanticField(default=False, alias="usedTakeback")
    final_fen: str = PydanticField(alias="finalFen", min_length=1, max_length=MAX_FEN_LENGTH)


class MetadataSection(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    source: Literal["web"] = "web"
    client_name: str = PydanticField(
        alias="clientName", min_length=1, max_length=MAX_GENERIC_TEXT_LENGTH
    )
    client_version: str = PydanticField(
        alias="clientVersion", min_length=1, max_length=MAX_GENERIC_TEXT_LENGTH
    )
    locale: str | None = PydanticField(default=None, max_length=16)


class HistoryMoveSection(BaseModel):
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)

    san: str = PydanticField(min_length=1, max_length=MAX_SAN_LENGTH)
    player_key: str = PydanticField(
        alias="playerKey", min_length=1, max_length=MAX_PLAYER_KEY_LENGTH
    )
    engine_name: str | None = PydanticField(
        default=None,
        alias="engineName",
        max_length=MAX_GENERIC_TEXT_LENGTH,
    )
    engine_display_name: str | None = PydanticField(
        default=None,
        alias="engineDisplayName",
        max_length=MAX_DISPLAY_NAME_LENGTH,
    )
    fen: str = PydanticField(min_length=1, max_length=MAX_FEN_LENGTH)
    evaluation_token: str | None = PydanticField(
        default=None,
        alias="evaluationToken",
        max_length=1024,
    )
    continuation_token: str | None = PydanticField(
        default=None,
        alias="continuationToken",
        max_length=1024,
    )
    timestamp: int = PydanticField(ge=0)
    from_square: str = PydanticField(alias="from", pattern=BOARD_SQUARE_PATTERN)
    to: str = PydanticField(pattern=BOARD_SQUARE_PATTERN)


class FeedbackSubmissionPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    feedback: FeedbackSection
    game: GameSection
    metadata: MetadataSection
    history: list[HistoryMoveSection] = PydanticField(
        min_length=1,
        max_length=MAX_FEEDBACK_HISTORY_LENGTH,
    )


class GameFeedbackRecord(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)
    submission_id: str = Field(index=True, unique=True)
    source: str = Field(default="web")
    client_name: str | None = None
    client_version: str | None = None
    locale: str | None = None
    feedback_enjoyment: str | None = Field(default=None, index=True)
    feedback_authenticity: str | None = Field(default=None, index=True)
    feedback_notes: str | None = None
    result_type: str | None = Field(default=None, index=True)
    result_reason: str | None = None
    result_message: str | None = None
    player_color: str | None = Field(default=None, index=True)
    selected_engine: str | None = Field(default=None, index=True)
    selected_engine_display_name: str | None = None
    engine_was_offline: bool = False
    used_takeback: bool = False
    move_count: int = 0
    final_fen: str | None = None
    history_json: str = Field(
        default="[]",
        sa_column=Column(Text, nullable=False),
    )
    is_valid: bool = Field(default=True, index=True)
    tokens_validated: bool = Field(default=False, index=True)
    validation_issues_json: str = Field(
        default="[]",
        sa_column=Column(Text, nullable=False),
    )


def ensure_feedback_database() -> None:
    if DATABASE_URL.startswith("sqlite:///"):
        database_path = Path(DATABASE_URL.removeprefix("sqlite:///"))
        database_path.parent.mkdir(parents=True, exist_ok=True)

    SQLModel.metadata.create_all(engine)


def _encode_payload(payload: dict[str, Any]) -> None:
    try:
        encoded_payload = json.dumps(payload, separators=(",", ":"), ensure_ascii=True)
    except (TypeError, ValueError) as exc:
        raise FeedbackValidationError("Feedback payload could not be encoded") from exc

    if len(encoded_payload.encode("utf-8")) > MAX_FEEDBACK_PAYLOAD_BYTES:
        raise FeedbackValidationError("Feedback payload exceeds the maximum size")


def normalize_feedback_submission(payload: dict[str, Any]) -> dict[str, Any]:
    _encode_payload(payload)

    try:
        normalized = FeedbackSubmissionPayload.model_validate(payload)
    except ValidationError as exc:
        raise FeedbackValidationError("Feedback payload failed validation") from exc

    normalized_payload = normalized.model_dump(by_alias=True)
    normalized_payload["feedback"]["notes"] = normalized_payload["feedback"]["notes"].strip()
    for move in normalized_payload["history"]:
        move.pop("evaluationToken", None)
        move.pop("continuationToken", None)
    normalized_payload["game"]["moveCount"] = len(normalized_payload["history"])
    return normalized_payload


def save_feedback_submission(
    submission_id: str,
    normalized_payload: dict[str, Any],
    *,
    tokens_validated: bool,
    validation_issues: list[str],
) -> GameFeedbackRecord:
    ensure_feedback_database()

    record = GameFeedbackRecord(
        submission_id=submission_id,
        source=normalized_payload["metadata"]["source"],
        client_name=normalized_payload["metadata"]["clientName"],
        client_version=normalized_payload["metadata"]["clientVersion"],
        locale=normalized_payload["metadata"]["locale"],
        feedback_enjoyment=normalized_payload["feedback"]["enjoyment"],
        feedback_authenticity=normalized_payload["feedback"]["authenticity"],
        feedback_notes=normalized_payload["feedback"]["notes"],
        result_type=normalized_payload["game"]["result"]["type"],
        result_reason=normalized_payload["game"]["result"]["reason"],
        result_message=normalized_payload["game"]["result"]["message"],
        player_color=normalized_payload["game"]["playerColor"],
        selected_engine=normalized_payload["game"]["selectedEngine"],
        selected_engine_display_name=normalized_payload["game"]["selectedEngineDisplayName"],
        engine_was_offline=normalized_payload["game"]["engineWasOffline"],
        used_takeback=normalized_payload["game"]["usedTakeback"],
        move_count=normalized_payload["game"]["moveCount"],
        final_fen=normalized_payload["game"]["finalFen"],
        history_json=json.dumps(normalized_payload["history"], separators=(",", ":")),
        is_valid=True,
        tokens_validated=tokens_validated,
        validation_issues_json=json.dumps(validation_issues),
    )

    with Session(engine) as session:
        session.add(record)
        session.commit()
        session.refresh(record)

    return record
