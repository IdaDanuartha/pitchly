"""Output-language directive appended to judge/LLM system prompts.

The panel personas and scorecard prompts are written in Indonesian, but a
session can request English output. Appending an explicit language instruction
is more reliable than rewriting every prompt, and keeps one source of truth.
"""

_DIRECTIVES = {
    "id": (
        "BAHASA OUTPUT: Tulis seluruh keluaran dalam Bahasa Indonesia yang "
        "natural."
    ),
    "en": (
        "OUTPUT LANGUAGE: Write ALL output in natural, professional English. "
        "Ask questions, give feedback, and write every field in English, "
        "regardless of the language of the participant's document or answers."
    ),
}


def language_directive(output_language: str | None) -> str:
    return _DIRECTIVES.get(output_language or "id", _DIRECTIVES["id"])
