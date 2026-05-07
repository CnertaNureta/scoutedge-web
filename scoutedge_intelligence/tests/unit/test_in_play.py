"""Unit tests for scoutedge_intelligence.models.in_play.

Acceptance criteria (≥ 9 tests):
  1. reset() restores to identical pre-match probs (within 1e-9)
  2. goal_home at minute 30 increases home_win, decreases away_win
  3. Two goal_home events → state.home_score == 2
  4. red_home reduces home win prob (parameter sensitivity)
  5. tick at minute 89 with score 1-0 → home_win approaches ~1.0
  6. apply_event with minute < last_event_minute raises ValueError (except tick)
  7. current_matrix sums to 1.0 (parametrized after several events)
  8. derive_probabilities keys == {home_win, draw, away_win} and sum to 1.0
  9. 90-minute walk-through with mixed events ends in valid distribution
"""

from __future__ import annotations

import numpy as np
import pytest
from scipy.stats import poisson

from scoutedge_intelligence.models.in_play import (
    InPlayBayesianUpdater,
    InPlayEvent,
    InPlayState,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_matrix(lambda_h: float = 1.4, lambda_a: float = 1.1) -> np.ndarray:
    """Build a simple 9x9 score probability matrix (no Dixon-Coles correction)."""
    g = 9
    matrix = np.zeros((g, g), dtype=np.float64)
    for i in range(g):
        for j in range(g):
            matrix[i, j] = poisson.pmf(i, lambda_h) * poisson.pmf(j, lambda_a)
    total = matrix.sum()
    return matrix / total


def _make_updater(
    lambda_h: float = 1.4,
    lambda_a: float = 1.1,
    red_card_penalty: float = 0.85,
) -> InPlayBayesianUpdater:
    """Return a fresh InPlayBayesianUpdater with a Poisson prior."""
    matrix = _build_matrix(lambda_h, lambda_a)
    return InPlayBayesianUpdater(
        pre_match_matrix=matrix,
        pre_match_lambda_home=lambda_h,
        pre_match_lambda_away=lambda_a,
        red_card_penalty=red_card_penalty,
    )


# ---------------------------------------------------------------------------
# Test 1: reset() restores identical pre-match probabilities
# ---------------------------------------------------------------------------


def test_reset_restores_prematch_probs() -> None:
    """After any sequence of events, reset() must recover the original probs."""
    updater = _make_updater()
    original_probs = updater.derive_probabilities()

    updater.apply_event(InPlayEvent(minute=20, type="goal_home"))
    updater.apply_event(InPlayEvent(minute=45, type="red_away"))
    updater.apply_event(InPlayEvent(minute=60, type="goal_away"))

    # Probs are now different
    mid_probs = updater.derive_probabilities()
    assert mid_probs != original_probs

    updater.reset()
    restored_probs = updater.derive_probabilities()

    assert abs(restored_probs["home_win"] - original_probs["home_win"]) < 1e-9
    assert abs(restored_probs["draw"] - original_probs["draw"]) < 1e-9
    assert abs(restored_probs["away_win"] - original_probs["away_win"]) < 1e-9


def test_reset_restores_matrix() -> None:
    """reset() must also restore the underlying matrix to the pre-match matrix."""
    updater = _make_updater()
    original_matrix = updater.current_matrix.copy()

    updater.apply_event(InPlayEvent(minute=10, type="goal_home"))
    updater.reset()

    np.testing.assert_allclose(updater.current_matrix, original_matrix, atol=1e-12)


def test_reset_restores_state() -> None:
    """reset() resets InPlayState fields (score, red cards, minute) to zero."""
    updater = _make_updater()
    updater.apply_event(InPlayEvent(minute=5, type="red_home"))
    updater.apply_event(InPlayEvent(minute=10, type="goal_away"))

    updater.reset()
    state = updater.current_state

    assert state.home_score == 0
    assert state.away_score == 0
    assert state.home_red_cards == 0
    assert state.away_red_cards == 0
    assert state.last_event_minute is None


# ---------------------------------------------------------------------------
# Test 2: goal_home at minute 30 increases home_win, decreases away_win
# ---------------------------------------------------------------------------


def test_goal_home_shifts_probabilities() -> None:
    """A home goal should increase P(home_win) and decrease P(away_win)."""
    updater = _make_updater()
    before = updater.derive_probabilities()

    after = updater.apply_event(InPlayEvent(minute=30, type="goal_home"))

    assert after["home_win"] > before["home_win"], "home goal must raise P(home_win)"
    assert after["away_win"] < before["away_win"], "home goal must lower P(away_win)"


def test_goal_away_shifts_probabilities() -> None:
    """An away goal should increase P(away_win) and decrease P(home_win)."""
    updater = _make_updater()
    before = updater.derive_probabilities()

    after = updater.apply_event(InPlayEvent(minute=30, type="goal_away"))

    assert after["away_win"] > before["away_win"], "away goal must raise P(away_win)"
    assert after["home_win"] < before["home_win"], "away goal must lower P(home_win)"


# ---------------------------------------------------------------------------
# Test 3: two goal_home events → state.home_score == 2
# ---------------------------------------------------------------------------


def test_two_goals_home_state() -> None:
    """Two goal_home events must accumulate home_score to 2."""
    updater = _make_updater()
    updater.apply_event(InPlayEvent(minute=20, type="goal_home"))
    updater.apply_event(InPlayEvent(minute=55, type="goal_home"))

    assert updater.current_state.home_score == 2


def test_mixed_goals_state() -> None:
    """Score tracking must independently track home and away goals."""
    updater = _make_updater()
    updater.apply_event(InPlayEvent(minute=10, type="goal_home"))
    updater.apply_event(InPlayEvent(minute=25, type="goal_away"))
    updater.apply_event(InPlayEvent(minute=40, type="goal_home"))

    state = updater.current_state
    assert state.home_score == 2
    assert state.away_score == 1


# ---------------------------------------------------------------------------
# Test 4: red_home reduces home win probability
# ---------------------------------------------------------------------------


def test_red_card_home_reduces_home_win() -> None:
    """A home red card must reduce P(home_win)."""
    updater = _make_updater()
    before = updater.derive_probabilities()

    after = updater.apply_event(InPlayEvent(minute=40, type="red_home"))

    assert after["home_win"] < before["home_win"], "red card for home side must reduce P(home_win)"


def test_red_card_penalty_sensitivity() -> None:
    """A harsher penalty (0.5 vs 0.85) should reduce home_win more."""
    updater_mild = _make_updater(red_card_penalty=0.85)
    updater_harsh = _make_updater(red_card_penalty=0.50)

    probs_mild = updater_mild.apply_event(InPlayEvent(minute=30, type="red_home"))
    probs_harsh = updater_harsh.apply_event(InPlayEvent(minute=30, type="red_home"))

    assert probs_harsh["home_win"] < probs_mild["home_win"], (
        "Harsher red-card penalty must reduce P(home_win) more"
    )


# ---------------------------------------------------------------------------
# Test 5: tick at minute 89 with 1-0 scoreline → home_win approaches ~1.0
# ---------------------------------------------------------------------------


def test_tick_late_game_strong_home_win() -> None:
    """Tick at minute 89 with home leading 1-0 must yield very high P(home_win)."""
    updater = _make_updater()
    updater.apply_event(InPlayEvent(minute=10, type="goal_home"))
    probs = updater.apply_event(InPlayEvent(minute=89, type="tick"))

    assert probs["home_win"] > 0.90, (
        f"Expected home_win > 0.90 at 89' with 1-0, got {probs['home_win']:.4f}"
    )


def test_tick_updates_minute() -> None:
    """After a tick, current_state.minute should reflect the tick minute."""
    updater = _make_updater()
    updater.apply_event(InPlayEvent(minute=45, type="tick"))

    assert updater.current_state.minute == 45


# ---------------------------------------------------------------------------
# Test 6: apply_event with minute < last_event_minute raises ValueError
# ---------------------------------------------------------------------------


def test_chronological_order_violation_raises() -> None:
    """Non-tick event with minute < last_event_minute must raise ValueError."""
    updater = _make_updater()
    updater.apply_event(InPlayEvent(minute=50, type="goal_home"))

    with pytest.raises(ValueError, match="before the last event minute"):
        updater.apply_event(InPlayEvent(minute=30, type="goal_away"))


def test_tick_same_minute_allowed() -> None:
    """Tick events may occur at the same minute as the previous event."""
    updater = _make_updater()
    updater.apply_event(InPlayEvent(minute=45, type="goal_home"))
    # Should NOT raise
    updater.apply_event(InPlayEvent(minute=45, type="tick"))


def test_tick_earlier_minute_raises() -> None:
    """Tick events earlier than the last event minute must raise ValueError."""
    updater = _make_updater()
    updater.apply_event(InPlayEvent(minute=50, type="goal_home"))

    with pytest.raises(ValueError, match="before the last event minute"):
        updater.apply_event(InPlayEvent(minute=40, type="tick"))


# ---------------------------------------------------------------------------
# Test 7: current_matrix sums to 1.0 (parametrized after several events)
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "events",
    [
        [],
        [InPlayEvent(minute=10, type="goal_home")],
        [
            InPlayEvent(minute=5, type="goal_home"),
            InPlayEvent(minute=20, type="goal_away"),
        ],
        [
            InPlayEvent(minute=15, type="red_away"),
            InPlayEvent(minute=30, type="goal_home"),
            InPlayEvent(minute=45, type="tick"),
        ],
        [
            InPlayEvent(minute=10, type="goal_home"),
            InPlayEvent(minute=20, type="goal_home"),
            InPlayEvent(minute=30, type="goal_home"),
            InPlayEvent(minute=40, type="goal_away"),
            InPlayEvent(minute=50, type="tick"),
            InPlayEvent(minute=60, type="red_home"),
        ],
    ],
    ids=["no_events", "one_goal", "two_goals", "red_goal_tick", "complex"],
)
def test_matrix_sums_to_one(events: list[InPlayEvent]) -> None:
    """current_matrix must sum to 1.0 (±1e-9) after any sequence of events."""
    updater = _make_updater()
    for event in events:
        updater.apply_event(event)

    total = float(updater.current_matrix.sum())
    assert abs(total - 1.0) < 1e-9, f"Matrix sum {total} deviates from 1.0"


