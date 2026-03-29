# Third-Party Notices

This repository includes, vendors, or references third-party components with their own licenses or usage terms. This file is a concise summary for readers of the public repository. It is not an exhaustive legal inventory of every transitive dependency.

## Bundled Engine Sources

### `engines/Badfish`

- Source: <https://github.com/rotolonico/Badfish>
- Notes: modified Stockfish fork intended to play bad moves
- License: GPLv3
- Local references: `engines/Badfish/Copying.txt`, `engines/Badfish/README.md`

### `engines/worstfish`

- Source: <https://github.com/mikimasn/worstfish>
- Notes: modified Stockfish-derived engine
- License: GPLv3
- Local references: `engines/worstfish/Copying.txt`, `engines/worstfish/README.md`

### `engines/chess-potato-random`

- Source: <https://github.com/fungiboletus/chess-potato-random>
- Notes: simple random-move engine used by this project
- License: WTFPL v2
- Local references: `engines/chess-potato-random/LICENSE`, `engines/chess-potato-random/README.md`

### `engines/potato-alphabet-3000`

- Source: <https://github.com/fungiboletus/chess-potato-alphabet-42>
- Notes: novelty engine that picks from alphabetically ordered legal moves
- License: WTFPL v2
- Local references: `engines/potato-alphabet-3000/LICENSE`, `engines/potato-alphabet-3000/README.md`

## Model Assets

### `model/`

- Source: <https://huggingface.co/undefined2/chess-potato-ai-3000>
- Notes: model repository used by the project for chess-potato-ai-3000 model assets
- License or terms: Gemma terms, as declared in `model/README.md`
- Base model: `google/gemma-3-4b-it`

## Main Project Code

Unless stated otherwise in a subdirectory, the main repository code is distributed under GPLv3. See [LICENSE](LICENSE).