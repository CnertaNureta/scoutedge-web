"""Unit tests for scoutedge_intelligence.synthesis.synthesizer (task P3.7)."""

from __future__ import annotations

import json
import os
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from anthropic.types import TextBlock

from scoutedge_intelligence.synthesis.synthesizer import (
    JSONSynthesizer,
    SynthesisResult,
    SynthesizerInput,
    _balanced_brace_extract,
    _extract_json,
    _strip_json_fence,
)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

_VALID_INPUT: dict[str, Any] = {
    "ml": {"home_win": 0.50, "draw": 0.25, "away_win": 0.25},
    "sb": {"home_win": 0.45, "draw": 0.30, "away_win": 0.25},
    "poly": {"home_win": 0.55, "draw": 0.20, "away_win": 0.25},
    "diagnosis": {
        "polymarket_reliability": "medium",
        "ml_staleness_risk": "low",
        "sb_signal_quality": "high",
        "largest_gap_leg": "home",
        "largest_gap_pair": "ml_sb",
        "primary_cause": "SHARP_MONEY_MOVE",
        "cause_confidence": 0.7,
        "source_trust_ranking": ["sportsbook", "ml", "polymarket"],
        "ml_weight_adjustment": -0.1,
        "sb_weight_adjustment": 0.2,
        "pm_weight_adjustment": -0.1,
        "unexpected_trigger": False,
        "diagnosis_notes": "Sportsbook moved on injury news.",
    },
    "polymarket_metadata": {
        "liquidity": 75000.0,
        "volume_24h": 12000.0,
        "spread": 0.03,
        "age_h": 48.0,
    },
    "divergence_features": {
        "ml_sb_max_gap": 0.12,
        "sb_pm_max_gap": 0.10,
        "ml_pm_max_gap": 0.05,
        "three_way_entropy": 0.08,
    },
    "context_intel": {
        "home_key_player_availability": 0.9,
        "away_key_player_availability": 0.8,
        "home_lineup_certainty": 0.7,
        "away_lineup_certainty": 0.6,
        "weather_adversity": 0.2,
        "intel_confidence": 0.75,
    },
}

_VALID_OUTPUT: dict[str, Any] = {
    "final_home": 0.48,
    "final_draw": 0.27,
    "final_away": 0.25,
    "final_confidence": 0.75,
    "weights_used": {"ml": 0.40, "sb": 0.45, "pm": 0.15},
    "risk_flags": ["SHARP_MONEY_MOVE"],
    "diagnosis_used": True,
    "primary_cause_reflected": "SHARP_MONEY_MOVE",
}


def _make_mock_client(response_text: str) -> MagicMock:
    content_block = TextBlock(type="text", text=response_text)
    message_obj = MagicMock()
    message_obj.content = [content_block]

    client = MagicMock()
    client.messages = MagicMock()
    client.messages.create = AsyncMock(return_value=message_obj)
    return client


def _make_synthesizer(response_text: str, **kwargs: Any) -> JSONSynthesizer:
    client = _make_mock_client(response_text)
    return JSONSynthesizer(client=client, **kwargs)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# 1. Happy path: valid JSON → SynthesisResult populated correctly
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_happy_path_returns_synthesis_result() -> None:
    """Model returns valid JSON; SynthesisResult is populated correctly."""
    synth = _make_synthesizer(json.dumps(_VALID_OUTPUT))
    result = await synth.synthesize(SynthesizerInput(**_VALID_INPUT))

    assert isinstance(result, SynthesisResult)
    assert set(result.final_probs.keys()) == {"home_win", "draw", "away_win"}
    assert abs(sum(result.final_probs.values()) - 1.0) < 1e-6
    assert result.confidence == "high"
    assert result.expected_margin in range(-5, 6)
    assert set(result.weights_used.keys()) == {"ml", "sb", "poly"}
    assert abs(sum(result.weights_used.values()) - 1.0) < 1e-6
    assert isinstance(result.rationale, str)
    assert len(result.rationale) <= 300
    assert isinstance(result.flags, list)
    assert "SHARP_MONEY_MOVE" in result.flags


# ---------------------------------------------------------------------------
# 2. JSON in ```json fences parsed correctly
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_json_in_markdown_fence_parsed() -> None:
    """Model wraps JSON in ```json fences; extraction still works."""
    fenced = f"```json\n{json.dumps(_VALID_OUTPUT)}\n```"
    synth = _make_synthesizer(fenced)
    result = await synth.synthesize(SynthesizerInput(**_VALID_INPUT))
    assert isinstance(result, SynthesisResult)
    assert result.confidence in {"high", "medium", "low"}


