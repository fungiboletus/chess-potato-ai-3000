# syntax=docker/dockerfile:1.7
FROM python:3.14-slim-trixie AS builder

# Setup UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ENV UV_SYSTEM_PYTHON=1

WORKDIR /app

# Copy the UCI engine project into the intermediate image
COPY uci/pyproject.toml uci/uv.lock /app/

# Install dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-install-project --no-editable

COPY uci/ /app/

# Sync the project
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-editable --compile-bytecode


FROM python:3.14-slim-trixie AS lichessbot_builder

# Setup UV
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ENV UV_SYSTEM_PYTHON=1
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

# Fetch lichess-bot source code
WORKDIR /lichess-bot
RUN git clone --depth=1 https://github.com/lichess-bot-devs/lichess-bot .
# Remove ignored files
RUN rm -r docker docs wiki .git*

# Set up UV environment
RUN uv init . --name lichess-bot && \
    uv add -r requirements.txt

# Install dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-install-project --no-editable

FROM python:3.14-slim-trixie AS runtime

# Install Stockfish
RUN apt-get update && apt-get install -y --no-install-recommends \
    stockfish \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1
ENV PATH="/app/.venv/bin:/usr/games:$PATH"

# Install chess-potato-ai-3000
COPY --from=builder /app/ /app/
# create chess-potato-ai-3000 script
RUN echo '#!/bin/sh\ncd /app && exec /app/.venv/bin/python main.py' > /usr/games/chess-potato-ai-3000 && chmod +x /usr/games/chess-potato-ai-3000

# Install lichess-bot
COPY --from=lichessbot_builder /lichess-bot /lichess-bot/
# create lichess-bot script
RUN echo '#!/bin/sh\ncd /lichess-bot && exec /lichess-bot/.venv/bin/python lichess-bot.py "$@"' > /usr/games/lichess-bot && chmod +x /usr/games/lichess-bot

# add chess-potato-ai-3000 to lichess-bot engines
RUN ln -s /usr/games/chess-potato-ai-3000 /lichess-bot/engines/chess-potato-ai-3000

WORKDIR /lichess-bot
CMD ["/usr/games/lichess-bot"]
