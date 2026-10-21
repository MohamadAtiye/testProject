from app.output import decode_assist_output


def test_parses_plain_json():
    result = decode_assist_output(
        '{"summary":"Klingt gut.","suggestions":["Ein Hinweis"]}'
    )

    assert result == {"summary": "Klingt gut.", "suggestions": ["Ein Hinweis"]}


def test_repairs_json_wrapped_in_prose():
    result = decode_assist_output(
        'Hier ist das JSON:\n{"summary":"Klingt gut.","suggestions":["Hinweis"]}\nDanke.'
    )

    assert result is not None
    assert result["summary"] == "Klingt gut."


def test_caps_suggestions_at_four():
    result = decode_assist_output(
        '{"summary":"x","suggestions":["1","2","3","4","5"]}'
    )

    assert result is not None
    assert len(result["suggestions"]) == 4


def test_invalid_output_returns_none():
    assert decode_assist_output("kein json") is None


def test_caps_summary_and_suggestion_length():
    result = decode_assist_output(
        '{"summary":"' + ("x" * 300) + '","suggestions":["' + ("y" * 400) + '"]}'
    )

    assert result is not None
    assert len(result["summary"]) == 200
    assert len(result["suggestions"][0]) == 300
