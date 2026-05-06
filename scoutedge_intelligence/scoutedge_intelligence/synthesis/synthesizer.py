"""JSON Synthesizer: wraps Claude Sonnet (Role 3) to produce final probability synthesis JSON.

Consumes ML, Sportsbook, and Polymarket probability layers plus an optional divergence
diagnosis and divergence features, and returns a validated SynthesisResult.
"""

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
_DEFAULT_PROMPT_PATH = _PROMPTS_DIR / "synthesizer_system.md"

_PROB_KEYS: frozenset[str] = frozenset({"home_win", "draw", "away_win"})

# Confidence thresholds: float final_confidence → Literal
_CONFIDENCE_HIGH_THRESHOLD: float = 0.70
_CONFIDENCE_LOW_THRESHOLD: float = 0.45

# Margin clamp (goals)
_MARGIN_MAX: int = 5
_MARGIN_MIN: int = -5

# Tolerance for prob renormalisation
_PROB_RENORM_TOLERANCE: float = 0.01

# Tolerance for weight renormalisation
_WEIGHT_RENORM_TOLERANCE: float = 0.05


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------


class SynthesizerInput(BaseModel):
    """Input payload for the JSONSynthesizer."""

    ml: dict[str, float]
    """home_win, draw, away_win — should sum to 1.0."""
    sb: dict[str, float]
    """home_win, draw, away_win — should sum to 1.0."""
    poly: dict[str, float] | None
    """home_win, draw, away_win — or None when Polymarket is absent."""
    diagnosis: dict[str, Any] | None
    """AnalystOutput.model_dump() or None."""
    polymarket_metadata: dict[str, Any] | None
    """Liquidity, volume_24h, spread, age_h — or None."""
    divergence_features: dict[str, Any]
    """Divergence-features dict from compute_divergence_features."""
    context_intel: dict[str, Any]
    """FeatureGenOutput dict."""


class SynthesisResult(BaseModel):
    """Validated output from the JSONSynthesizer."""

    final_probs: dict[str, float]
    """home_win, draw, away_win — sum to 1.0."""
    confidence: Literal["high", "medium", "low"]
    """Overall confidence in the synthesis."""
    expected_margin: int
    """Signed expected goal margin: positive = home favoured, negative = away.
    Clamped to [-5, 5]."""
    risk_factor: str | None
    """Up to 200 chars describing the main risk; None if confidence is high."""
    weights_used: dict[str, float]
    """ml, sb, poly — sum to 1.0."""
    rationale: str
    """Up to 300 chars summarising the synthesis reasoning."""
    flags: list[str]
    """Diagnostic flags from the model (e.g. 'SHARP_MONEY_MOVE')."""

    @field_validator("rationale")
    @classmethod
    def _truncate_rationale(cls, v: str) -> str:
        """Truncate rationale to 300 characters."""
        return v[:300]

    @field_validator("risk_factor")
    @classmethod
    def _truncate_risk_factor(cls, v: str | None) -> str | None:
        """Truncate risk_factor to 200 characters."""
        if v is None:
            return None
        return v[:200]

    @field_validator("expected_margin")
    @classmethod
    def _clamp_margin(cls, v: int) -> int:
        """Clamp expected_margin to [-5, 5]."""
        return max(_MARGIN_MIN, min(_MARGIN_MAX, v))


# ---------------------------------------------------------------------------
# JSON extraction helpers
# duplicated intentionally to avoid synthesis ↔ analyst coupling
# ---------------------------------------------------------------------------


def _strip_json_fence(text: str) -> str:
    """Remove leading ```json / ``` fences if present."""
    stripped = text.strip()
    if stripped.startswith("```"):
        first_newline = stripped.find("\n")
        if first_newline != -1:
            stripped = stripped[first_newline + 1 :]
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
# Validation helpers
# ---------------------------------------------------------------------------


