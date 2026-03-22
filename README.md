# Chess Potato AI 3000

A hybrid AI chess engine.

## Engine Sources

The server Docker image bundles several engine implementations. Initialize submodules before building Docker images so the external engine sources are available locally:

```bash
git submodule update --init --recursive
docker build -f server/Dockerfile .
```

## License

- The source code is licensed under the [GPLv3 License](LICENSE).
- The AI model in the sub repository is licensed under the Gemma Terms of Use.
