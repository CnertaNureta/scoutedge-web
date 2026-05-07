"""Unit tests for scoutedge_intelligence.experiments (task P7.5).

Covers both ab_runner.ABRunner / ABRunResult and analysis.analyse /
AnalysisReport to a combined coverage target of ≥ 85 %.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import pytest

from scoutedge_intelligence.experiments.ab_runner import (
    ABRunner,
    ABRunResult,
    GroupResult,
)
from scoutedge_intelligence.experiments.analysis import AnalysisReport, analyse

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_OUTCOMES = ("home_win", "draw", "away_win")


def _make_probs(home: float, draw: float, away: float) -> dict[str, float]:
    """Return a valid 1X2 probability dict."""
    return {"home_win": home, "draw": draw, "away_win": away}


def _make_full_prediction(
    match_id: str = "m001",
    final_probs: dict[str, float] | None = None,
    ml_probs: dict[str, float] | None = None,
    diagnosis: dict[str, Any] | None = None,
) -> MagicMock:
    """Return a MagicMock that looks like a FullPrediction."""
    pred = MagicMock()
    pred.match_id = match_id
    pred.final_probs = final_probs or _make_probs(0.5, 0.2, 0.3)
    pred.ml_probs = ml_probs or _make_probs(0.45, 0.25, 0.30)
    pred.weights = {"ml": 0.4, "sb": 0.4, "poly": 0.2}
    pred.diagnosis = diagnosis
    pred.confidence = "medium"
    pred.risk_factor = "low"
    pred.flags = []
    pred.divergence_features = {
        "three_way_agreement_score": 0.85,
        "max_pairwise_kl": 0.03,
        "max_pairwise_gap": 0.08,
        "triggered_signals": [],
    }
    return pred


def _make_inputs(match_id: str = "m001") -> MagicMock:
    """Return a MagicMock that looks like TripleLayerInputs."""
    inp = MagicMock()
    inp.match_id = match_id
    return inp


def _make_runner(
    pred_a: MagicMock | None = None,
    pred_b: MagicMock | None = None,
) -> ABRunner:
    """Build an ABRunner backed by two mock engines."""
    if pred_a is None:
        pred_a = _make_full_prediction(
            match_id="m001",
            final_probs=_make_probs(0.5, 0.2, 0.3),
            ml_probs=_make_probs(0.45, 0.25, 0.30),
        )
    if pred_b is None:
        pred_b = _make_full_prediction(
            match_id="m001",
            final_probs=_make_probs(0.4, 0.3, 0.3),
            ml_probs=_make_probs(0.45, 0.25, 0.30),
            diagnosis={"signal": "divergence"},
        )

    engine_a = MagicMock()
    engine_a.predict_match = AsyncMock(return_value=pred_a)

    engine_b = MagicMock()
    engine_b.predict_match = AsyncMock(return_value=pred_b)

    return ABRunner(engine_a, engine_b)


# ---------------------------------------------------------------------------
# Test 1: run_match returns ABRunResult with 3 distinct groups
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_run_match_returns_three_groups() -> None:
    """ABRunResult contains exactly groups A, B, and C with correct labels."""
    runner = _make_runner()
    result = await runner.run_match(_make_inputs("m001"))

    assert isinstance(result, ABRunResult)
    assert result.match_id == "m001"
    assert result.group_a.group == "A"
    assert result.group_b.group == "B"
    assert result.group_c.group == "C"


@pytest.mark.asyncio
async def test_run_match_groups_have_distinct_probs() -> None:
    """All three groups carry different probability vectors."""
    pred_a = _make_full_prediction(
        final_probs=_make_probs(0.5, 0.2, 0.3),
        ml_probs=_make_probs(0.45, 0.25, 0.30),
    )
    pred_b = _make_full_prediction(
        final_probs=_make_probs(0.35, 0.35, 0.30),
        ml_probs=_make_probs(0.45, 0.25, 0.30),
        diagnosis={"x": 1},
    )
    runner = _make_runner(pred_a=pred_a, pred_b=pred_b)
    result = await runner.run_match(_make_inputs())

    # A and B are distinct (different final_probs)
    assert result.group_a.probs != result.group_b.probs
    # C equals group A's ml_probs, which differs from A's final_probs
    assert result.group_c.probs == pred_a.ml_probs
    assert result.group_c.probs != result.group_a.probs


# ---------------------------------------------------------------------------
# Test 2: Group C probs == Group A's ml_probs (parameter sensitivity)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_group_c_equals_ml_probs() -> None:
    """Group C probability dict is identical to Group A's ml_probs."""
    ml = _make_probs(0.55, 0.15, 0.30)
    pred_a = _make_full_prediction(
        final_probs=_make_probs(0.50, 0.20, 0.30),
        ml_probs=ml,
    )
    runner = _make_runner(pred_a=pred_a)
    result = await runner.run_match(_make_inputs())

    assert result.group_c.probs == ml


