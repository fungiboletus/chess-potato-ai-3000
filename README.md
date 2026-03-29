# Chess Potato AI 3000

A hybrid AI chess engine.

This is not ready for prime time.

## Development

If you only want to work on the web app and the server, the simplest setup is:

- run the frontend locally with Vite
- run the Python server in Docker so the bundled engine binaries are available

### Web + Server

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

The frontend automatically connects to the local MCP server at `http://localhost:8000/mcp` when running on localhost.

### Stop

```bash
docker compose down
```

Use `Ctrl+C` in the frontend terminal to stop Vite.

### Local Server Only

If you want to run the server outside Docker, use the `server/` project directly:

```bash
cd server
uv sync
uv run server.py
```

Notes:

- the server expects Python `3.14`
- `uv` must be installed locally
- the default `engines.yaml` points at engine binaries such as `/usr/local/bin/chess-potato-ai-3000`; if those are not installed on your machine, prefer the Docker-based server setup above

## Helm Charts

Minimal Helm charts live in `charts/`:

- `charts/chess-potato-ai-3000-web` deploys the frontend and MCP server together.
- `charts/chess-potato-ai-3000-lichess` deploys the Lichess bot.

Examples:

```bash
helm install cpai3000-web ./charts/chess-potato-ai-3000-web
```

For secrets, prefer a separate values file, ideally encrypted with SOPS, rather than passing
tokens on the command line.

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

The web chart supports server-side Ollama configuration via values such as:

```bash
helm install cpai3000-web ./charts/chess-potato-ai-3000-web \
  --set server.ollama.endpoint=https://ollama.example.com/api/generate \
  -f values.secrets.yaml
```

The server now stores post-game feedback in SQLite. In Docker Compose, that database is persisted in the named volume `server_feedback_data`. In Helm, the web chart now creates a PVC by default for `/app/data`; tune it with `server.persistence.*` or set `server.persistence.existingClaim` to reuse an existing volume.

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

For additional runtime variables, use `server.env` for simple key/value pairs or `server.extraEnv`
for full Kubernetes `env` entries such as `valueFrom` references.

The Lichess chart supports the same Ollama runtime values for the bundled `chess-potato-ai-3000`
engine:

```bash
helm install cpai3000-lichess ./charts/chess-potato-ai-3000-lichess \
  --set model.ollama.endpoint=https://ollama.example.com/api/generate \
  -f values.secrets.yaml
```

For other engine runtime variables, use `extraEnv` with standard Kubernetes `env` entries.

The chart release workflow publishes versioned chart packages to GitHub Container Registry under `oci://ghcr.io/<owner>/charts`.

## Engine Sources

The server Docker image bundles several engine implementations. Initialize submodules before building Docker images so the external engine sources are available locally:

```bash
git submodule update --init --recursive
docker build -f server/Dockerfile .
```

## License

- The source code is licensed under the [GPLv3 License](LICENSE).
- The AI model in the sub repository is licensed under the Gemma Terms of Use.
