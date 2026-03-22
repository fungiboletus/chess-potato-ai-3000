# Chess Potato AI 3000

A hybrid AI chess engine.

## Helm Charts

Minimal Helm charts live in `charts/`:

- `charts/chess-potato-ai-3000-web` deploys the frontend and MCP server together.
- `charts/chess-potato-ai-3000-lichess` deploys the Lichess bot.

Examples:

```bash
helm install cpai3000-web ./charts/chess-potato-ai-3000-web
helm install cpai3000-lichess ./charts/chess-potato-ai-3000-lichess \
	--set secrets.lichessToken=your-token
```

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
