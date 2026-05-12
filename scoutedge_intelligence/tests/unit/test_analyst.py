"""Unit tests for scoutedge_intelligence.analyst.divergence (task P3.6)."""

from __future__ import annotations

import json
import os
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from anthropic.types import TextBlock

from scoutedge_intelligence.analyst.divergence import (
    AnalystInput,
    AnalystOutput,
    DivergenceAnalyst,
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
    "triggered_signals": ["ML_SB_HOME_GAP"],
    "divergence_metrics": {
        "ml_sb_max_gap": 0.12,
        "sb_pm_max_gap": 0.10,
        "ml_pm_max_gap": 0.05,
        "three_way_entropy": 0.08,
    },
    "polymarket_metadata": {
        "liquidity": 75000.0,
        "volume_24h": 12000.0,
        "spread": 0.03,
        "age_h": 48.0,
    },
    "context_intel": {
        "home_key_player_availability": 0.9,
        "away_key_player_availability": 0.8,
        "home_lineup_certainty": 0.7,
        "away_lineup_certainty": 0.6,
        "weather_adversity": 0.2,
        "home_travel_fatigue": 0.1,
        "away_travel_fatigue": 0.3,
        "crowd_advantage": 0.5,
        "intel_confidence": 0.75,
    },
    "ml_metadata": {
        "model_version": "v2.1",
        "last_trained": "2026-04-20",
        "elo_home": 1850.0,
        "elo_away": 1780.0,
        "dixon_coles_weight": 0.6,
        "player_lambda_weight": 0.4,
    },
}

_VALID_OUTPUT: dict[str, Any] = {
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
    "diagnosis_notes": "Sportsbook moved on injury news; ML appears stale.",
}


def _make_mock_client(response_text: str) -> MagicMock:
    content_block = TextBlock(type="text", text=response_text)
    message_obj = MagicMock()
    message_obj.content = [content_block]

    client = MagicMock()
    client.messages = MagicMock()
    client.messages.create = AsyncMock(return_value=message_obj)
    return client


def _make_analyst(response_text: str, **kwargs: Any) -> DivergenceAnalyst:
    client = _make_mock_client(response_text)
    return DivergenceAnalyst(client=client, **kwargs)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_happy_path_returns_analyst_output() -> None:
    analyst = _make_analyst(json.dumps(_VALID_OUTPUT))
    result = await analyst.diagnose(AnalystInput(**_VALID_INPUT))

    assert isinstance(result, AnalystOutput)
    assert result.polymarket_reliability == "medium"
    assert result.primary_cause == "SHARP_MONEY_MOVE"
    assert result.largest_gap_leg == "home"
    assert result.source_trust_ranking == ["sportsbook", "ml", "polymarket"]
    assert result.diagnosis_notes is not None


# ---------------------------------------------------------------------------
# JSON parsing variants
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_json_in_markdown_fence_parsed() -> None:
    fenced = f"```json\n{json.dumps(_VALID_OUTPUT)}\n```"
    analyst = _make_analyst(fenced)
    result = await analyst.diagnose(AnalystInput(**_VALID_INPUT))
    assert isinstance(result, AnalystOutput)
    assert result.sb_signal_quality == "high"


@pytest.mark.asyncio
async def test_prose_around_json_extracted_via_brace_scan() -> None:
    prose = (
        "Here is my diagnosis for the match:\n\n"
        f"{json.dumps(_VALID_OUTPUT)}\n\n"
        "I hope this is useful for the synthesizer."
    )
    analyst = _make_analyst(prose)
    result = await analyst.diagnose(AnalystInput(**_VALID_INPUT))
    assert isinstance(result, AnalystOutput)
    assert result.largest_gap_pair == "ml_sb"


# ---------------------------------------------------------------------------
# Validation failures
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_required_field_raises_value_error() -> None:
    incomplete = {k: v for k, v in _VALID_OUTPUT.items() if k != "primary_cause"}
    analyst = _make_analyst(json.dumps(incomplete))
    with pytest.raises(ValueError, match="validation failed"):
        await analyst.diagnose(AnalystInput(**_VALID_INPUT))


@pytest.mark.asyncio
async def test_invalid_reliability_level_raises_value_error() -> None:
    bad = {**_VALID_OUTPUT, "polymarket_reliability": "very_high"}
    analyst = _make_analyst(json.dumps(bad))
    with pytest.raises(ValueError):
        await analyst.diagnose(AnalystInput(**_VALID_INPUT))