# ---------------------------------------------------------------------------
# Test 8: derive_probabilities keys and sum to 1.0
# ---------------------------------------------------------------------------


def test_derive_probabilities_keys() -> None:
    """derive_probabilities must return exactly the three expected keys."""
    updater = _make_updater()
    probs = updater.derive_probabilities()

    assert set(probs.keys()) == {"home_win", "draw", "away_win"}


def test_derive_probabilities_sum_to_one() -> None:
    """All three outcome probabilities must sum to 1.0."""
    updater = _make_updater()
    updater.apply_event(InPlayEvent(minute=25, type="goal_home"))
    probs = updater.derive_probabilities()

    total = probs["home_win"] + probs["draw"] + probs["away_win"]
    assert abs(total - 1.0) < 1e-9, f"Probs sum to {total}, expected 1.0"


def test_derive_probabilities_all_non_negative() -> None:
    """All three outcome probabilities must be non-negative."""
    updater = _make_updater()
    updater.apply_event(InPlayEvent(minute=30, type="goal_away"))
    updater.apply_event(InPlayEvent(minute=60, type="red_home"))
    probs = updater.derive_probabilities()

    assert probs["home_win"] >= 0.0
    assert probs["draw"] >= 0.0
    assert probs["away_win"] >= 0.0


# ---------------------------------------------------------------------------
# Test 9: 90-minute walk-through with mixed events ends in valid distribution
# ---------------------------------------------------------------------------