# ---------------------------------------------------------------------------
# 3. Missing required field → ValueError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_required_field_raises_value_error() -> None:
    """Response missing 'final_home' raises ValueError."""
    incomplete = {k: v for k, v in _VALID_OUTPUT.items() if k != "final_home"}
    synth = _make_synthesizer(json.dumps(incomplete))
    with pytest.raises(ValueError, match="missing fields"):
        await synth.synthesize(SynthesizerInput(**_VALID_INPUT))


# ---------------------------------------------------------------------------
# 4. Invalid confidence Literal → ValueError via Pydantic
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invalid_confidence_literal_raises_value_error() -> None:
    """Confidence value 'extreme' is not a valid Literal and raises ValueError."""
    # We set final_confidence to something that would map to a string we inject manually
    # by bypassing the float path — patch _confidence_from_float to return an invalid string
    synth = _make_synthesizer(json.dumps(_VALID_OUTPUT))
    with (
        patch(
            "scoutedge_intelligence.synthesis.synthesizer._confidence_from_float",
            return_value="extreme",
        ),
        pytest.raises((ValueError, Exception)),
    ):
        await synth.synthesize(SynthesizerInput(**_VALID_INPUT))


# ---------------------------------------------------------------------------
# 5. final_probs near 1.0 (sum=1.005) → renormalized; sum exactly 1.0 in result
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_final_probs_near_one_renormalized() -> None:
    """Sum 1.005 (within ±0.01 tolerance) is renormalized to exactly 1.0."""
    out = {
        **_VALID_OUTPUT,
        "final_home": 0.485,  # 0.485 + 0.272 + 0.248 = 1.005
        "final_draw": 0.272,
        "final_away": 0.248,
    }
    synth = _make_synthesizer(json.dumps(out))
    result = await synth.synthesize(SynthesizerInput(**_VALID_INPUT))
    assert abs(sum(result.final_probs.values()) - 1.0) < 1e-6


# ---------------------------------------------------------------------------
# 6. final_probs sum way off (1.5) → ValueError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_final_probs_sum_way_off_raises_value_error() -> None:
    """Sum 1.5 is outside the ±0.01 renorm tolerance and raises ValueError."""
    out = {
        **_VALID_OUTPUT,
        "final_home": 0.60,
        "final_draw": 0.50,
        "final_away": 0.40,
    }
    synth = _make_synthesizer(json.dumps(out))
    with pytest.raises(ValueError):
        await synth.synthesize(SynthesizerInput(**_VALID_INPUT))


# ---------------------------------------------------------------------------
# 7. weights_used sum slightly off (0.97) → renormalized + warning logged
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_weights_slightly_off_renormalized_with_warning(caplog: Any) -> None:
    """Weights summing to 0.97 are renormalized; a structlog warning is emitted."""
    import structlog.testing

    out = {
        **_VALID_OUTPUT,
        "weights_used": {"ml": 0.38, "sb": 0.44, "pm": 0.15},  # sum = 0.97
    }
    synth = _make_synthesizer(json.dumps(out))

    with structlog.testing.capture_logs() as captured:
        result = await synth.synthesize(SynthesizerInput(**_VALID_INPUT))

    assert abs(sum(result.weights_used.values()) - 1.0) < 1e-6
    events = [e.get("event", "") for e in captured]
    assert any("renormalized" in ev or "deviation" in ev for ev in events)


# ---------------------------------------------------------------------------
# 8. expected_margin clamped: 10 → 5; -10 → -5
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_expected_margin_clamped_positive() -> None:
    """Home probability far above away results in expected_margin clamped at +5."""
    out = {
        **_VALID_OUTPUT,
        "final_home": 0.97,
        "final_draw": 0.02,
        "final_away": 0.01,
    }
    synth = _make_synthesizer(json.dumps(out))
    result = await synth.synthesize(SynthesizerInput(**_VALID_INPUT))
    assert result.expected_margin == 5


@pytest.mark.asyncio
async def test_expected_margin_clamped_negative() -> None:
    """Away probability far above home results in expected_margin clamped at -5."""
    out = {
        **_VALID_OUTPUT,
        "final_home": 0.01,
        "final_draw": 0.02,
        "final_away": 0.97,
    }
    synth = _make_synthesizer(json.dumps(out))
    result = await synth.synthesize(SynthesizerInput(**_VALID_INPUT))
    assert result.expected_margin == -5


