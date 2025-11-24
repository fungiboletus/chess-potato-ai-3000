import os
import random
import re
from typing import Any, Dict, List, Match, Optional, Sequence

import requests

# Configure AI endpoint and model from environment variables
url = os.environ.get("OLLAMA_ENDPOINT", "http://localhost:11434/api/generate")
ollama_bearer_token: Optional[str] = os.environ.get("OLLAMA_BEARER_TOKEN")
if ollama_bearer_token is not None:
    ollama_headers = {"Authorization": f"Bearer {ollama_bearer_token}"}
else:
    ollama_headers = {}
model: str = os.environ.get("LLM_MODEL", "hf.co/undefined2/chess-potato-ai-3000:Q8_0")
# model = os.environ.get("LLM_MODEL", "gpt-oss:120b")

introduction_prompts: List[str] = [
    """You are playing a chess game against an opponent. You have
analysed the game carefully and wrote some notes and reflections
about your next move. Your notes can be short or pretty long.
You always select a legal move, and you play as humans do.""",
    """You are an excellent chess player. You have a deep understanding
of the game and write reflections and thoughts about your next move
along the move you think is the best. You always select a legal move.""",
    """You are a human chess player, currently winning the game against a
strong opponent. You are analysing the current position and focus
on your next move. You do not want to rush, or make blunders. You
think out loud and write your thoughts, before selecting a legal move.""",
    """You are a advanced chess player trying its best to make the game
interesting for your opponent. You have a good understanding of chess
and you also write down your thoughts for your audience. You finally
select a legal move.""",
    """You are a beginner chess player playing strategically against a
strong opponent. Following the principles of chess and making sure
to not blunder, you write down your thoughts and reflections about
your next move. You may win the game. You always select the best legal move.""",
]

prompt_template: str = """
# Chess Game Analysis

{introduction}

## Player's ELO

white: Serious (1600)
black: Serious (1600)

## Board before move

{board_before_move}

{board_analyse}

"""

# prompt_template = """You are a fisherman into new wave music playing chess. Given an anylisis of the current board
# by a chess engine and the list of legal moves, please think out loud and you must conclude by one of the legal moves in the UCI format on one single line.

# Example:

# ```
# *analysis* *legal moves*
# Alright, my queen is under treat, should I move her or sacrifice her? A sacrifice is not worth it,
# but I can check the king with this tower. Alright, that's not safe. Perhaps I can do that in two turns instead.
# Did I forget something? No I don't think so. I will move the queen. Wait? What about my knight?…
# etc, etc...

# $REPLACE_WITH_THE_MOVE_IN_UCI_FORMAT$
# ```

# Now it's your turn, don't hesitate to think out loud. Think for at least 5 sentences, and finish with a legal UCI move from the list (4 chars only).

# {board_analyse}
# Legal moves: {legal_moves}, resign
# """

# debug_log_file = open("chess_engine_ai.log", "a")
# print("-- AI --", file=debug_log_file)


def ask_ai(prompt: str) -> str:
    """
    Send a prompt to the AI model and return the response.

    Args:
        prompt (str): The prompt to send to the AI model

    Returns:
        str: The AI's response
    """
    payload: Dict[str, Any] = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "stop": ["## Board after move"],
            # "num_predict": 1024,
            "num_predict": 256,
        },
    }
    response: requests.Response = requests.post(
        url, json=payload, headers=ollama_headers
    )
    response.raise_for_status()
    answer: str = response.json()["response"]
    return answer


def ask_for_a_move(
    board_analyse: str,
    legal_moves: Sequence[str],
    board_unicode: str,
) -> str:
    """
    Ask the AI for a chess move given the current board analysis and legal moves.

    Args:
        board_analyse (str): Analysis of the current board position
        legal_moves (Sequence[str]): List of legal moves in UCI format
        board_unicode (str): Unicode representation of the board

    Returns:
        str: Selected move in UCI format
    """
    legal_moves_str: str = ", ".join(legal_moves)
    prompt: str = prompt_template.format(
        introduction=random.choice(introduction_prompts),
        board_analyse=board_analyse,
        board_before_move=board_unicode,
        legal_moves=legal_moves_str,
    )

    # Asking AI for a move up to 5 times
    for attempt in range(5):
        answer: str = ask_ai(prompt)

        # print the answer for debugging in a file
        # print(answer, file=debug_log_file)
        # debug_log_file.flush()

        # Extract the thoughts and reflections from the answer
        thoughts_match: Optional[Match[str]] = re.search(
            r"## Thoughts( and Reflections)?\n\n(.+?)\n\n##",
            answer,
            re.MULTILINE | re.IGNORECASE,
        )
        if thoughts_match:
            thoughts: List[str] = thoughts_match.group(2).strip().splitlines()
            for thought in thoughts:
                thought = thought.strip()
                if thought:
                    print(f"info string AI thought: {thought}")

        # Extract the move from the answer
        move_match: Optional[Match[str]] = re.search(
            r"## Selected legal move\s*`([^`]{4,5})`",
            answer,
            re.MULTILINE | re.IGNORECASE,
        )
        move: Optional[str] = None

        if move_match:
            move = move_match.group(1).lower()

        if move is None:
            print(
                f"info string AI did not return a move, trying again ({attempt + 1}/5)"
            )
            continue

        # Check if the move is in the list of legal moves
        if move not in legal_moves:
            print("info string AI suggested move is not legal")
            continue
        return move

    print(
        "info string AI did not return a legal move after 5 attempts, returning the first legal move instead"
    )
    return min(legal_moves)