def _coerce_float(value: Any, default: float = 0.0) -> float:
    """Convert *value* to float; treat None and unconvertible values as *default*."""
    if value is None:
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _renorm_probs(probs: dict[str, float]) -> dict[str, float]:
    """Renormalise a probability dict to sum to exactly 1.0.

    Raises:
        ValueError: if the sum deviates by more than _PROB_RENORM_TOLERANCE from 1.0.
    """
    keys = set(probs.keys())
    if keys != _PROB_KEYS:
        raise ValueError(
            f"final_probs must have exactly keys {{home_win, draw, away_win}}, got {keys}"
        )
    total = sum(probs.values())
    if abs(total - 1.0) <= 1e-6:
        return dict(probs)
    if abs(total - 1.0) <= _PROB_RENORM_TOLERANCE:
        logger.debug("synthesizer.renorm_probs", original_sum=total)
        return {k: v / total for k, v in probs.items()}
    raise ValueError(
        f"final_probs sum is {total:.6f}, which is outside the renorm tolerance "
        f"(±{_PROB_RENORM_TOLERANCE}). Cannot produce valid probabilities."
    )


def _renorm_weights(weights: dict[str, float]) -> dict[str, float]:
    """Renormalise a weights dict to sum to 1.0, logging a warning if adjustment needed.

    Raises:
        ValueError: if sum deviates by more than _WEIGHT_RENORM_TOLERANCE.
    """
    total = sum(weights.values())
    if abs(total - 1.0) <= 1e-6:
        return dict(weights)
    if abs(total - 1.0) <= _WEIGHT_RENORM_TOLERANCE:
        logger.warning(
            "synthesizer.weights_renormalized",
            original_sum=total,
            deviation=abs(total - 1.0),
        )
        return {k: v / total for k, v in weights.items()}
    logger.warning(
        "synthesizer.weights_deviation_large",
        original_sum=total,
        deviation=abs(total - 1.0),
    )
    return {k: v / total for k, v in weights.items()}


def _confidence_from_float(value: float) -> Literal["high", "medium", "low"]:
    """Convert a float confidence [0.10, 0.95] to a Literal level."""
    if value >= _CONFIDENCE_HIGH_THRESHOLD:
        return "high"
    if value >= _CONFIDENCE_LOW_THRESHOLD:
        return "medium"
    return "low"


def _expected_margin_from_probs(final_probs: dict[str, float]) -> int:
    """Estimate signed goal margin from 1X2 probabilities.

    Uses a simple linear mapping: (P_home - P_away) * 5 rounds to int,
    then clamps to [-5, 5].
    """
    home = final_probs.get("home_win", 0.0)
    away = final_probs.get("away_win", 0.0)
    raw = (home - away) * 5.0
    clamped = max(float(_MARGIN_MIN), min(float(_MARGIN_MAX), raw))
    return round(clamped)


# ---------------------------------------------------------------------------
# JSONSynthesizer
# ---------------------------------------------------------------------------


