import re


def untrusted_block(source: str, content: str) -> str:
    safe_source = re.sub(r"[^A-Za-z0-9_.-]", "", source) or "data"
    safe_content = re.sub(
        r"</\s*untrusted_data\s*>",
        "<\\/untrusted_data>",
        content,
        flags=re.IGNORECASE,
    )

    return f'<untrusted_data source="{safe_source}">\n{safe_content}\n</untrusted_data>'
