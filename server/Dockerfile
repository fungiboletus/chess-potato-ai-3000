# syntax=docker/dockerfile:1.7
FROM python:3.14-slim-trixie AS python-base
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_SYSTEM_PYTHON=1
ENV PYTHONUNBUFFERED=1


FROM python-base AS uci-builder
WORKDIR /opt/chess-potato-ai-3000

COPY uci/pyproject.toml uci/uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project --no-editable

COPY uci/ ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable --compile-bytecode


FROM rust:slim-trixie AS rust-builder
WORKDIR /src

COPY engines/chess-potato-random/ ./chess-potato-random/
COPY engines/potato-alphabet-3000/ ./potato-alphabet-3000/

RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    cargo build --release --manifest-path /src/chess-potato-random/Cargo.toml

RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    cargo build --release --manifest-path /src/potato-alphabet-3000/Cargo.toml


FROM debian:trixie-slim AS stockfish-forks-builder
ARG TARGETARCH

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    make \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /src

COPY engines/Badfish/ ./Badfish/
COPY engines/worstfish/ ./worstfish/

RUN engine_arch="$(case "$TARGETARCH" in \
        amd64) echo x86-64-modern ;; \
        arm64) echo armv8 ;; \
        *) echo general-64 ;; \
    esac)" \
    && make -C /src/Badfish/src -j"$(nproc)" build ARCH="$engine_arch" \
    && install -Dm755 /src/Badfish/src/stockfish /out/badfish

RUN engine_arch="$(case "$TARGETARCH" in \
        amd64) echo x86-64-modern ;; \
        arm64) echo armv8 ;; \
        *) echo general-64 ;; \
    esac)" \
    && make -C /src/worstfish/src -j"$(nproc)" build ARCH="$engine_arch" \
    && install -Dm755 /src/worstfish/src/stockfish /out/worstfish


FROM python-base AS runtime

ENV PATH="/app/.venv/bin:/opt/engines/chess-potato-ai-3000/.venv/bin:/usr/local/bin:/usr/games:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    libstdc++6 \
    stockfish \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY server/pyproject.toml server/uv.lock ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-install-project --no-editable

COPY server/ ./

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --no-dev --no-editable --compile-bytecode

COPY --from=uci-builder /opt/chess-potato-ai-3000 /opt/engines/chess-potato-ai-3000
COPY --from=rust-builder /src/chess-potato-random/target/release/chess-potato-random /usr/local/bin/chess-potato-random
COPY --from=rust-builder /src/potato-alphabet-3000/target/release/chess-potato-alphabet-42 /usr/local/bin/potato-alphabet-3000
COPY --from=stockfish-forks-builder /out/badfish /usr/local/bin/badfish
COPY --from=stockfish-forks-builder /out/worstfish /usr/local/bin/worstfish

RUN printf '%s\n' '#!/bin/sh' 'export STOCKFISH_EXECUTABLE=/usr/games/stockfish' 'cd /opt/engines/chess-potato-ai-3000 && exec ./.venv/bin/python ./main.py "$@"' > /usr/local/bin/chess-potato-ai-3000 \
    && chmod +x /usr/local/bin/chess-potato-ai-3000

EXPOSE 8000

CMD ["/app/.venv/bin/python", "server.py"]
