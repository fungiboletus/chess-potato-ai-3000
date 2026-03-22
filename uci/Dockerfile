# syntax=docker/dockerfile:1.7
FROM python:3.14-slim-trixie AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_SYSTEM_PYTHON=1
WORKDIR /app

# Install dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --locked --no-install-project --no-editable

# Copy the project into the intermediate image
ADD . /app

# Sync the project
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-editable --compile-bytecode


FROM python:3.14-slim-trixie AS runtime

# Install Stockfish
RUN apt-get update && apt-get install -y --no-install-recommends \
    stockfish \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:/usr/games:$PATH"

COPY --from=builder /app/ /app/

# create script
RUN echo '#!/bin/sh\ncd /app && exec /app/.venv/bin/python main.py' > /usr/games/chess-potato-ai-3000 && chmod +x /usr/games/chess-potato-ai-3000

CMD ["/usr/games/chess-potato-ai-3000"]
