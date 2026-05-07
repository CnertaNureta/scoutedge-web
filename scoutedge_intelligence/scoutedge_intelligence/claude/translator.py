"""User-facing Translator (Role 4) for the ScoutEdge WC2026 prediction pipeline.

Converts Synthesizer JSON output into a concise plain-language summary using
claude-haiku-4-5 via the Anthropic async SDK.
"""

from __future__ import annotations

import json
import os
from typing import Any

import structlog
from anthropic import AsyncAnthropic

logger: structlog.BoundLogger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Public constants
# ---------------------------------------------------------------------------

SUPPORTED_LANGUAGES: tuple[str, ...] = (
    "en",
    "zh",
    "es",
    "ja",
    "ko",
    "fr",
    "de",
    "pt",
    "it",
    "ar",
)

SYSTEM_PROMPT = """You are the user-facing explainer for the ScoutEdge WC2026 prediction system.
Given a JSON object with prediction details, produce a short (<= 80 words) plain-language summary
in the requested language. Stay grounded in the given facts; do NOT invent player names, scores,
or statistics. Tone: confident, neutral, sports-savvy, no marketing fluff.
Always state the predicted outcome (home/draw/away), the confidence band, and the single most
important driver. End with one sentence on the key risk factor if the JSON includes one.
Return plain text only — no markdown, no JSON, no headings."""

# Maximum characters to log from model output to avoid leaking response bodies.
_LOG_TRUNCATE = 200


# ---------------------------------------------------------------------------
# Translator
# ---------------------------------------------------------------------------


class Translator:
    """Converts Synthesizer output dicts to human-readable match summaries."""

    DEFAULT_MODEL = "claude-haiku-4-5-20251001"
    DEFAULT_MAX_TOKENS = 320

    def __init__(
        self,
        client: AsyncAnthropic | None = None,
        *,
        model: str | None = None,
    ) -> None:
        """Initialise the Translator.

        Args:
            client: An existing :class:`AsyncAnthropic` instance.  When
                ``None`` a new one is constructed from ``ANTHROPIC_API_KEY``.
            model: Model identifier to use.  Resolution order:
                ``ANTHROPIC_MODEL_TRANSLATOR`` env var > *model* arg > :attr:`DEFAULT_MODEL`.
        """
        self._client: AsyncAnthropic = client if client is not None else AsyncAnthropic()

        env_model = os.environ.get("ANTHROPIC_MODEL_TRANSLATOR")
        self._model: str = env_model or model or self.DEFAULT_MODEL

        logger.debug("translator.init", model=self._model)

    async def translate(self, synthesis: dict[str, Any], *, language: str = "en") -> str:
        """Translate a Synthesizer output dict into a plain-language summary.

        Args:
            synthesis: The output dict produced by the Role 3 Synthesizer.
            language: BCP-47 language code; must be a member of
                :data:`SUPPORTED_LANGUAGES`.

        Returns:
            A trimmed plain-text string of at most ~80 words.

        Raises:
            ValueError: If *language* is not in :data:`SUPPORTED_LANGUAGES`.
            RuntimeError: If the model returns an empty string.
        """
        if language not in SUPPORTED_LANGUAGES:
            raise ValueError(
                f"Unsupported language {language!r}. Choose from: {', '.join(SUPPORTED_LANGUAGES)}"
            )

        user_content = json.dumps({"language": language, "synthesis": synthesis})

        logger.debug(
            "translator.translate.request",
            language=language,
            model=self._model,
        )

        response = await self._client.messages.create(
            model=self._model,
            max_tokens=self.DEFAULT_MAX_TOKENS,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )

        raw_text: str = response.content[0].text  # type: ignore[union-attr]
        result = raw_text.strip()

        logger.debug(
            "translator.translate.response",
            language=language,
            preview=result[:_LOG_TRUNCATE],
        )

        if not result:
            raise RuntimeError(
                "Translator received an empty response from the model. "
                f"model={self._model!r} language={language!r}"
            )

        return result