@pytest.mark.asyncio
async def test_group_c_ml_probs_vary_with_engine_a_output() -> None:
    """Changing engine_a's ml_probs is reflected in Group C."""
    ml_1 = _make_probs(0.60, 0.10, 0.30)
    ml_2 = _make_probs(0.33, 0.33, 0.34)

    pred_a_1 = _make_full_prediction(ml_probs=ml_1)
    pred_a_2 = _make_full_prediction(ml_probs=ml_2)

    runner_1 = _make_runner(pred_a=pred_a_1)
    runner_2 = _make_runner(pred_a=pred_a_2)

    res1 = await runner_1.run_match(_make_inputs())
    res2 = await runner_2.run_match(_make_inputs())

    assert res1.group_c.probs == ml_1
    assert res2.group_c.probs == ml_2
    assert res1.group_c.probs != res2.group_c.probs


# ---------------------------------------------------------------------------
# Test 3: latency_ms metadata is captured and non-negative
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_latency_ms_captured_and_non_negative() -> None:
    """Group A and B metadata include latency_ms >= 0."""
    runner = _make_runner()
    result = await runner.run_match(_make_inputs())

    assert "latency_ms" in result.group_a.metadata
    assert "latency_ms" in result.group_b.metadata
    assert result.group_a.metadata["latency_ms"] >= 0.0
    assert result.group_b.metadata["latency_ms"] >= 0.0


@pytest.mark.asyncio
async def test_group_c_latency_is_zero() -> None:
    """Group C reports latency_ms == 0.0 (no engine call)."""
    runner = _make_runner()
    result = await runner.run_match(_make_inputs())
    assert result.group_c.metadata["latency_ms"] == 0.0


# ---------------------------------------------------------------------------
# Test 4: engine_a and engine_b both called (concurrency assertion)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_both_engines_called() -> None:
    """Both engine_a.predict_match and engine_b.predict_match are invoked."""
    runner = _make_runner()
    inputs = _make_inputs("match_concurrent")
    await runner.run_match(inputs)

    runner._engine_a.predict_match.assert_called_once()
    runner._engine_b.predict_match.assert_called_once()


@pytest.mark.asyncio
async def test_engines_receive_correct_inputs() -> None:
    """Each engine receives the same TripleLayerInputs object."""
    runner = _make_runner()
    inputs = _make_inputs("m_inputs_check")
    await runner.run_match(inputs)

    runner._engine_a.predict_match.assert_called_once_with(inputs)
    runner._engine_b.predict_match.assert_called_once_with(inputs)


# ---------------------------------------------------------------------------
# Test 5: analyse — empty runs → ValueError
# ---------------------------------------------------------------------------


def test_analyse_empty_runs_raises() -> None:
    """analyse() raises ValueError when runs is empty."""
    with pytest.raises(ValueError, match="non-empty"):
        analyse([], ["home_win"])


def test_analyse_empty_actuals_raises() -> None:
    """analyse() raises ValueError when actuals is empty."""
    # Build a minimal ABRunResult without running async
    fake_result = ABRunResult(
        match_id="x",
        group_a=GroupResult(group="A", probs=_make_probs(0.4, 0.3, 0.3)),
        group_b=GroupResult(group="B", probs=_make_probs(0.4, 0.3, 0.3)),
        group_c=GroupResult(group="C", probs=_make_probs(0.4, 0.3, 0.3)),
    )
    with pytest.raises(ValueError, match="non-empty"):
        analyse([fake_result], [])


# ---------------------------------------------------------------------------
# Test 6: analyse — length mismatch → ValueError
# ---------------------------------------------------------------------------


def test_analyse_length_mismatch_raises() -> None:
    """analyse() raises ValueError when runs and actuals differ in length."""
    r = ABRunResult(
        match_id="x",
        group_a=GroupResult(group="A", probs=_make_probs(0.4, 0.3, 0.3)),
        group_b=GroupResult(group="B", probs=_make_probs(0.4, 0.3, 0.3)),
        group_c=GroupResult(group="C", probs=_make_probs(0.4, 0.3, 0.3)),
    )
    with pytest.raises(ValueError, match="equal length"):
        analyse([r], ["home_win", "draw"])


# ---------------------------------------------------------------------------
# Test 7: analyse — Group A wins consistently → winner == "A"
# ---------------------------------------------------------------------------


def _build_run_result(
    match_id: str,
    probs_a: dict[str, float],
    probs_b: dict[str, float],
    probs_c: dict[str, float],
) -> ABRunResult:
    """Construct an ABRunResult directly without running async."""
    return ABRunResult(
        match_id=match_id,
        group_a=GroupResult(group="A", probs=probs_a),
        group_b=GroupResult(group="B", probs=probs_b),
        group_c=GroupResult(group="C", probs=probs_c),
    )


