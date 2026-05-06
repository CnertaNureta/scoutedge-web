"""Unit tests for scoutedge_intelligence.models.elo (FootballELO)."""

from __future__ import annotations

import pytest

from scoutedge_intelligence.models.elo import FootballELO, FootballELOConfig

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def elo() -> FootballELO:
    """Return a fresh FootballELO instance with default config."""
    return FootballELO()


# ---------------------------------------------------------------------------
# 1. Default config rating
# ---------------------------------------------------------------------------


def test_default_config_initial_rating() -> None:
    """FootballELOConfig default initial_rating must be 1500.0."""
    cfg = FootballELOConfig()
    assert cfg.initial_rating == 1500.0


def test_default_config_values() -> None:
    """Verify all default config fields match the spec."""
    cfg = FootballELOConfig()
    assert cfg.k == 30
    assert cfg.home_advantage == 65
    assert cfg.season_regression_factor == 0.85


# ---------------------------------------------------------------------------
# 2. get_rating creates entry on first lookup
# ---------------------------------------------------------------------------


def test_get_rating_creates_entry(elo: FootballELO) -> None:
    """get_rating must create a new entry at initial_rating for unknown teams."""
    assert "Andorra" not in elo._ratings
    rating = elo.get_rating("Andorra")
    assert rating == 1500.0
    assert "Andorra" in elo._ratings


def test_get_rating_stable_on_second_call(elo: FootballELO) -> None:
    """get_rating must return the same value on repeated calls without updates."""
    r1 = elo.get_rating("France")
    r2 = elo.get_rating("France")
    assert r1 == r2 == 1500.0


# ---------------------------------------------------------------------------
# 3. expected_score symmetry
# ---------------------------------------------------------------------------


def test_expected_score_symmetry(elo: FootballELO) -> None:
    """expected_score(a, b) + expected_score(b, a) must equal 1.0."""
    pairs = [
        (1500.0, 1500.0),
        (1600.0, 1400.0),
        (2000.0, 1000.0),
        (1500.0, 1750.0),
    ]
    for ra, rb in pairs:
        e_ab = elo.expected_score(ra, rb)
        e_ba = elo.expected_score(rb, ra)
        assert abs(e_ab + e_ba - 1.0) < 1e-12, (
            f"Symmetry broken for ratings ({ra}, {rb}): {e_ab} + {e_ba}"
        )


def test_expected_score_equal_ratings(elo: FootballELO) -> None:
    """Equal ratings must yield expected score of exactly 0.5."""
    assert elo.expected_score(1500.0, 1500.0) == pytest.approx(0.5)


# ---------------------------------------------------------------------------
# 4. margin_multiplier
# ---------------------------------------------------------------------------


def test_margin_multiplier_zero_goal_diff(elo: FootballELO) -> None:
    """goal_diff == 0 must return exactly 1.0 regardless of elo_diff."""
    assert elo.margin_multiplier(0, 0.0) == 1.0
    assert elo.margin_multiplier(0, 500.0) == 1.0
    assert elo.margin_multiplier(0, -300.0) == 1.0


def test_margin_multiplier_grows_with_goal_diff(elo: FootballELO) -> None:
    """Multiplier must be strictly increasing with goal difference (from gd=1 upward)."""
    prev = elo.margin_multiplier(1, 0.0)
    for gd in range(2, 6):
        curr = elo.margin_multiplier(gd, 0.0)
        assert curr > prev, f"Multiplier did not grow at gd={gd}: {curr} <= {prev}"
        prev = curr


def test_margin_multiplier_positive(elo: FootballELO) -> None:
    """Multiplier must always be positive."""
    for gd in [0, 1, 3, 7]:
        for elo_diff in [-500.0, 0.0, 500.0]:
            assert elo.margin_multiplier(gd, elo_diff) > 0


# ---------------------------------------------------------------------------
# 5. update: home win raises home rating, lowers away
# ---------------------------------------------------------------------------


def test_update_home_win_adjusts_ratings(elo: FootballELO) -> None:
    """After a home win, home rating must rise and away rating must fall."""
    home_before = elo.get_rating("Brazil")
    away_before = elo.get_rating("Argentina")

    new_home, new_away = elo.update("Brazil", "Argentina", 3, 1)

    assert new_home > home_before, "Home winner rating should increase"
    assert new_away < away_before, "Away loser rating should decrease"


def test_update_away_win_adjusts_ratings(elo: FootballELO) -> None:
    """After an away win, away rating must rise and home rating must fall."""
    home_before = elo.get_rating("Germany")
    away_before = elo.get_rating("Spain")

    new_home, new_away = elo.update("Germany", "Spain", 0, 2)

    assert new_home < home_before, "Home loser rating should decrease"
    assert new_away > away_before, "Away winner rating should increase"


