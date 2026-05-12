"""Unit tests for WCAdjustmentLayer (task P1.4).

Coverage targets per acceptance criteria:
    1. Identity case: no adjustment when all factors are neutral.
    2. Altitude > 1500m delta on home team only → home prob decreases.
    3. High temperature + high pressing penalises more than low pressing.
    4. Travel > 2000km penalty applies once (boundary at exactly 2001 km).
    5. Rest disadvantage of -2 days reduces home prob; +2 reduces away prob.
    6. Output always sums to 1.0 within 1e-9 (parametrised random contexts).
    7. get_adjustment_features returns exactly 7 keys, all numeric.
    8. Knockout stage reduces draw probability relative to group stage.
    9. Invalid base_probs raises ValueError.
"""

from __future__ import annotations

import math
import random

import pytest

from scoutedge_intelligence.models.wc_adjustments import WCAdjustmentLayer, WCMatchContext

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def layer() -> WCAdjustmentLayer:
    """Return a fresh WCAdjustmentLayer instance."""
    return WCAdjustmentLayer()


def _neutral_ctx(**overrides: object) -> WCMatchContext:
    """Build a WCMatchContext with neutral (zero-effect) values, allowing field overrides."""
    defaults: dict[str, object] = {
        "venue_city": "TestCity",
        "altitude_m": 0,
        "temperature_c": 20.0,
        "humidity_pct": 50.0,
        "home_team_base_altitude": 0,
        "away_team_base_altitude": 0,
        "home_team_pressing_intensity": 0.5,
        "away_team_pressing_intensity": 0.5,
        "home_team_travel_km": 0.0,
        "away_team_travel_km": 0.0,
        "home_team_rest_days": 4,
        "away_team_rest_days": 4,
        "stage": "group",
    }
    defaults.update(overrides)
    return WCMatchContext(**defaults)  # type: ignore[arg-type]


BASE_PROBS: dict[str, float] = {"home_win": 0.45, "draw": 0.25, "away_win": 0.30}


# ---------------------------------------------------------------------------
# Test 1: Identity case
# ---------------------------------------------------------------------------


def test_identity_case_neutral_context(layer: WCAdjustmentLayer) -> None:
    """No contextual penalty → output probabilities match input within 1e-9."""
    ctx = _neutral_ctx()
    result = layer.adjust_probabilities(BASE_PROBS, ctx)

    for key in ("home_win", "draw", "away_win"):
        assert abs(result[key] - BASE_PROBS[key]) < 1e-9, (
            f"Expected {BASE_PROBS[key]:.12f} for {key!r}, got {result[key]:.12f}"
        )


# ---------------------------------------------------------------------------
# Test 2: Altitude > 1500m delta on home team only
# ---------------------------------------------------------------------------