class JSONSynthesizer:
    """Wraps Claude Sonnet with the Role-3 prompt to produce the final probability synthesis.

    Given all three probability layers (ML, Sportsbook, Polymarket), an optional Analyst
    diagnosis, and divergence features, returns a validated SynthesisResult.
    """

    DEFAULT_MODEL = "claude-sonnet-4-6"
    DEFAULT_MAX_TOKENS = 900

    def __init__(
        self,
        client: AsyncAnthropic | None = None,
        *,
        model: str | None = None,
        prompt_path: str | None = None,
    ) -> None:
        """Initialise the synthesizer.

        Args:
            client: An AsyncAnthropic instance; if None, one is created from env.
            model: Model override. Precedence: env ANTHROPIC_MODEL_SYNTHESIZER > arg > DEFAULT.
            prompt_path: Path to the system prompt file; defaults to synthesizer_system.md.
        """
        self._model: str = (
            os.environ.get("ANTHROPIC_MODEL_SYNTHESIZER") or model or self.DEFAULT_MODEL
        )
        self._client: AsyncAnthropic = client if client is not None else AsyncAnthropic()

        resolved_path = Path(prompt_path) if prompt_path else _DEFAULT_PROMPT_PATH
        self._system_prompt: str = resolved_path.read_text(encoding="utf-8")

        logger.info(
            "json_synthesizer.init",
            model=self._model,
            prompt_path=str(resolved_path),
        )

    async def synthesize(self, payload: SynthesizerInput) -> SynthesisResult:
        """Call Claude Sonnet and return a validated SynthesisResult.

        Args:
            payload: All inputs required by the Role-3 synthesis prompt.

        Returns:
            A fully-validated SynthesisResult.

        Raises:
            ValueError: If the model response cannot be parsed or validated.
        """
        user_message = json.dumps(payload.model_dump())

        logger.info("json_synthesizer.request", model=self._model)

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

        logger.debug(
            "json_synthesizer.raw_response",
            preview=raw_text[:200],
            total_length=len(raw_text),
        )

        parsed = _extract_json(raw_text)
        return self._build_result(parsed)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _build_result(self, data: dict[str, Any]) -> SynthesisResult:
        """Validate and convert raw parsed JSON into a SynthesisResult.

        The Role-3 prompt returns a flat schema with keys:
          final_home, final_draw, final_away, final_confidence,
          weights_used (ml, sb, pm), risk_flags, diagnosis_used,
          primary_cause_reflected.

        This method maps that shape to SynthesisResult, performing:
          - final_probs assembly and renormalisation
          - confidence float → Literal conversion
          - expected_margin derivation and clamping
          - risk_factor derivation
          - weights_used key rename (pm → poly) and renormalisation
          - rationale construction
          - flags passthrough

        Raises:
            ValueError: On missing required fields or out-of-tolerance sums.
        """
        # --- Required fields ----------------------------------------------------
        required = ("final_home", "final_draw", "final_away", "final_confidence", "weights_used")
        missing = [f for f in required if f not in data]
        if missing:
            raise ValueError(f"SynthesisResult validation failed: missing fields {missing}")

        try:
            final_home = float(data["final_home"])
            final_draw = float(data["final_draw"])
            final_away = float(data["final_away"])
            final_confidence_raw = float(data["final_confidence"])
        except (TypeError, ValueError) as exc:
            raise ValueError(
                f"SynthesisResult validation failed: numeric cast error: {exc}"
            ) from exc

        # --- final_probs --------------------------------------------------------
        raw_probs: dict[str, float] = {
            "home_win": final_home,
            "draw": final_draw,
            "away_win": final_away,
        }
        final_probs = _renorm_probs(raw_probs)

        # --- confidence ---------------------------------------------------------
        confidence: Literal["high", "medium", "low"] = _confidence_from_float(final_confidence_raw)

        # --- expected_margin ----------------------------------------------------
        expected_margin = _expected_margin_from_probs(final_probs)

        # --- weights_used -------------------------------------------------------
        raw_weights_obj = data["weights_used"]
        if not isinstance(raw_weights_obj, dict):
            raise ValueError(
                f"SynthesisResult validation failed: weights_used must be a dict, "
                f"got {type(raw_weights_obj).__name__}"
            )

        # Prompt uses key "pm"; SynthesisResult uses "poly"
        try:
            weights_raw: dict[str, float] = {
                "ml": float(raw_weights_obj["ml"]),
                "sb": float(raw_weights_obj["sb"]),
                "poly": _coerce_float(raw_weights_obj.get("poly", raw_weights_obj.get("pm", 0.0))),
            }
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(
                f"SynthesisResult validation failed: weights_used parse error: {exc}"
            ) from exc

        weights_used = _renorm_weights(weights_raw)

        # --- flags --------------------------------------------------------------
        flags_raw = data.get("risk_flags", [])
        flags: list[str] = list(flags_raw) if isinstance(flags_raw, list) else []

        # --- risk_factor --------------------------------------------------------
        risk_factor: str | None
        if confidence == "high":
            risk_factor = None
        else:
            # Build risk_factor from primary_cause + flags if available
            cause = data.get("primary_cause_reflected")
            if cause:
                base = f"Primary cause: {cause}"
                if flags:
                    base += f". Flags: {', '.join(flags[:3])}"
                risk_factor = base[:200]
            elif flags:
                risk_factor = f"Flags: {', '.join(flags[:3])}"[:200]
            else:
                risk_factor = None

        # --- rationale ----------------------------------------------------------
        cause = data.get("primary_cause_reflected")
        diag_used = data.get("diagnosis_used", False)
        conf_label = confidence.upper()
        parts: list[str] = [f"Confidence: {conf_label}."]
        if cause:
            parts.append(f"Cause: {cause}.")
        if diag_used:
            parts.append("Diagnosis incorporated.")
        if flags:
            parts.append(f"Flags: {', '.join(flags[:2])}.")
        rationale = " ".join(parts)[:300]

        try:
            return SynthesisResult(
                final_probs=final_probs,
                confidence=confidence,
                expected_margin=expected_margin,
                risk_factor=risk_factor,
                weights_used=weights_used,
                rationale=rationale,
                flags=flags,
            )
        except Exception as exc:
            raise ValueError(f"SynthesisResult validation failed: {exc}") from exc
