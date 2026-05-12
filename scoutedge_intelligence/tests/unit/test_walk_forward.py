"""Unit tests for scoutedge_intelligence.audit.walk_forward.

All tests use a tiny FakePredictor that returns deterministic probabilities
so the suite runs in milliseconds without touching DixonColesModel.
"""

from __future__ import annotations

import math

import pandas as pd
import pytest

from scoutedge_intelligence.audit.walk_forward import (
    WalkForwardBacktester,
    _derive_outcome,
)

# ---------------------------------------------------------------------------
# Helpers & fake predictor
# ---------------------------------------------------------------------------

UNIFORM: dict[str, float] = {"home_win": 1 / 3, "draw": 1 / 3, "away_win": 1 / 3}


def _perfect_pred(outcome: str) -> dict[str, float]:
    """Return 1.0 on *outcome*, 0.0 on the others."""
    return {k: (1.0 if k == outcome else 0.0) for k in ("home_win", "draw", "away_win")}


class FakePredictor:
    """Always returns a pre-configured probability dict regardless of teams."""

    def __init__(self, probs: dict[str, float]) -> None:
        self._probs = probs

    def fit(self, matches_df: pd.DataFrame) -> None:
        """No-op: fake predictor ignores training data."""

    def predict_1x2(self, home_team: str, away_team: str) -> dict[str, float]:
        """Return the pre-configured probability dict."""
        return dict(self._probs)


class RaisingPredictor:
    """Raises for a specific pair of teams; otherwise returns UNIFORM."""

    def __init__(self, unknown_pair: tuple[str, str]) -> None:
        self._unknown = unknown_pair

    def fit(self, matches_df: pd.DataFrame) -> None:
        pass

    def predict_1x2(self, home_team: str, away_team: str) -> dict[str, float]:
        if (home_team, away_team) == self._unknown:
            raise KeyError(f"Unknown team: {home_team} or {away_team}")
        return dict(UNIFORM)


def _make_df(n: int, *, home_goals: int = 1, away_goals: int = 0) -> pd.DataFrame:
    """Construct a minimal matches DataFrame of length *n*.

    All matches default to 1-0 (home win).
    """
    return pd.DataFrame(
        {
            "home_team": [f"Home{i}" for i in range(n)],
            "away_team": [f"Away{i}" for i in range(n)],
            "date": pd.date_range("2024-01-01", periods=n, freq="D"),
            "home_goals": [home_goals] * n,
            "away_goals": [away_goals] * n,
        }
    )


# ---------------------------------------------------------------------------
# Test: DataFrame too small raises ValueError
# ---------------------------------------------------------------------------


def test_too_small_raises_value_error() -> None:
    """DataFrame with fewer than initial_train_size + step_size rows raises."""
    backtester = WalkForwardBacktester(
        lambda: FakePredictor(UNIFORM),
        initial_train_size=50,
        step_size=10,
    )
    df = _make_df(55)  # 55 < 60
    with pytest.raises(ValueError, match="at least"):
        backtester.run(df)


def test_exactly_min_size_does_not_raise() -> None:
    """DataFrame with exactly initial_train_size + step_size rows is accepted."""
    backtester = WalkForwardBacktester(
        lambda: FakePredictor(UNIFORM),
        initial_train_size=50,
        step_size=10,
    )
    df = _make_df(60)
    result = backtester.run(df)
    assert result["n_predictions"] == 10


# ---------------------------------------------------------------------------
# Test: Single-window produces n_predictions == step_size
# ---------------------------------------------------------------------------


def test_single_window_n_predictions_equals_step_size() -> None:
    """With exactly one full window the prediction count equals step_size."""
    step = 16
    initial = 100
    backtester = WalkForwardBacktester(
        lambda: FakePredictor(UNIFORM),
        initial_train_size=initial,
        step_size=step,
    )
    df = _make_df(initial + step)
    result = backtester.run(df)
    assert result["n_predictions"] == step
    assert len(result["windows"]) == 1


# ---------------------------------------------------------------------------
# Test: Multi-window aggregation
# ---------------------------------------------------------------------------


def test_multi_window_aggregates_results() -> None:
    """Multiple windows accumulate all match predictions correctly."""
    step = 10
    initial = 50
    extra_windows = 3
    total = initial + step * extra_windows
    backtester = WalkForwardBacktester(
        lambda: FakePredictor(UNIFORM),
        initial_train_size=initial,
        step_size=step,
    )
    df = _make_df(total)
    result = backtester.run(df)

    assert result["n_predictions"] == step * extra_windows
    assert len(result["results"]) == step * extra_windows
    assert len(result["windows"]) == extra_windows


# ---------------------------------------------------------------------------
# Test: Perfect predictor → mean_brier == 0
# ---------------------------------------------------------------------------


def test_perfect_predictor_zero_brier() -> None:
    """A predictor that always assigns 1.0 to the correct outcome scores 0 Brier."""
    # All matches are 1-0 → actual = "home_win"
    df = _make_df(30, home_goals=1, away_goals=0)
    backtester = WalkForwardBacktester(
        lambda: FakePredictor(_perfect_pred("home_win")),
        initial_train_size=20,
        step_size=5,
    )
    result = backtester.run(df)
    assert result["mean_brier"] == pytest.approx(0.0, abs=1e-9)


# ---------------------------------------------------------------------------
# Test: Uniform predictor → mean_brier == 2/3
# ---------------------------------------------------------------------------


