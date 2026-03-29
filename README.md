# Chess Potato AI 3000

Chess Potato AI 3000 is a chess project built around a retro web client, an MCP-backed Python server, and several intentionally odd engine personalities.

## What Is In This Repository

- `frontend/`: React 19 + Vite web app with a retro desktop-game look.
- `server/`: Python MCP server that brokers engine calls, evaluation, and feedback storage.
- `uci/`: Python UCI engine entrypoint for the flagship engine.
- `lichess/`: Docker packaging for running the project through lichess-bot.
- `charts/`: Helm charts for the web stack and the Lichess bot deployment.
- `engines/`: bundled external engine sources used in the server image.

## Quick Start

The simplest local setup is:

- run the Python server in Docker so the bundled engine binaries are available
- run the frontend locally with Vite

From the repository root:

```bash
git submodule update --init --recursive
docker compose up --build server
```

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.

When running on localhost, the frontend connects to the local MCP server at `http://localhost:8000/mcp`.

To stop everything:

```bash
docker compose down
```

Use `Ctrl+C` in the frontend terminal to stop Vite.

## Local Development

### Frontend

- Node.js 20+
- npm

```bash
cd frontend
npm install
npm run dev
```

### Article

The long-form article lives in `article/article.md` and is rendered into a static HTML page with a small Node-based build step powered by `markdown-it`.

```bash
cd article
npm install
npm run build
```

That writes the rendered article to `site/article/index.html` and copies the article assets alongside it.

To preview the combined static site locally after building both the frontend and article:

```bash
cd frontend
npm install
npm run build
cd ..
cd article
npm install
npm run build
rsync -a ../frontend/dist/ ../site/
python3 -m http.server 4173 -d ../site
```

The production frontend MCP endpoint is configured through `VITE_MCP_SERVER_URL`. The GitHub Pages workflow reads it from the repository secret `PAGES_MCP_SERVER_URL`, and other deployments can inject the same variable through their own environment.

Useful checks:

```bash
npm run check
npm run build
```

### Server

- Python 3.14
- `uv`

```bash
cd server
uv sync --dev
uv run server.py
```

Useful checks:

```bash
uv run pytest
uv run ruff check .
```

If you are running the server outside Docker, you need engine binaries available locally. For most contributors, the Docker-based server setup is the easier path.

### UCI Engine

```bash
cd uci
uv sync --dev
uv run pytest
uv run python main.py
```

## Docker Images

The repository contains Dockerfiles for:

- the frontend
- the MCP server
- the UCI engine
- the Lichess bot integration

The server image bundles several engine implementations. Initialize submodules before building images so those sources are available locally:

```bash
git submodule update --init --recursive
docker build -f server/Dockerfile .
```

CI builds multi-arch images for `amd64` and `arm64` and publishes them to GitHub Container Registry from `main` and tags.

## GitHub Pages

Pushes to `main` also build a static GitHub Pages artifact containing:

- the Vite frontend at `/`
- the rendered article at `/article/`

The Pages workflow writes a `CNAME` file for `chesspotatoai3000.sct.sintef.no` and deploys the combined site through GitHub Actions.

## Helm Charts

Minimal Helm charts live in `charts/`:

- `charts/chess-potato-ai-3000-web` deploys the frontend and MCP server together
- `charts/chess-potato-ai-3000-lichess` deploys the Lichess bot

Examples:

```bash
helm install cpai3000-web ./charts/chess-potato-ai-3000-web
```

For secrets, prefer a separate values file, ideally encrypted with SOPS, rather than passing tokens on the command line.

```yaml
# values.secrets.yaml
secrets:
  lichessToken: your-token
server:
  ollama:
    bearerToken: your-token
model:
  ollama:
    bearerToken: your-token
```

```bash
helm install cpai3000-lichess ./charts/chess-potato-ai-3000-lichess \
  -f values.secrets.yaml
```

The web chart supports server-side Ollama configuration:

```bash
helm install cpai3000-web ./charts/chess-potato-ai-3000-web \
  --set server.ollama.endpoint=https://ollama.example.com/api/generate \
  -f values.secrets.yaml
```

The server stores post-game feedback in SQLite. In Docker Compose, that database is persisted in the named volume `server_feedback_data`. In Helm, the web chart creates a PVC by default for `/app/data`; tune it with `server.persistence.*` or set `server.persistence.existingClaim` to reuse an existing volume.

Feedback runtime limits can be configured through:

```yaml
server:
  feedback:
    databaseUrl: ""
    databaseFilename: feedback.db
    maxBytes: 16384
    maxHistory: 256
    maxNotes: 1000
  persistence:
    enabled: true
    existingClaim: ""
    claimName: ""
    size: 1Gi
    storageClass: ""
    accessModes:
      - ReadWriteOnce
    mountPath: /app/data
    subPath: ""
    annotations: {}
    labels: {}
    selector: {}
    volumeName: ""
```

If you want the chart to bind to an existing disk instead of creating a new PVC, set `server.persistence.existingClaim`. If you need to target a pre-provisioned PV, use `server.persistence.selector` and `server.persistence.volumeName`. Setting `server.persistence.storageClass` to `"-"` renders `storageClassName: ""`, which is useful when you want to disable dynamic provisioning.

For additional runtime variables, use `server.env` for simple key/value pairs or `server.extraEnv` for full Kubernetes `env` entries such as `valueFrom` references.

The Lichess chart supports the same Ollama runtime values for the bundled `chess-potato-ai-3000` engine:

```bash
helm install cpai3000-lichess ./charts/chess-potato-ai-3000-lichess \
  --set model.ollama.endpoint=https://ollama.example.com/api/generate \
  -f values.secrets.yaml
```

For other engine runtime variables, use `extraEnv` with standard Kubernetes `env` entries.

Chart packages are published to GitHub Container Registry under `oci://ghcr.io/<owner>/charts`.

## License

The main project source is licensed under [GPLv3](LICENSE).

This repository also includes or references third-party engine sources and model assets with their own licenses or usage terms. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for a concise summary.
