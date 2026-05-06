"""Feature Generator: wraps Claude Haiku 4.5 (Role 1) to produce numeric match features."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

import structlog
from anthropic import AsyncAnthropic
from anthropic.types import TextBlock
from pydantic import BaseModel

logger = structlog.get_logger(__name__)

_PROMPTS_DIR = Path(__file__).parent / "prompts"
_DEFAULT_PROMPT_PATH = _PROMPTS_DIR / "feature_gen_system.md"

_JSON_BLOCK_RE = re.compile(r"\{.*?\}", re.DOTALL)


def _clip(value: Any) -> float:
    """Clip a value to [0, 1]."""
    try:
        return float(min(1.0, max(0.0, float(value))))
    except (TypeError, ValueError) as exc:
        raise ValueError(f"Cannot convert {value!r} to float: {exc}") from exc


class FeatureGenInput(BaseModel):
    home_team: str
    away_team: str
    intel_text: str
    venue_city: str | None = None
    kickoff_iso: str | None = None


class FeatureGenOutput(BaseModel):
    home_key_player_availability: float
    away_key_player_availability: float
    home_lineup_certainty: float
    away_lineup_certainty: float
    weather_adversity: float
    home_travel_fatigue: float
    away_travel_fatigue: float
    crowd_advantage: float
    intel_confidence: float


_OUTPUT_FIELDS = list(FeatureGenOutput.model_fields.keys())


class FeatureGenerator:
    """Wraps Claude Haiku 4.5 with the Role 1 prompt to produce numeric features."""

    DEFAULT_MODEL = "claude-haiku-4-5-20251001"
    DEFAULT_MAX_TOKENS = 600

    def __init__(
        self,
        client: AsyncAnthropic | None = None,
        *,
        model: str | None = None,
        prompt_path: str | None = None,
    ) -> None:
        # Model precedence: env > constructor arg > DEFAULT_MODEL
        self._model: str = (
            os.environ.get("ANTHROPIC_MODEL_FEATURE_GEN") or model or self.DEFAULT_MODEL
        )

        # Client: use provided or build from env ANTHROPIC_API_KEY
        self._client: AsyncAnthropic = client if client is not None else AsyncAnthropic()

        # System prompt: read once and cache
        resolved_path = Path(prompt_path) if prompt_path else _DEFAULT_PROMPT_PATH
        self._system_prompt: str = resolved_path.read_text(encoding="utf-8")

        logger.info(
            "feature_generator.init",
            model=self._model,
            prompt_path=str(resolved_path),
        )

    async def generate(self, payload: FeatureGenInput) -> FeatureGenOutput:
        """Call Claude and return validated, clipped FeatureGenOutput."""
        user_message = payload.model_dump_json()

        logger.info(
            "feature_generator.request",
            home_team=payload.home_team,
            away_team=payload.away_team,
            model=self._model,
        )

        response = await self._client.messages.create(
            model=self._model,
            max_tokens=self.DEFAULT_MAX_TOKENS,
            system=self._system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )

        first_block = response.content[0]
        if not isinstance(first_block, TextBlock):
            raise ValueError(
                f"Expected TextBlock as first response content block, got {type(first_block).__name__}"
            )
        raw_text: str = first_block.text

        logger.debug("feature_generator.raw_response", length=len(raw_text))

        parsed = self._extract_json(raw_text)
        output = self._build_output(parsed)

        logger.info(
            "feature_generator.done",
            home_team=payload.home_team,
            away_team=payload.away_team,
        )

        return output

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _extract_json(text: str) -> dict[str, Any]:
        """Extract the first JSON object from *text*; raise ValueError if none found."""
        text = text.strip()

        # Try direct parse first (model returned clean JSON)
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                return data
        except json.JSONDecodeError:
            pass

        # Fall back: find first {...} span
        match = _JSON_BLOCK_RE.search(text)
        if not match:
            raise ValueError(f"No JSON object found in response: {text[:200]!r}")

        try:
            data = json.loads(match.group())
        except json.JSONDecodeError as exc:
            raise ValueError(f"Extracted text is not valid JSON: {match.group()[:200]!r}") from exc

        if not isinstance(data, dict):
            raise ValueError("Parsed JSON is not an object (dict)")

        return data

    @staticmethod
    def _build_output(data: dict[str, Any]) -> FeatureGenOutput:
        """Validate via Pydantic and clip all fields to [0, 1]."""
        # Clip before validation so Pydantic sees valid floats
        clipped: dict[str, Any] = {
            field: _clip(data[field]) if field in data else data.get(field)
            for field in _OUTPUT_FIELDS
        }
        # model_validate will raise ValidationError if required fields are missing
        return FeatureGenOutput.model_validate(clipped)
