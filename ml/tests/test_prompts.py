from app.prompts import system_prompt


def test_assist_prompt_contains_role_and_output_contract():
    prompt = system_prompt("assist")

    assert "assistant" in prompt.lower()
    assert "suggestions" in prompt
    assert "untrusted_data" in prompt
    assert "German" in prompt


def test_admin_prompt_contains_tools_date_and_language():
    prompt = system_prompt("admin", {"date": "2026-10-21"})

    assert "read_contact_messages" in prompt
    assert "read_project_requests" in prompt
    assert "2026-10-21" in prompt
    assert "German" in prompt


def test_domain_prompt_uses_database_tables():
    prompt = system_prompt("admin", {"date": "2026-10-21"})

    assert "contacts" in prompt
    assert "projects" in prompt
    assert "messages.json" not in prompt
