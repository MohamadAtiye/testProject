"""Prompt regression eval for the form-assist profile.

Run inside the ml container:
    docker compose exec ml python scripts/eval_assist.py
"""

import asyncio
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.llama import LlamaError, llama  # noqa: E402
from app.output import decode_assist_output  # noqa: E402
from app.prompts import system_prompt  # noqa: E402
from app.untrusted import untrusted_block  # noqa: E402


async def main() -> int:
    cases = json.loads((ROOT / "tests" / "evals" / "assist_cases.json").read_text("utf-8"))
    failures = 0

    for case in cases:
        name = case.get("name", "unnamed")
        draft = case.get("draft", {})
        messages = [
            {"role": "system", "content": system_prompt("assist")},
            {
                "role": "user",
                "content": untrusted_block(
                    "project_draft",
                    json.dumps(draft, ensure_ascii=False, indent=2),
                ),
            },
        ]

        try:
            message = await llama.chat(
                messages,
                json_mode=True,
                temperature=0.3,
                max_tokens=400,
            )
        except LlamaError as exc:
            print(f"FAIL {name}: model error ({exc})")
            failures += 1
            continue

        raw = message["content"]
        output = decode_assist_output(raw)
        valid = (
            output is not None
            and len(output["summary"]) <= 200
            and len(output["suggestions"]) <= 4
            and all(len(item) <= 300 for item in output["suggestions"])
            and "http://" not in raw.lower()
            and "https://" not in raw.lower()
        )

        if valid:
            print(f"PASS {name}")
        else:
            failures += 1
            print(f"FAIL {name}: output failed schema/safety checks")
            print(f"  {raw[:500]}")

    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