def test_analyse_winner_is_a_when_a_dominates() -> None:
    """When Group A has consistently lower Brier, winner == 'A'."""
    n = 40
    runs = []
    actuals = []
    for i in range(n):
        # Group A: highly confident correct prediction → low Brier
        # Group B/C: near-uniform → high Brier
        runs.append(
            _build_run_result(
                match_id=f"m{i}",
                probs_a=_make_probs(0.95, 0.03, 0.02),
                probs_b=_make_probs(0.35, 0.33, 0.32),
                probs_c=_make_probs(0.35, 0.33, 0.32),
            )
        )
        actuals.append("home_win")

    report = analyse(runs, actuals, significance_alpha=0.05)

    assert report.winner == "A"
    assert report.group_brier["A"] < report.group_brier["B"]
    assert report.group_brier["A"] < report.group_brier["C"]


# ---------------------------------------------------------------------------
# Test 8: analyse — indistinguishable groups → winner is None (no crash)
# ---------------------------------------------------------------------------


def test_analyse_indistinguishable_groups_no_crash() -> None:
    """Indistinguishable random-ish groups should not crash; winner likely None."""
    import random

    rng = random.Random(42)
    n = 20
    runs = []
    actuals_list = list(_OUTCOMES)

    for i in range(n):
        # All three groups use the same near-uniform probs → Brier difference ≈ 0
        p = _make_probs(0.34, 0.33, 0.33)
        runs.append(_build_run_result(f"m{i}", p, p, p))

    actuals = [actuals_list[rng.randrange(3)] for _ in range(n)]

    # Must not raise; winner is almost certainly None
    report = analyse(runs, actuals, significance_alpha=0.05)

    assert isinstance(report, AnalysisReport)
    # winner may be None or a group label — we only assert no exception


# ---------------------------------------------------------------------------
# Test 9: AnalysisReport structure — 3 keys in group_brier, 3 in pairwise_diff
# ---------------------------------------------------------------------------


def test_analysis_report_has_correct_keys() -> None:
    """AnalysisReport.group_brier has 3 keys; pairwise_diff has 3 keys."""
    runs = [
        _build_run_result(
            "m1",
            _make_probs(0.5, 0.25, 0.25),
            _make_probs(0.4, 0.3, 0.3),
            _make_probs(0.45, 0.25, 0.30),
        )
    ]
    actuals = ["home_win"]
    report = analyse(runs, actuals)

    assert set(report.group_brier.keys()) == {"A", "B", "C"}
    assert set(report.pairwise_diff.keys()) == {"A_vs_B", "A_vs_C", "B_vs_C"}
    assert set(report.pairwise_p_value.keys()) == {"A_vs_B", "A_vs_C", "B_vs_C"}
    assert set(report.group_accuracy.keys()) == {"A", "B", "C"}


# ---------------------------------------------------------------------------
# Test 10: user_assigned_group propagated correctly
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_assigned_group_propagated() -> None:
    """user_assigned_group in ABRunResult matches the kwarg passed to run_match."""
    runner = _make_runner()
    result_b = await runner.run_match(_make_inputs(), assigned_group="B")
    assert result_b.user_assigned_group == "B"

    result_c = await runner.run_match(_make_inputs(), assigned_group="C")
    assert result_c.user_assigned_group == "C"


# ---------------------------------------------------------------------------
# Test 11: group accuracy values are in [0, 1]
# ---------------------------------------------------------------------------


def test_group_accuracy_in_range() -> None:
    """Each group's accuracy is a float in [0.0, 1.0]."""
    runs = [
        _build_run_result(
            f"m{i}",
            _make_probs(0.5, 0.25, 0.25),
            _make_probs(0.4, 0.3, 0.3),
            _make_probs(0.45, 0.25, 0.30),
        )
        for i in range(5)
    ]
    actuals = ["home_win", "draw", "away_win", "home_win", "draw"]
    report = analyse(runs, actuals)

    for g in ("A", "B", "C"):
        assert 0.0 <= report.group_accuracy[g] <= 1.0


# ---------------------------------------------------------------------------
# Test 12: n_matches field is correct
# ---------------------------------------------------------------------------


def test_n_matches_field() -> None:
    """AnalysisReport.n_matches equals len(runs)."""
    n = 7
    runs = [
        _build_run_result(
            f"m{i}",
            _make_probs(0.4, 0.3, 0.3),
            _make_probs(0.4, 0.3, 0.3),
            _make_probs(0.4, 0.3, 0.3),
        )
        for i in range(n)
    ]
    actuals = ["home_win"] * n
    report = analyse(runs, actuals)
    assert report.n_matches == n