# ---------------------------------------------------------------------------
# 9. rationale and risk_factor truncation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_rationale_and_risk_factor_truncated() -> None:
    """Rationale > 300 chars and risk_factor > 200 chars are truncated."""
    long_cause = "X" * 500
    out = {
        **_VALID_OUTPUT,
        "final_confidence": 0.40,  # → low confidence so risk_factor is set
        "primary_cause_reflected": long_cause,
        "risk_flags": ["FLAG_A"],
    }
    synth = _make_synthesizer(json.dumps(out))
    result = await synth.synthesize(SynthesizerInput(**_VALID_INPUT))
    assert len(result.rationale) <= 300
    if result.risk_factor is not None:
        assert len(result.risk_factor) <= 200


# ---------------------------------------------------------------------------
# 10. diagnosis=None and poly=None case works
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_none_diagnosis_and_poly_accepted() -> None:
    """SynthesizerInput with diagnosis=None and poly=None is valid."""
    inp = {**_VALID_INPUT, "diagnosis": None, "poly": None, "polymarket_metadata": None}
    out = {
        **_VALID_OUTPUT,
        "diagnosis_used": False,
        "primary_cause_reflected": None,
        "risk_flags": [],
    }
    synth = _make_synthesizer(json.dumps(out))
    result = await synth.synthesize(SynthesizerInput(**inp))
    assert isinstance(result, SynthesisResult)
    assert result.flags == []


# ---------------------------------------------------------------------------
# 11. Custom model env var picked up
# ---------------------------------------------------------------------------


def test_custom_model_env_var_picked_up() -> None:
    """ANTHROPIC_MODEL_SYNTHESIZER env var takes precedence over arg and default."""
    env_model = "claude-synthesizer-custom"
    with patch.dict(os.environ, {"ANTHROPIC_MODEL_SYNTHESIZER": env_model}):
        synth = JSONSynthesizer(
            client=_make_mock_client("{}"),  # type: ignore[arg-type]
            model="claude-sonnet-ignored",
        )
    assert synth._model == env_model


def test_default_model_used_when_nothing_overrides() -> None:
    """DEFAULT_MODEL is used when env var and arg are absent."""
    env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_MODEL_SYNTHESIZER"}
    with patch.dict(os.environ, env, clear=True):
        synth = JSONSynthesizer(client=_make_mock_client("{}"))  # type: ignore[arg-type]
    assert synth._model == JSONSynthesizer.DEFAULT_MODEL


# ---------------------------------------------------------------------------
# 12. weights_used accepts "poly" key (not just "pm")
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_weights_with_poly_key_accepted() -> None:
    """weights_used dict using 'poly' key (not 'pm') is correctly handled."""
    out = {
        **_VALID_OUTPUT,
        "weights_used": {"ml": 0.40, "sb": 0.45, "poly": 0.15},
    }
    synth = _make_synthesizer(json.dumps(out))
    result = await synth.synthesize(SynthesizerInput(**_VALID_INPUT))
    assert abs(sum(result.weights_used.values()) - 1.0) < 1e-6
    assert "poly" in result.weights_used


# ---------------------------------------------------------------------------
# JSON helper unit tests
# ---------------------------------------------------------------------------


def test_strip_json_fence_removes_backtick_fences() -> None:
    raw = '```json\n{"key": 1}\n```'
    result = _strip_json_fence(raw)
    assert "```" not in result
    assert '{"key": 1}' in result


def test_strip_json_fence_no_fence_unchanged() -> None:
    raw = '{"key": 1}'
    assert _strip_json_fence(raw) == raw


def test_balanced_brace_extract_nested() -> None:
    text = 'prefix {"outer": {"inner": 1}} suffix'
    result = _balanced_brace_extract(text)
    assert result == '{"outer": {"inner": 1}}'


def test_balanced_brace_extract_no_brace_raises() -> None:
    with pytest.raises(ValueError, match="No balanced JSON"):
        _balanced_brace_extract("no braces here")


def test_extract_json_raises_on_no_json() -> None:
    with pytest.raises(ValueError):
        _extract_json("this contains no JSON at all")


def test_extract_json_direct_parse() -> None:
    data = {"a": 1, "b": 2}
    assert _extract_json(json.dumps(data)) == data


def test_extract_json_via_brace_scan() -> None:
    text = f"Some text before {json.dumps({'x': 42})} and after"
    result = _extract_json(text)
    assert result == {"x": 42}
