# syntax=docker/dockerfile:1.7
FROM python:3.14-slim-trixie AS runtime
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_SYSTEM_PYTHON=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:/usr/games:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    stockfish \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/pyproject.toml server/uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project --no-editable

COPY server/ ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable --compile-bytecode

EXPOSE 8000

CMD ["/app/.venv/bin/python", "server.py"]