def test_uniform_predictor_brier_equals_two_thirds() -> None:
    """Uniform 1/3-1/3-1/3 predictor yields Brier score = 2/3 per match.

    Brier multiclass = sum_k (p_k - o_k)^2.
    For a home win: (1/3-1)^2 + (1/3-0)^2 + (1/3-0)^2 = 4/9 + 1/9 + 1/9 = 6/9 = 2/3.
    """
    df = _make_df(30, home_goals=1, away_goals=0)
    backtester = WalkForwardBacktester(
        lambda: FakePredictor(UNIFORM),
        initial_train_size=20,
        step_size=5,
    )
    result = backtester.run(df)
    assert result["mean_brier"] == pytest.approx(2 / 3, rel=1e-6)


# ---------------------------------------------------------------------------
# Test: Unknown-team skip behaviour
# ---------------------------------------------------------------------------


def test_unknown_team_match_is_skipped() -> None:
    """When predict_1x2 raises for a match, that match is skipped gracefully."""
    step = 5
    initial = 20
    df = _make_df(initial + step)
    # Match at index `initial` will have home_team="Home{initial}"
    unknown_pair = (f"Home{initial}", f"Away{initial}")

    backtester = WalkForwardBacktester(
        lambda: RaisingPredictor(unknown_pair),
        initial_train_size=initial,
        step_size=step,
    )
    result = backtester.run(df)
    # One match skipped → step - 1 predictions
    assert result["n_predictions"] == step - 1
    # Ensure none of the result dicts correspond to the skipped match
    skipped_indices = {r["match_idx"] for r in result["results"]}
    assert initial not in skipped_indices


def test_unknown_team_others_continue() -> None:
    """Non-raising matches within the same window are still scored."""
    step = 5
    initial = 20
    df = _make_df(initial + step)
    unknown_pair = (f"Home{initial}", f"Away{initial}")

    backtester = WalkForwardBacktester(
        lambda: RaisingPredictor(unknown_pair),
        initial_train_size=initial,
        step_size=step,
    )
    result = backtester.run(df)
    # step - 1 results should all have valid brier scores
    assert all(math.isfinite(r["brier"]) for r in result["results"])


# ---------------------------------------------------------------------------
# Test: results entries have all required keys
# ---------------------------------------------------------------------------


def test_results_entries_have_required_keys() -> None:
    """Every entry in 'results' must contain the five mandated keys."""
    required_keys = {"match_idx", "predicted", "actual", "brier", "correct"}
    df = _make_df(30)
    backtester = WalkForwardBacktester(
        lambda: FakePredictor(UNIFORM),
        initial_train_size=20,
        step_size=5,
    )
    result = backtester.run(df)
    for entry in result["results"]:
        assert required_keys.issubset(entry.keys()), f"Missing keys: {required_keys - entry.keys()}"


# ---------------------------------------------------------------------------
# Test: windows entries reflect boundaries
# ---------------------------------------------------------------------------


def test_windows_entries_reflect_boundaries() -> None:
    """Window dicts must contain 'start', 'end', 'n', 'mean_brier'."""
    step = 10
    initial = 50
    df = _make_df(initial + step * 2)
    backtester = WalkForwardBacktester(
        lambda: FakePredictor(UNIFORM),
        initial_train_size=initial,
        step_size=step,
    )
    result = backtester.run(df)
    windows = result["windows"]
    assert len(windows) == 2

    expected_starts = [initial, initial + step]
    for win, exp_start in zip(windows, expected_starts, strict=True):
        assert set(win.keys()) >= {"start", "end", "n", "mean_brier"}
        assert win["start"] == exp_start
        assert win["end"] == exp_start + step
        assert win["n"] == step
        assert math.isfinite(win["mean_brier"])


# ---------------------------------------------------------------------------
# Test: accuracy is computed correctly
# ---------------------------------------------------------------------------


def test_accuracy_all_correct() -> None:
    """Perfect predictor should yield accuracy == 1.0."""
    df = _make_df(30, home_goals=2, away_goals=0)
    backtester = WalkForwardBacktester(
        lambda: FakePredictor(_perfect_pred("home_win")),
        initial_train_size=20,
        step_size=5,
    )
    result = backtester.run(df)
    assert result["accuracy"] == pytest.approx(1.0)


def test_accuracy_all_wrong() -> None:
    """Predicting the wrong outcome with certainty yields accuracy == 0.0."""
    # All matches are draws
    df = _make_df(30, home_goals=1, away_goals=1)
    # Predictor always says away_win (wrong)
    backtester = WalkForwardBacktester(
        lambda: FakePredictor(_perfect_pred("away_win")),
        initial_train_size=20,
        step_size=5,
    )
    result = backtester.run(df)
    assert result["accuracy"] == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# Test: _derive_outcome helper
# ---------------------------------------------------------------------------


def test_derive_outcome_home_win() -> None:
    assert _derive_outcome(2, 1) == "home_win"


def test_derive_outcome_away_win() -> None:
    assert _derive_outcome(0, 1) == "away_win"


def test_derive_outcome_draw() -> None:
    assert _derive_outcome(1, 1) == "draw"


# ---------------------------------------------------------------------------
# Test: missing columns raises ValueError
# ---------------------------------------------------------------------------


def test_missing_columns_raise_value_error() -> None:
    """DataFrames missing required columns raise ValueError."""
    df = pd.DataFrame({"home_team": ["A"], "away_team": ["B"]})
    backtester = WalkForwardBacktester(lambda: FakePredictor(UNIFORM))
    with pytest.raises(ValueError, match="missing required columns"):
        backtester.run(df)