def test_update_stores_new_ratings(elo: FootballELO) -> None:
    """update must persist new ratings so get_rating returns updated values."""
    new_home, new_away = elo.update("France", "Portugal", 2, 0)
    assert elo.get_rating("France") == new_home
    assert elo.get_rating("Portugal") == new_away


# ---------------------------------------------------------------------------
# 6. update: draw moves ratings toward each other
# ---------------------------------------------------------------------------


def test_update_draw_moves_ratings_toward_each_other(elo: FootballELO) -> None:
    """A draw should move weaker team up and stronger team down when unequal."""
    # Give one team a higher initial rating
    elo._ratings["Netherlands"] = 1600.0
    elo._ratings["Morocco"] = 1400.0

    stronger_before = elo.get_rating("Netherlands")
    weaker_before = elo.get_rating("Morocco")

    new_stronger, new_weaker = elo.update("Netherlands", "Morocco", 1, 1)

    # Stronger (home) team is favoured more strongly, so a draw hurts it less —
    # but it should still lose rating points since expected > 0.5.
    # Weaker away team gains rating from the draw.
    assert new_stronger < stronger_before, "Stronger team should drop after draw"
    assert new_weaker > weaker_before, "Weaker team should gain after draw"


def test_update_draw_equal_teams_minimal_change(elo: FootballELO) -> None:
    """A draw between equal teams (accounting for home adv) should yield tiny changes."""
    # Both start at 1500; home advantage gives home team an edge, so a draw
    # is worse-than-expected for home and better-than-expected for away.
    new_home, new_away = elo.update("Croatia", "Serbia", 0, 0)
    home_delta = abs(new_home - 1500.0)
    away_delta = abs(new_away - 1500.0)
    # Deltas should be small but non-zero (K=30, margin mult=1 for draw)
    assert home_delta < 30, "Home delta too large"
    assert away_delta < 30, "Away delta too large"


# ---------------------------------------------------------------------------
# 7. predict_outcomes: keys and sum
# ---------------------------------------------------------------------------


def test_predict_outcomes_keys(elo: FootballELO) -> None:
    """predict_outcomes must return dict with exactly the three required keys."""
    result = elo.predict_outcomes("England", "Italy")
    assert set(result.keys()) == {"home_win", "draw", "away_win"}


def test_predict_outcomes_sum_to_one(elo: FootballELO) -> None:
    """predict_outcomes probabilities must sum to 1.0 within 1e-9."""
    matchups = [
        ("England", "Italy"),
        ("Brazil", "Germany"),
        ("USA", "Mexico"),
    ]
    for home, away in matchups:
        result = elo.predict_outcomes(home, away)
        total = result["home_win"] + result["draw"] + result["away_win"]
        assert abs(total - 1.0) < 1e-9, (
            f"Probabilities don't sum to 1: {total} for {home} vs {away}"
        )


def test_predict_outcomes_all_positive(elo: FootballELO) -> None:
    """All three outcome probabilities must be strictly positive."""
    result = elo.predict_outcomes("Japan", "Iran")
    for key, val in result.items():
        assert val > 0, f"{key} probability must be positive, got {val}"


def test_predict_outcomes_home_favoured_with_advantage(elo: FootballELO) -> None:
    """Home win probability should exceed away win probability for equal teams."""
    result = elo.predict_outcomes("France", "Belgium")
    assert result["home_win"] > result["away_win"], (
        "Equal teams: home advantage should make home_win > away_win"
    )


def test_predict_outcomes_strongly_favoured_team_wins_most(elo: FootballELO) -> None:
    """A team rated 400 pts higher should have win probability > 0.6."""
    elo._ratings["Elite"] = 1900.0
    elo._ratings["Weak"] = 1500.0
    result = elo.predict_outcomes("Elite", "Weak")
    assert result["home_win"] > 0.6, (
        f"Expected home_win > 0.6 for +400 rating gap, got {result['home_win']}"
    )


# ---------------------------------------------------------------------------
# Custom config
# ---------------------------------------------------------------------------


def test_custom_config_applied() -> None:
    """FootballELO must use the supplied config's initial_rating."""
    cfg = FootballELOConfig(initial_rating=1000.0)
    elo = FootballELO(config=cfg)
    assert elo.get_rating("NewTeam") == 1000.0


def test_custom_k_affects_update_magnitude() -> None:
    """A larger K-factor should produce larger rating swings."""
    elo_small_k = FootballELO(FootballELOConfig(k=10))
    elo_large_k = FootballELO(FootballELOConfig(k=60))

    h1, _ = elo_small_k.update("A", "B", 2, 0)
    h2, _ = elo_large_k.update("A", "B", 2, 0)

    delta_small = abs(h1 - 1500.0)
    delta_large = abs(h2 - 1500.0)
    assert delta_large > delta_small, "Larger K should produce larger rating change"
