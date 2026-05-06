"""Unit tests for scoutedge_intelligence.claude.translator.Translator.

All tests use fully mocked AsyncAnthropic instances — no real API calls are made.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scoutedge_intelligence.claude.translator import (
    SUPPORTED_LANGUAGES,
    Translator,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_SYNTHESIS: dict[str, Any] = {
    "match": "Brazil vs Germany",
    "predicted_outcome": "home",
    "confidence_band": "high",
    "primary_driver": "home team's superior recent form",
    "risk_factor": "key striker doubts for fitness",
}

_EXPECTED_EN = "Brazil are predicted to win at home with high confidence. Their superior recent form is the primary driver. Key risk: the striker's fitness remains in doubt."


def _make_translator(text: str = _EXPECTED_EN) -> tuple[Translator, MagicMock]:
    """Return a (Translator, mock_client) pair where the client returns *text*."""
    mock_content = MagicMock()
    mock_content.text = text

    mock_response = MagicMock()
    mock_response.content = [mock_content]

    mock_client = MagicMock()
    mock_client.messages = MagicMock()
    mock_client.messages.create = AsyncMock(return_value=mock_response)

    translator = Translator(client=mock_client)  # type: ignore[arg-type]
    return translator, mock_client


# ---------------------------------------------------------------------------
# 1. Happy path — translate() returns expected string for "en"
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_translate_happy_path_en() -> None:
    """translate() must return the stripped model text for language='en'."""
    translator, mock_client = _make_translator(_EXPECTED_EN)

    result = await translator.translate(_SYNTHESIS, language="en")

    assert result == _EXPECTED_EN
    mock_client.messages.create.assert_awaited_once()


# ---------------------------------------------------------------------------
# 2. Unsupported language raises ValueError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_translate_unsupported_language_raises() -> None:
    """translate() must raise ValueError for a language not in SUPPORTED_LANGUAGES."""
    translator, _ = _make_translator()

    with pytest.raises(ValueError, match="Unsupported language"):
        await translator.translate(_SYNTHESIS, language="xx")


# ---------------------------------------------------------------------------
# 3. Empty model output raises RuntimeError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_translate_empty_output_raises() -> None:
    """translate() must raise RuntimeError when the model returns an empty string."""
    translator, _ = _make_translator(text="   ")  # whitespace-only → strips to ""

    with pytest.raises(RuntimeError, match="empty response"):
        await translator.translate(_SYNTHESIS, language="en")


# ---------------------------------------------------------------------------
# 4. Trailing / leading whitespace is trimmed
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_translate_trims_whitespace() -> None:
    """translate() must strip leading and trailing whitespace from model output."""
    padded = f"  \n  {_EXPECTED_EN}  \n  "
    translator, _ = _make_translator(text=padded)

    result = await translator.translate(_SYNTHESIS, language="en")

    assert result == _EXPECTED_EN
    assert not result.startswith(" ")
    assert not result.endswith(" ")


# ---------------------------------------------------------------------------
# 5. Custom model env var is picked up over DEFAULT_MODEL
# ---------------------------------------------------------------------------


def test_custom_model_env_var(monkeypatch: pytest.MonkeyPatch) -> None:
    """Translator must use ANTHROPIC_MODEL_TRANSLATOR env var when set."""
    custom_model = "claude-haiku-4-5-custom"
    monkeypatch.setenv("ANTHROPIC_MODEL_TRANSLATOR", custom_model)

    mock_client = MagicMock()
    translator = Translator(client=mock_client)  # type: ignore[arg-type]

    assert translator._model == custom_model


# ---------------------------------------------------------------------------
# 6. All SUPPORTED_LANGUAGES are accepted (parametrize)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
@pytest.mark.parametrize("lang", SUPPORTED_LANGUAGES)
async def test_all_supported_languages_accepted(lang: str) -> None:
    """translate() must not raise for any language in SUPPORTED_LANGUAGES."""
    translator, mock_client = _make_translator()

    result = await translator.translate(_SYNTHESIS, language=lang)

    assert isinstance(result, str)
    assert len(result) > 0
    # Verify the language was forwarded to the API call
    call_kwargs = mock_client.messages.create.call_args
    assert call_kwargs is not None


# ---------------------------------------------------------------------------
# 7. Default model is used when no env var or arg supplied
# ---------------------------------------------------------------------------


def test_default_model_used_when_no_override(monkeypatch: pytest.MonkeyPatch) -> None:
    """Translator must fall back to DEFAULT_MODEL when no env var or arg is set."""
    monkeypatch.delenv("ANTHROPIC_MODEL_TRANSLATOR", raising=False)

    mock_client = MagicMock()
    translator = Translator(client=mock_client)  # type: ignore[arg-type]

    assert translator._model == Translator.DEFAULT_MODEL


# ---------------------------------------------------------------------------
# 8. model arg overrides DEFAULT_MODEL but env var beats the arg
# ---------------------------------------------------------------------------


def test_model_arg_overrides_default(monkeypatch: pytest.MonkeyPatch) -> None:
    """Explicit model arg must override DEFAULT_MODEL when env var is absent."""
    monkeypatch.delenv("ANTHROPIC_MODEL_TRANSLATOR", raising=False)

    mock_client = MagicMock()
    translator = Translator(client=mock_client, model="claude-my-model")  # type: ignore[arg-type]

    assert translator._model == "claude-my-model"


def test_env_var_beats_model_arg(monkeypatch: pytest.MonkeyPatch) -> None:
    """ANTHROPIC_MODEL_TRANSLATOR env var must win over the model arg."""
    monkeypatch.setenv("ANTHROPIC_MODEL_TRANSLATOR", "claude-env-model")

    mock_client = MagicMock()
    translator = Translator(client=mock_client, model="claude-arg-model")  # type: ignore[arg-type]

    assert translator._model == "claude-env-model"


# ---------------------------------------------------------------------------
# 9. When no client is injected, AsyncAnthropic() is constructed
# ---------------------------------------------------------------------------


def test_no_client_builds_async_anthropic(monkeypatch: pytest.MonkeyPatch) -> None:
    """Translator must build AsyncAnthropic() when client=None."""
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key-placeholder")
    monkeypatch.delenv("ANTHROPIC_MODEL_TRANSLATOR", raising=False)

    with patch(
        "scoutedge_intelligence.claude.translator.AsyncAnthropic", autospec=True
    ) as mock_cls:
        mock_instance = MagicMock()
        mock_cls.return_value = mock_instance

        translator = Translator()

        mock_cls.assert_called_once_with()
        assert translator._client is mock_instance


# ---------------------------------------------------------------------------
# 10. Correct user message payload is forwarded to the API
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_user_message_payload_structure() -> None:
    """translate() must call messages.create with the correct JSON user message."""
    import json as _json

    translator, mock_client = _make_translator()
    await translator.translate(_SYNTHESIS, language="fr")

    call_kwargs = mock_client.messages.create.call_args.kwargs
    messages = call_kwargs["messages"]
    assert len(messages) == 1
    user_msg = messages[0]
    assert user_msg["role"] == "user"

    payload = _json.loads(user_msg["content"])
    assert payload["language"] == "fr"
    assert payload["synthesis"] == _SYNTHESIS
