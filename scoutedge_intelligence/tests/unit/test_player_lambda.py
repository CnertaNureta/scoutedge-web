"""Unit tests for PlayerLambdaModel (task P1.3)."""

from __future__ import annotations

import math

import pandas as pd
import pytest
from scipy.stats import poisson

from scoutedge_intelligence.models.player_lambda import PlayerLambdaModel

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def stats_df() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "player_id": "player_a",
                "team": "France",
                "goals_per_90": 0.60,
                "xg_per_90": 0.55,
                "assists_per_90": 0.20,
                "xa_per_90": 0.18,
            },
            {
                "player_id": "player_b",
                "team": "Brazil",
                "goals_per_90": 0.30,
                "xg_per_90": 0.28,
                "assists_per_90": 0.10,
                "xa_per_90": 0.09,
            },
        ]
    )


@pytest.fixture()
def strength_lookup() -> dict[str, dict[str, float]]:
    return {
        "Germany": {"attack_strength": 1.3, "defense_strength": 1.2},
        "Morocco": {"attack_strength": 0.9, "defense_strength": 0.7},
        "Spain": {"attack_strength": 1.2, "defense_strength": 1.5},
    }


@pytest.fixture()
def model(
    stats_df: pd.DataFrame,
    strength_lookup: dict[str, dict[str, float]],
) -> PlayerLambdaModel:
    return PlayerLambdaModel(stats_df, strength_lookup)


# ---------------------------------------------------------------------------
# 1. Unknown player → expected_goals returns 0.0
# ---------------------------------------------------------------------------


def test_unknown_player_returns_zero(model: PlayerLambdaModel) -> None:
    result = model.expected_goals("no_such_player", "Germany")
    assert result == 0.0


# ---------------------------------------------------------------------------
# 2. Stronger defense reduces expected_goals (monotone)
# ---------------------------------------------------------------------------


def test_stronger_defense_reduces_lambda(
    stats_df: pd.DataFrame,
) -> None:
    weak_defense_lookup = {
        "WeakTeam": {"attack_strength": 1.0, "defense_strength": 0.5},
        "StrongTeam": {"attack_strength": 1.0, "defense_strength": 2.0},
    }
    m = PlayerLambdaModel(stats_df, weak_defense_lookup)
    lam_weak = m.expected_goals("player_a", "WeakTeam")
    lam_strong = m.expected_goals("player_a", "StrongTeam")
    assert lam_strong < lam_weak, (
        f"Expected stronger defense to reduce lambda: {lam_strong} >= {lam_weak}"
    )


# ---------------------------------------------------------------------------
# 3. Reduced minutes scale linearly
# ---------------------------------------------------------------------------


def test_minutes_scale_linearly(model: PlayerLambdaModel) -> None:
    lam_90 = model.expected_goals("player_a", "Morocco", expected_minutes=90.0)
    lam_45 = model.expected_goals("player_a", "Morocco", expected_minutes=45.0)
    assert math.isclose(lam_45, lam_90 * 0.5, rel_tol=1e-9), (
        f"Half the minutes should halve lambda: {lam_45} vs {lam_90 * 0.5}"
    )


# ---------------------------------------------------------------------------
# 4. venue_modifier=1.15 increases lambda vs 1.0
# ---------------------------------------------------------------------------


def test_venue_modifier_increases_lambda(model: PlayerLambdaModel) -> None:
    lam_neutral = model.expected_goals("player_a", "Germany", venue_modifier=1.0)
    lam_home = model.expected_goals("player_a", "Germany", venue_modifier=1.15)
    assert lam_home > lam_neutral, (
        f"venue_modifier=1.15 should increase lambda: {lam_home} <= {lam_neutral}"
    )


# ---------------------------------------------------------------------------
# 5. goal_distribution returns 4 keys in [0,1] with meaningful total mass
# ---------------------------------------------------------------------------


def test_goal_distribution_structure(model: PlayerLambdaModel) -> None:
    dist = model.goal_distribution("player_a", "Morocco")
    assert set(dist.keys()) == {0, 1, 2, 3}, f"Expected keys 0-3, got {set(dist.keys())}"
    for k, prob in dist.items():
        assert 0.0 <= prob <= 1.0, f"P({k} goals) = {prob} outside [0,1]"
    # The four keys cover a large fraction of the Poisson mass for typical lambda
    lam = model.expected_goals("player_a", "Morocco")
    total_from_scipy = sum(float(poisson.pmf(k, lam)) for k in range(4))
    total_from_model = sum(dist.values())
    assert math.isclose(total_from_model, total_from_scipy, rel_tol=1e-9)


# ---------------------------------------------------------------------------
# 6. p_anytime_scorer == 1 - P(0 goals)
# ---------------------------------------------------------------------------


def test_p_anytime_scorer_equals_one_minus_p0(model: PlayerLambdaModel) -> None:
    p_anytime = model.p_anytime_scorer("player_a", "Germany")
    p0 = model.goal_distribution("player_a", "Germany")[0]
    assert math.isclose(p_anytime, 1.0 - p0, rel_tol=1e-9), (
        f"p_anytime={p_anytime} does not equal 1 - P0={1.0 - p0}"
    )


def test_p_anytime_scorer_zero_lambda_is_zero(model: PlayerLambdaModel) -> None:
    """Unknown player has lambda=0, so P(score) should be 0."""
    p = model.p_anytime_scorer("ghost_player", "Germany")
    assert p == 0.0


# ---------------------------------------------------------------------------
# 7. motm_probability higher when team_win_prob is higher
# ---------------------------------------------------------------------------


def test_motm_probability_increases_with_team_win_prob(model: PlayerLambdaModel) -> None:
    ctx_low = {"opponent": "Germany", "expected_minutes": 90.0, "team_win_prob": 0.2}
    ctx_high = {"opponent": "Germany", "expected_minutes": 90.0, "team_win_prob": 0.8}
    motm_low = model.motm_probability("player_a", ctx_low)
    motm_high = model.motm_probability("player_a", ctx_high)
    assert motm_high > motm_low, (
        f"Higher win prob should raise MoTM: motm_high={motm_high} <= motm_low={motm_low}"
    )


def test_motm_probability_bounded(model: PlayerLambdaModel) -> None:
    ctx = {"opponent": "Morocco", "expected_minutes": 90.0, "team_win_prob": 1.0}
    p = model.motm_probability("player_a", ctx)
    assert 0.0 <= p <= 1.0, f"MoTM probability {p} out of [0, 1]"


def test_motm_uses_default_minutes(model: PlayerLambdaModel) -> None:
    """expected_minutes key is optional; omitting it should not raise."""
    ctx_with = {"opponent": "Morocco", "expected_minutes": 90.0, "team_win_prob": 0.5}
    ctx_without = {"opponent": "Morocco", "team_win_prob": 0.5}
    assert model.motm_probability("player_a", ctx_with) == pytest.approx(
        model.motm_probability("player_a", ctx_without)
    )
