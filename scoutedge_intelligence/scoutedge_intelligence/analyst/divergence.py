"""Divergence Analyst: wraps Claude Sonnet (Role 2) to produce a divergence diagnosis JSON."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Literal

import structlog
from anthropic import AsyncAnthropic
from anthropic.types import TextBlock
from pydantic import BaseModel, field_validator

logger = structlog.get_logger(__name__)

_PROMPTS_DIR = Path(__file__).parent.parent / "claude" / "prompts"
_DEFAULT_PROMPT_PATH = _PROMPTS_DIR / "analyst_system.md"


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class AnalystInput(BaseModel):
    ml: dict[str, float]  # home_win, draw, away_win
    sb: dict[str, float]
    poly: dict[str, float] | None
    triggered_signals: list[str]
    divergence_metrics: dict[str, Any]  # the divergence-features dict
    polymarket_metadata: dict[str, Any] | None  # liquidity, volume_24h, spread, age_h
    context_intel: dict[str, Any]  # the FeatureGenOutput dict
    ml_metadata: dict[str, Any]  # model_version, last_trained, elo, weights, etc.


_ReliabilityLevel = Literal["high", "medium", "low"]
_GapLeg = Literal["home", "draw", "away"]
_GapPair = Literal["ml_sb", "sb_pm", "ml_pm"]
_PrimaryCause = Literal[
    "LATE_INTEL",
    "ML_REGIME_BREAK",
    "POLY_THIN_BOOK",
    "SHARP_MONEY_MOVE",
    "DRAW_COMPLEXITY",
    "MODEL_UNCERTAINTY",
]
_TrustSource = Literal["sportsbook", "ml", "polymarket"]


class AnalystOutput(BaseModel):
    """Schema mirrors `claude/prompts/analyst_system.md` Required Output JSON Schema."""

    polymarket_reliability: _ReliabilityLevel
    ml_staleness_risk: _ReliabilityLevel
    sb_signal_quality: _ReliabilityLevel
    largest_gap_leg: _GapLeg
    largest_gap_pair: _GapPair
    primary_cause: _PrimaryCause
    cause_confidence: float
    source_trust_ranking: list[_TrustSource]
    ml_weight_adjustment: float
    sb_weight_adjustment: float
    pm_weight_adjustment: float
    unexpected_trigger: bool
    diagnosis_notes: str | None = None

    @field_validator("cause_confidence")
    @classmethod
    def _clip_confidence(cls, v: float) -> float:
        return float(min(1.0, max(0.0, v)))

    @field_validator("ml_weight_adjustment", "sb_weight_adjustment", "pm_weight_adjustment")
    @classmethod
    def _clip_signed_weight(cls, v: float) -> float:
        return float(min(1.0, max(-1.0, v)))

    @field_validator("source_trust_ranking")
    @classmethod
    def _ranking_size(cls, v: list[str]) -> list[str]:
        if len(v) != 3:
            raise ValueError("source_trust_ranking must contain exactly 3 entries")
        if len(set(v)) != 3:
            raise ValueError("source_trust_ranking entries must be distinct")
        return v


# ---------------------------------------------------------------------------
# JSON extraction helpers
# ---------------------------------------------------------------------------


def _strip_json_fence(text: str) -> str:
    """Remove leading ```json / ``` fences if present."""
    stripped = text.strip()
    if stripped.startswith("```"):
        # Remove the opening fence line
        first_newline = stripped.find("\n")
        if first_newline != -1:
            stripped = stripped[first_newline + 1 :]
        # Remove a trailing ``` fence
        if stripped.rstrip().endswith("```"):
            stripped = stripped.rstrip()[:-3].rstrip()
    return stripped


def _balanced_brace_extract(text: str) -> str:
    """Return the first balanced {...} substring from *text*.

    Uses a depth counter so nested objects are handled correctly.
    Raises ValueError if no balanced brace pair is found.
    """
    start: int | None = None
    depth = 0
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start is not None:
                return text[start : i + 1]
    raise ValueError("No balanced JSON object found in response text")


def _extract_json(raw_text: str) -> dict[str, Any]:
    """Extract and parse the first JSON object from *raw_text*.

    Strategy (in order):
    1. Direct parse (model returned clean JSON).
    2. Strip ```json fences, then direct parse.
    3. Balanced-brace scan to extract the outermost {...} substring.
    """
    # 1. Direct parse
    try:
        data = json.loads(raw_text.strip())
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    # 2. Strip fences and try again
    defenced = _strip_json_fence(raw_text)
    try:
        data = json.loads(defenced)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    # 3. Balanced-brace scan
    extracted = _balanced_brace_extract(raw_text)
    try:
        data = json.loads(extracted)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Extracted text is not valid JSON: {extracted[:200]!r}") from exc

    if not isinstance(data, dict):
        raise ValueError("Parsed JSON is not an object (dict)")

    return data


# ---------------------------------------------------------------------------
# DivergenceAnalyst
# ---------------------------------------------------------------------------


class DivergenceAnalyst:
    """Wraps Claude Sonnet with the Role-2 prompt to produce a divergence diagnosis."""

    DEFAULT_MODEL = "claude-sonnet-4-6"
    DEFAULT_MAX_TOKENS = 1500

    def __init__(
        self,
        client: AsyncAnthropic | None = None,
        *,
        model: str | None = None,
        prompt_path: str | None = None,
    ) -> None:
        # Model precedence: env ANTHROPIC_MODEL_ANALYST > arg > DEFAULT_MODEL
        self._model: str = os.environ.get("ANTHROPIC_MODEL_ANALYST") or model or self.DEFAULT_MODEL

        # Client: use provided or build from env ANTHROPIC_API_KEY
        self._client: AsyncAnthropic = client if client is not None else AsyncAnthropic()

        # System prompt: read once and cache
        resolved_path = Path(prompt_path) if prompt_path else _DEFAULT_PROMPT_PATH
        self._system_prompt: str = resolved_path.read_text(encoding="utf-8")

        logger.info(
            "divergence_analyst.init",
            model=self._model,
            prompt_path=str(resolved_path),
        )

    async def diagnose(self, payload: AnalystInput) -> AnalystOutput:
        """Call Claude Sonnet and return a validated AnalystOutput."""
        user_message = json.dumps(payload.model_dump())

        logger.info("divergence_analyst.request", model=self._model)

        response = await self._client.messages.create(
            model=self._model,
            max_tokens=self.DEFAULT_MAX_TOKENS,
            system=self._system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )

        first_block = response.content[0]
        if not isinstance(first_block, TextBlock):
            raise ValueError(
                f"Expected TextBlock as first response content block, "
                f"got {type(first_block).__name__}"
            )
        raw_text: str = first_block.text

        logger.debug("divergence_analyst.raw_response_length", length=len(raw_text))

        parsed = _extract_json(raw_text)
        return self._build_output(parsed)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _build_output(data: dict[str, Any]) -> AnalystOutput:
        """Validate via Pydantic (per-field clipping handled by validators)."""
        try:
            return AnalystOutput.model_validate(data)
        except Exception as exc:
            raise ValueError(f"AnalystOutput validation failed: {exc}") from exc