def test_altitude_penalty_home_only(layer: WCAdjustmentLayer) -> None:
    """Venue at 2500m vs home base at 0m → home_win prob decreases after renorm."""
    ctx = _neutral_ctx(
        altitude_m=2500,
        home_team_base_altitude=0,  # home team unacclimatised: +2500m delta
        away_team_base_altitude=2500,  # away team already at this altitude
    )
    result = layer.adjust_probabilities(BASE_PROBS, ctx)

    # Home team is disadvantaged; its prob should be lower than base
    assert result["home_win"] < BASE_PROBS["home_win"], (
        "home_win should decrease when home team is unacclimatised to venue altitude"
    )

    # Away team has zero altitude delta, so its relative position should improve
    assert result["away_win"] > BASE_PROBS["away_win"], (
        "away_win should increase (renorm) when home team is penalised"
    )

    # Probabilities must still sum to 1.0
    total = result["home_win"] + result["draw"] + result["away_win"]
    assert abs(total - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# Test 3: High pressing penalises more in heat than low pressing
# ---------------------------------------------------------------------------


def test_heat_penalty_scales_with_pressing(layer: WCAdjustmentLayer) -> None:
    """High pressing home team loses more probability in heat than low pressing one."""
    hot_ctx_high_press = _neutral_ctx(
        temperature_c=35.0,
        humidity_pct=80.0,
        home_team_pressing_intensity=0.9,
        away_team_pressing_intensity=0.1,
    )
    hot_ctx_low_press = _neutral_ctx(
        temperature_c=35.0,
        humidity_pct=80.0,
        home_team_pressing_intensity=0.1,
        away_team_pressing_intensity=0.9,
    )
    result_high = layer.adjust_probabilities(BASE_PROBS, hot_ctx_high_press)
    result_low = layer.adjust_probabilities(BASE_PROBS, hot_ctx_low_press)

    # High-pressing home team should end up with lower home_win prob
    assert result_high["home_win"] < result_low["home_win"], (
        "High-pressing home team should suffer more heat penalty → lower home_win"
    )

    # Sanity: both still sum to 1.0
    for result in (result_high, result_low):
        assert abs(sum(result.values()) - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# Test 4: Travel penalty boundary at > 2000 km
# ---------------------------------------------------------------------------


def test_travel_penalty_boundary(layer: WCAdjustmentLayer) -> None:
    """Exactly 2000 km incurs no penalty; 2001 km incurs the penalty."""
    ctx_no_penalty = _neutral_ctx(away_team_travel_km=2000.0)
    ctx_with_penalty = _neutral_ctx(away_team_travel_km=2001.0)

    result_no = layer.adjust_probabilities(BASE_PROBS, ctx_no_penalty)
    result_yes = layer.adjust_probabilities(BASE_PROBS, ctx_with_penalty)

    # 2000 km → no penalty → away_win unchanged vs base (all factors neutral)
    assert abs(result_no["away_win"] - BASE_PROBS["away_win"]) < 1e-9, (
        "2000 km should produce no travel penalty"
    )

    # 2001 km → penalty applied → away_win is lower (before renorm) but
    # since home has no penalty, away_win should be lower after renorm too
    assert result_yes["away_win"] < result_no["away_win"], (
        "2001 km travel should reduce away_win relative to no-penalty case"
    )

    # Both sum to 1.0
    assert abs(sum(result_no.values()) - 1.0) < 1e-9
    assert abs(sum(result_yes.values()) - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# Test 5: Rest day asymmetry
# ---------------------------------------------------------------------------


def test_rest_disadvantage_reduces_home_prob(layer: WCAdjustmentLayer) -> None:
    """Home team with 2 fewer rest days than away team has lower home_win prob."""
    ctx = _neutral_ctx(home_team_rest_days=2, away_team_rest_days=4)
    result = layer.adjust_probabilities(BASE_PROBS, ctx)

    assert result["home_win"] < BASE_PROBS["home_win"], (
        "Home team with rest disadvantage should have lower home_win prob"
    )
    assert abs(sum(result.values()) - 1.0) < 1e-9


def test_rest_advantage_reduces_away_prob(layer: WCAdjustmentLayer) -> None:
    """Away team with 2 fewer rest days than home team has lower away_win prob."""
    ctx = _neutral_ctx(home_team_rest_days=4, away_team_rest_days=2)
    result = layer.adjust_probabilities(BASE_PROBS, ctx)

    assert result["away_win"] < BASE_PROBS["away_win"], (
        "Away team with rest disadvantage should have lower away_win prob"
    )
    assert abs(sum(result.values()) - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# Test 6: Output always sums to 1.0 (parametrised random contexts)
# ---------------------------------------------------------------------------

_RANDOM_SEED = 42
_N_RANDOM_CASES = 20

random.seed(_RANDOM_SEED)


def _random_ctx() -> WCMatchContext:
    """Generate a random WCMatchContext for property-based testing."""
    return WCMatchContext(
        venue_city="Rand",
        altitude_m=random.randint(0, 3500),
        temperature_c=random.uniform(10.0, 42.0),
        humidity_pct=random.uniform(10.0, 100.0),
        home_team_base_altitude=random.randint(0, 3000),
        away_team_base_altitude=random.randint(0, 3000),
        home_team_pressing_intensity=random.random(),
        away_team_pressing_intensity=random.random(),
        home_team_travel_km=random.uniform(0.0, 10000.0),
        away_team_travel_km=random.uniform(0.0, 10000.0),
        home_team_rest_days=random.randint(1, 7),
        away_team_rest_days=random.randint(1, 7),
        stage=random.choice(["group", "round_of_16", "quarter_final", "semi_final", "final"]),
    )


def _random_base_probs() -> dict[str, float]:
    """Generate a random valid base_probs dict."""
    a, b, c = random.random(), random.random(), random.random()
    total = a + b + c
    return {"home_win": a / total, "draw": b / total, "away_win": c / total}


_random_cases = [(i, _random_ctx(), _random_base_probs()) for i in range(_N_RANDOM_CASES)]


@pytest.mark.parametrize(
    "case_id,ctx,probs", _random_cases, ids=[f"rand_{i}" for i in range(_N_RANDOM_CASES)]
)
def test_output_sums_to_one_random(
    layer: WCAdjustmentLayer,
    case_id: int,
    ctx: WCMatchContext,
    probs: dict[str, float],
) -> None:
    """adjust_probabilities output must sum to 1.0 within 1e-9 for random inputs."""
    result = layer.adjust_probabilities(probs, ctx)
    total = sum(result.values())
    assert abs(total - 1.0) < 1e-9, f"Case {case_id}: probabilities sum to {total} instead of 1.0"


# ---------------------------------------------------------------------------
# Test 7: get_adjustment_features returns exactly 7 named keys, all numeric
# ---------------------------------------------------------------------------


_EXPECTED_FEATURE_KEYS = {
    "altitude_delta_home",
    "altitude_delta_away",
    "heat_stress_home",
    "heat_stress_away",
    "travel_flag_home",
    "travel_flag_away",
    "knockout_flag",
}


def test_get_adjustment_features_returns_7_keys(layer: WCAdjustmentLayer) -> None:
    """get_adjustment_features must return exactly the 7 spec-named keys."""
    ctx = _neutral_ctx()
    features = layer.get_adjustment_features(ctx)

    assert set(features.keys()) == _EXPECTED_FEATURE_KEYS, (
        f"Expected keys {_EXPECTED_FEATURE_KEYS}, got {set(features.keys())}"
    )
    assert len(features) == 7, f"Expected 7 features, got {len(features)}"


def test_get_adjustment_features_all_numeric(layer: WCAdjustmentLayer) -> None:
    """All values returned by get_adjustment_features must be numeric (int or float)."""
    ctx = _neutral_ctx(
        altitude_m=2000,
        temperature_c=32.0,
        humidity_pct=75.0,
        home_team_travel_km=2500.0,
        away_team_travel_km=100.0,
        stage="quarter_final",
    )
    features = layer.get_adjustment_features(ctx)

    for key, value in features.items():
        assert isinstance(value, (int, float)), (
            f"Feature {key!r} has non-numeric value {value!r} (type {type(value).__name__})"
        )
        assert not math.isnan(value), f"Feature {key!r} is NaN"
        assert not math.isinf(value), f"Feature {key!r} is infinite"


# ---------------------------------------------------------------------------
# Test 8: Knockout stage reduces draw probability vs group stage
# ---------------------------------------------------------------------------


def test_knockout_stage_reduces_draw(layer: WCAdjustmentLayer) -> None:
    """Knockout stage should produce a lower draw probability than group stage."""
    ctx_group = _neutral_ctx(stage="group")
    ctx_ko = _neutral_ctx(stage="semi_final")

    result_group = layer.adjust_probabilities(BASE_PROBS, ctx_group)
    result_ko = layer.adjust_probabilities(BASE_PROBS, ctx_ko)

    assert result_ko["draw"] < result_group["draw"], (
        "Knockout stage should reduce draw probability relative to group stage"
    )

    # Both must still sum to 1.0
    for result in (result_group, result_ko):
        assert abs(sum(result.values()) - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# Test 9: Invalid base_probs raises ValueError
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "bad_probs",
    [
        {"home_win": 0.5, "draw": 0.3},  # missing away_win
        {"home_win": -0.1, "draw": 0.5, "away_win": 0.6},  # negative value
        {},  # completely empty
    ],
    ids=["missing_key", "negative_value", "empty_dict"],
)
def test_invalid_base_probs_raises(
    layer: WCAdjustmentLayer,
    bad_probs: dict[str, float],
) -> None:
    """Malformed base_probs should raise ValueError."""
    ctx = _neutral_ctx()
    with pytest.raises(ValueError):
        layer.adjust_probabilities(bad_probs, ctx)


# ---------------------------------------------------------------------------
# Test 10: Feature values correct for known inputs
# ---------------------------------------------------------------------------


def test_feature_values_known_inputs(layer: WCAdjustmentLayer) -> None:
    """Spot-check feature values for a fully-specified context."""
    ctx = WCMatchContext(
        venue_city="Mexico City",
        altitude_m=2240,
        temperature_c=28.0,
        humidity_pct=60.0,
        home_team_base_altitude=0,
        away_team_base_altitude=2240,
        home_team_pressing_intensity=0.8,
        away_team_pressing_intensity=0.3,
        home_team_travel_km=2500.0,
        away_team_travel_km=100.0,
        home_team_rest_days=3,
        away_team_rest_days=5,
        stage="round_of_16",
    )
    features = layer.get_adjustment_features(ctx)

    # Altitude deltas
    assert features["altitude_delta_home"] == pytest.approx(2240.0)
    assert features["altitude_delta_away"] == pytest.approx(0.0)

    # Travel flags
    assert features["travel_flag_home"] == pytest.approx(1.0)  # 2500 > 2000
    assert features["travel_flag_away"] == pytest.approx(0.0)  # 100 ≤ 2000

    # Knockout flag
    assert features["knockout_flag"] == pytest.approx(1.0)  # round_of_16

    # Heat stress: temp=28 > 25 baseline, home pressing=0.8 > away pressing=0.3
    assert features["heat_stress_home"] > features["heat_stress_away"]