@pytest.mark.asyncio
async def test_invalid_primary_cause_raises_value_error() -> None:
    bad = {**_VALID_OUTPUT, "primary_cause": "ALIEN_INVASION"}
    analyst = _make_analyst(json.dumps(bad))
    with pytest.raises(ValueError):
        await analyst.diagnose(AnalystInput(**_VALID_INPUT))


@pytest.mark.asyncio
async def test_source_trust_ranking_wrong_length_raises() -> None:
    bad = {**_VALID_OUTPUT, "source_trust_ranking": ["sportsbook", "ml"]}
    analyst = _make_analyst(json.dumps(bad))
    with pytest.raises(ValueError):
        await analyst.diagnose(AnalystInput(**_VALID_INPUT))


@pytest.mark.asyncio
async def test_source_trust_ranking_duplicates_raises() -> None:
    bad = {**_VALID_OUTPUT, "source_trust_ranking": ["ml", "ml", "polymarket"]}
    analyst = _make_analyst(json.dumps(bad))
    with pytest.raises(ValueError):
        await analyst.diagnose(AnalystInput(**_VALID_INPUT))


# ---------------------------------------------------------------------------
# Field clipping
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_signed_weight_adjustment_clipped_above_one() -> None:
    out = {**_VALID_OUTPUT, "ml_weight_adjustment": 1.8}
    analyst = _make_analyst(json.dumps(out))
    result = await analyst.diagnose(AnalystInput(**_VALID_INPUT))
    assert result.ml_weight_adjustment == pytest.approx(1.0)


@pytest.mark.asyncio
async def test_signed_weight_adjustment_clipped_below_neg_one() -> None:
    out = {**_VALID_OUTPUT, "sb_weight_adjustment": -2.5}
    analyst = _make_analyst(json.dumps(out))
    result = await analyst.diagnose(AnalystInput(**_VALID_INPUT))
    assert result.sb_weight_adjustment == pytest.approx(-1.0)


@pytest.mark.asyncio
async def test_cause_confidence_clipped_to_unit_interval() -> None:
    out_high = {**_VALID_OUTPUT, "cause_confidence": 1.5}
    analyst = _make_analyst(json.dumps(out_high))
    result_high = await analyst.diagnose(AnalystInput(**_VALID_INPUT))
    assert result_high.cause_confidence == pytest.approx(1.0)

    out_low = {**_VALID_OUTPUT, "cause_confidence": -0.2}
    analyst2 = _make_analyst(json.dumps(out_low))
    result_low = await analyst2.diagnose(AnalystInput(**_VALID_INPUT))
    assert result_low.cause_confidence == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# Optional fields
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_diagnosis_notes_optional() -> None:
    out = {**_VALID_OUTPUT, "diagnosis_notes": None}
    analyst = _make_analyst(json.dumps(out))
    result = await analyst.diagnose(AnalystInput(**_VALID_INPUT))
    assert result.diagnosis_notes is None


@pytest.mark.asyncio
async def test_diagnosis_notes_omitted_defaults_to_none() -> None:
    out = {k: v for k, v in _VALID_OUTPUT.items() if k != "diagnosis_notes"}
    analyst = _make_analyst(json.dumps(out))
    result = await analyst.diagnose(AnalystInput(**_VALID_INPUT))
    assert result.diagnosis_notes is None


@pytest.mark.asyncio
async def test_poly_none_in_input_accepted() -> None:
    inp = {**_VALID_INPUT, "poly": None, "polymarket_metadata": None}
    analyst = _make_analyst(json.dumps(_VALID_OUTPUT))
    result = await analyst.diagnose(AnalystInput(**inp))
    assert isinstance(result, AnalystOutput)


# ---------------------------------------------------------------------------
# Model selection / env var
# ---------------------------------------------------------------------------


def test_custom_model_env_var_picked_up() -> None:
    env_model = "claude-sonnet-analyst-custom"
    with patch.dict(os.environ, {"ANTHROPIC_MODEL_ANALYST": env_model}):
        analyst = DivergenceAnalyst(
            client=_make_mock_client("{}"),  # type: ignore[arg-type]
            model="claude-sonnet-ignored",
        )
    assert analyst._model == env_model


def test_default_model_used_when_nothing_overrides() -> None:
    env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_MODEL_ANALYST"}
    with patch.dict(os.environ, env, clear=True):
        analyst = DivergenceAnalyst(client=_make_mock_client("{}"))  # type: ignore[arg-type]
    assert analyst._model == DivergenceAnalyst.DEFAULT_MODEL


# ---------------------------------------------------------------------------
# JSON helpers
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
