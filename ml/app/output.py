import json
import re
from typing import Any


def decode_assist_output(raw: str) -> dict[str, Any] | None:
    """Repair JSON wrapped in prose, then validate and cap the shape."""
    data: Any = None
    text = raw.strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group(0))
            except json.JSONDecodeError:
                data = None

    if not isinstance(data, dict):
        return None

    summary = str(data.get("summary") or "").strip()[:200]
    suggestions: list[str] = []

    raw_suggestions = data.get("suggestions")
    if isinstance(raw_suggestions, list):
        for suggestion in raw_suggestions:
            if isinstance(suggestion, str) and suggestion.strip():
                suggestions.append(suggestion.strip()[:300])
            if len(suggestions) == 4:
                break

    return {"summary": summary, "suggestions": suggestions}
