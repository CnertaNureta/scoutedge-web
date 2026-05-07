"""Extra coverage for synthesis.synthesizer: paths missed by test_synthesizer.

Targets the small private helpers and the rarely-hit error branches:
- _extract_json: ValueError when extracted brace block is invalid JSON
- _extract_json: ValueError when parsed JSON is not a dict
- _coerce_float: None / unconvertible falls back to default
- _renorm_probs: wrong key set raises
- _renorm_weights: deviation > tolerance still renorms but logs the *_large* warning
- _confidence_from_float: medium branch
- synthesize(): ValueError when first block is not a TextBlock
- _build_result: numeric cast error
- _build_result: weights_used not a dict
- _build_result: weights_used missing required key
- _build_result: medium confidence, no primary_cause but with flags → "Flags: ..."
- _build_result: medium confidence, no primary_cause and no flags → risk_factor=None
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scoutedge_intelligence.synthesis import synthesizer as syn

# ---------------------------------------------------------------------------
# _extract_json
# ---------------------------------------------------------------------------


def test_extract_json_invalid_brace_block_raises_value_error() -> None:
    # Looks like an object but the JSON is broken (trailing comma + unquoted key).
    text = "garbage {key: 'value',} more garbage"
    with pytest.raises(ValueError, match="Extracted text is not valid JSON"):
        syn._extract_json(text)


def test_extract_json_non_dict_raises_value_error() -> None:
    """When the brace-extracted block parses to a list, raise ValueError."""
    # Note: top-level `[1,2,3]` would not be reached by the brace scan,
    # so we craft text where the first balanced brace contains a JSON list-ish
    # value that nonetheless parses as a *dict*. Easiest path: put a non-dict
    # JSON behind a {…} that itself parses successfully but is wrapped weirdly.
    # _balanced_brace_extract grabs the inner {} so we need the inner JSON to
    # parse to a non-dict — but valid JSON inside {} *is* always a dict, so
    # we instead patch _balanced_brace_extract to return a JSON array string.
    with (
        patch(
            "scoutedge_intelligence.synthesis.synthesizer._balanced_brace_extract",
            return_value="[1, 2, 3]",
        ),
        pytest.raises(ValueError, match="not an object"),
    ):
        syn._extract_json("doesn't matter")


# ---------------------------------------------------------------------------
# _coerce_float
# ---------------------------------------------------------------------------


def test_coerce_float_none_returns_default() -> None:
    assert syn._coerce_float(None, default=7.5) == 7.5


def test_coerce_float_unconvertible_returns_default() -> None:
    assert syn._coerce_float("nope", default=1.25) == 1.25
    assert syn._coerce_float(object(), default=2.5) == 2.5


# ---------------------------------------------------------------------------
# _renorm_probs / _renorm_weights / _confidence_from_float
# ---------------------------------------------------------------------------


def test_renorm_probs_wrong_keys_raises() -> None:
    bad = {"home": 0.5, "draw": 0.3, "away": 0.2}
    with pytest.raises(ValueError, match="must have exactly keys"):
        syn._renorm_probs(bad)


def test_renorm_weights_deviation_large_still_renorms() -> None:
    # Sum = 1.5 — outside the 0.05 tolerance — function still renormalises
    # but logs the "_large" warning.
    out = syn._renorm_weights({"ml": 0.6, "sb": 0.6, "poly": 0.3})
    total = sum(out.values())
    assert abs(total - 1.0) < 1e-9


def test_confidence_medium_branch() -> None:
    assert syn._confidence_from_float(0.55) == "medium"
    assert syn._confidence_from_float(0.45) == "medium"  # boundary
    assert syn._confidence_from_float(0.30) == "low"
    assert syn._confidence_from_float(0.95) == "high"


# ---------------------------------------------------------------------------
# JSONSynthesizer._build_result error paths
# ---------------------------------------------------------------------------


def _build_synthesizer() -> syn.JSONSynthesizer:
    """Construct a JSONSynthesizer with stubbed Anthropic client."""
    with patch("scoutedge_intelligence.synthesis.synthesizer.AsyncAnthropic"):
        return syn.JSONSynthesizer(client=MagicMock())


def _good_data(**overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "final_home": 0.5,
        "final_draw": 0.3,
        "final_away": 0.2,
        "final_confidence": 0.55,
        "weights_used": {"ml": 0.5, "sb": 0.3, "poly": 0.2},
        "risk_flags": [],
        "diagnosis_used": False,
        "primary_cause_reflected": None,
    }
    base.update(overrides)
    return base


def test_build_result_numeric_cast_error_raises() -> None:
    s = _build_synthesizer()
    bad = _good_data(final_home="not-a-number")
    with pytest.raises(ValueError, match="numeric cast error"):
        s._build_result(bad)


def test_build_result_weights_used_not_dict_raises() -> None:
    s = _build_synthesizer()
    bad = _good_data(weights_used=[0.5, 0.3, 0.2])
    with pytest.raises(ValueError, match="weights_used must be a dict"):
        s._build_result(bad)


def test_build_result_weights_used_missing_key_raises() -> None:
    s = _build_synthesizer()
    bad = _good_data(weights_used={"ml": 0.5})  # missing "sb"
    with pytest.raises(ValueError, match="weights_used parse error"):
        s._build_result(bad)


def test_build_result_medium_confidence_with_only_flags_sets_flags_risk_factor() -> None:
    s = _build_synthesizer()
    data = _good_data(
        final_confidence=0.55,
        primary_cause_reflected=None,
        risk_flags=["SHARP_MONEY_MOVE", "MARKET_THIN"],
    )
    result = s._build_result(data)
    assert result.confidence == "medium"
    assert result.risk_factor is not None
    assert "Flags:" in result.risk_factor
    assert "SHARP_MONEY_MOVE" in result.risk_factor


def test_build_result_medium_confidence_no_cause_no_flags_yields_none_risk_factor() -> None:
    s = _build_synthesizer()
    data = _good_data(
        final_confidence=0.55,
        primary_cause_reflected=None,
        risk_flags=[],
    )
    result = s._build_result(data)
    assert result.confidence == "medium"
    assert result.risk_factor is None


# ---------------------------------------------------------------------------
# synthesize() — non-text block raises
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_synthesize_non_text_block_raises_value_error() -> None:
    s = _build_synthesizer()

    # Build a fake response whose first content block is NOT a TextBlock.
    fake_block = MagicMock()  # not isinstance TextBlock
    fake_response = MagicMock()
    fake_response.content = [fake_block]
    s._client.messages.create = AsyncMock(return_value=fake_response)

    payload = syn.SynthesizerInput(
        ml={"home_win": 0.5, "draw": 0.3, "away_win": 0.2},
        sb={"home_win": 0.5, "draw": 0.3, "away_win": 0.2},
        poly=None,
        diagnosis=None,
        polymarket_metadata=None,
        divergence_features={},
        context_intel={},
    )

    with pytest.raises(ValueError, match="Expected TextBlock"):
        await s.synthesize(payload)
