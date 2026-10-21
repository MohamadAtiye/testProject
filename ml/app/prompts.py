from pathlib import Path

from .config import settings

PROMPT_DIR = Path(__file__).resolve().parent.parent / "prompts"
SEPARATOR = "\n\n---\n\n"


def load_prompt(name: str) -> str:
    file = PROMPT_DIR / f"{Path(name).name}.md"

    if not file.is_file():
        return ""

    return file.read_text(encoding="utf-8").strip()


def compose(names: list[str]) -> str:
    parts = [load_prompt(name) for name in names]
    return SEPARATOR.join(part for part in parts if part)


def module_list(env_value: str, default: list[str]) -> list[str]:
    names = [item.strip() for item in env_value.split(",") if item.strip()]
    return names or default


def system_prompt(profile: str, context: dict | None = None) -> str:
    if profile == "assist":
        return compose(module_list(settings.assist_prompts, ["assist", "assist_goals"]))

    prompt = compose(module_list(settings.admin_prompts, ["persona", "domain", "admin"]))
    date = (context or {}).get("date")

    if date:
        prompt += (
            "\n\n---\n\n# Aktuelles Datum\n\n"
            f'Heute ist {date}. Beziehe "heute" und "diese Woche" auf dieses Datum.'
        )

    return prompt