def test_full_match_walk_through() -> None:
    """A 90-minute walk-through with mixed events must produce a valid distribution."""
    updater = _make_updater()

    events: list[InPlayEvent] = [
        InPlayEvent(minute=5, type="tick"),
        InPlayEvent(minute=12, type="goal_home"),
        InPlayEvent(minute=20, type="tick"),
        InPlayEvent(minute=33, type="red_away"),
        InPlayEvent(minute=40, type="tick"),
        InPlayEvent(minute=47, type="goal_away"),
        InPlayEvent(minute=55, type="tick"),
        InPlayEvent(minute=67, type="goal_home"),
        InPlayEvent(minute=75, type="tick"),
        InPlayEvent(minute=80, type="red_home"),
        InPlayEvent(minute=85, type="tick"),
        InPlayEvent(minute=88, type="goal_away"),
        InPlayEvent(minute=90, type="tick"),
    ]

    for event in events:
        probs = updater.apply_event(event)
        # After every event the distribution must be valid
        total = probs["home_win"] + probs["draw"] + probs["away_win"]
        assert abs(total - 1.0) < 1e-9
        assert all(v >= 0.0 for v in probs.values())

    # Final state: home 2 - away 2, both sides with 1 red card
    state = updater.current_state
    assert state.home_score == 2
    assert state.away_score == 2
    assert state.home_red_cards == 1
    assert state.away_red_cards == 1
    assert state.minute == 90

    # Matrix must still sum to 1.0
    total_matrix = float(updater.current_matrix.sum())
    assert abs(total_matrix - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# Additional edge-case tests
# ---------------------------------------------------------------------------


def test_goal_cap_raises_value_error() -> None:
    """Scoring more goals than MAX_GOALS must raise ValueError."""
    updater = _make_updater()
    # Score 8 home goals (MAX_GOALS)
    for minute in range(1, 9):
        updater.apply_event(InPlayEvent(minute=minute * 10, type="goal_home"))

    with pytest.raises(ValueError, match="past goal cap"):
        updater.apply_event(InPlayEvent(minute=90, type="goal_home"))


def test_invalid_event_type_raises() -> None:
    """Unknown event type strings must raise ValueError."""
    updater = _make_updater()
    with pytest.raises(ValueError, match="Unknown event type"):
        updater.apply_event(InPlayEvent(minute=10, type="penalty"))


def test_initial_probabilities_sum_to_one() -> None:
    """The initial (pre-match) derive_probabilities must sum to 1.0."""
    updater = _make_updater()
    probs = updater.derive_probabilities()
    total = probs["home_win"] + probs["draw"] + probs["away_win"]
    assert abs(total - 1.0) < 1e-9


def test_pre_match_matrix_shape_validation() -> None:
    """Passing a matrix with wrong shape must raise ValueError."""
    bad_matrix = np.ones((5, 5), dtype=np.float64) / 25.0
    with pytest.raises(ValueError, match="must have shape"):
        InPlayBayesianUpdater(
            pre_match_matrix=bad_matrix,
            pre_match_lambda_home=1.4,
            pre_match_lambda_away=1.1,
        )


def test_inplaystate_dataclass_fields() -> None:
    """InPlayState fields must default correctly."""
    state = InPlayState(minute=0, home_score=0, away_score=0)
    assert state.home_red_cards == 0
    assert state.away_red_cards == 0
    assert state.last_event_minute is None


def test_inplayevent_default_payload() -> None:
    """InPlayEvent payload must default to an empty dict."""
    event = InPlayEvent(minute=10, type="goal_home")
    assert event.payload == {}


def test_current_matrix_is_copy() -> None:
    """current_matrix must return a copy, not a reference to internal state."""
    updater = _make_updater()
    m1 = updater.current_matrix
    m1[0, 0] = 9999.0  # mutate the returned copy

    m2 = updater.current_matrix
    assert m2[0, 0] != 9999.0, "current_matrix must return an independent copy"
