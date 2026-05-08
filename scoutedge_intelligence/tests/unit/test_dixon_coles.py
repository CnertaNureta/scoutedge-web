"""Unit tests for scoutedge_intelligence.models.dixon_coles."""

from __future__ import annotations

import math
from collections.abc import Iterator
from unittest.mock import patch

import numpy as np
import pandas as pd
import pytest

from scoutedge_intelligence.models import dixon_coles as dc_module
from scoutedge_intelligence.models.dixon_coles import (
    DixonColesModel,
    DixonColesParams,
)


@pytest.fixture(autouse=True)
def reset_unfitted_warning() -> Iterator[None]:
    """Reset the module-level once-per-process warning guard between tests."""
    dc_module._warned_unfitted = False
    dc_module._warned_unknown_team = False
    yield
    dc_module._warned_unfitted = False
    dc_module._warned_unknown_team = False

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _minimal_params(teams: list[str] | None = None) -> DixonColesParams:
    """Return a small, hand-crafted DixonColesParams for unit tests."""
    if teams is None:
        teams = ["TeamA", "TeamB", "TeamC", "TeamD"]
    # Zero attack/defense -> equal strength; mild home advantage; mild rho
    attack: dict[str, float] = dict.fromkeys(teams, 0.0)
    defense: dict[str, float] = dict.fromkeys(teams, 0.0)
    return DixonColesParams(
        attack=attack,
        defense=defense,
        home_advantage=0.2,
        rho=-0.05,
    )


def _synthetic_matches() -> pd.DataFrame:
    """Return a tiny 12-match DataFrame (4 teams, every pair plays once each way)."""
    teams = ["Alpha", "Beta", "Gamma", "Delta"]
    rows = []
    base_date = pd.Timestamp("2024-01-01")
    idx = 0
    for i, home in enumerate(teams):
        for j, away in enumerate(teams):
            if i == j:
                continue
            rows.append(
                {
                    "home_team": home,
                    "away_team": away,
                    "date": base_date + pd.Timedelta(days=idx * 7),
                    "home_goals": (idx % 4),
                    "away_goals": (idx % 3),
                }
            )
            idx += 1
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Test 1: score_matrix sums to 1.0
# ---------------------------------------------------------------------------


class TestScoreMatrix:
    def test_sums_to_one(self) -> None:
        model = DixonColesModel(params=_minimal_params())
        matrix = model.score_matrix("TeamA", "TeamB")
        assert matrix.shape == (DixonColesModel.MAX_GOALS + 1, DixonColesModel.MAX_GOALS + 1)
        assert abs(matrix.sum() - 1.0) < 1e-9

    def test_all_entries_nonnegative(self) -> None:
        model = DixonColesModel(params=_minimal_params())
        matrix = model.score_matrix("TeamA", "TeamB")
        assert np.all(matrix >= 0)

    def test_raises_keyerror_unknown_home_team(self) -> None:
        model = DixonColesModel(params=_minimal_params())
        with pytest.raises(KeyError):
            model.score_matrix("Unknown", "TeamA")

    def test_raises_keyerror_unknown_away_team(self) -> None:
        model = DixonColesModel(params=_minimal_params())
        with pytest.raises(KeyError):
            model.score_matrix("TeamA", "Ghost")


# ---------------------------------------------------------------------------
# Test 2: predict_1x2 keys and sum
# ---------------------------------------------------------------------------


class TestPredict1x2:
    def test_keys_and_sum(self) -> None:
        model = DixonColesModel(params=_minimal_params())
        result = model.predict_1x2("TeamA", "TeamB")
        assert set(result.keys()) == {"home_win", "draw", "away_win"}
        assert abs(sum(result.values()) - 1.0) < 1e-9

    def test_all_probabilities_in_unit_interval(self) -> None:
        model = DixonColesModel(params=_minimal_params())
        result = model.predict_1x2("TeamA", "TeamC")
        for v in result.values():
            assert 0.0 <= v <= 1.0

    def test_unknown_team_raises_by_default(self) -> None:
        model = DixonColesModel(params=_minimal_params())
        with pytest.raises(KeyError, match="Ghost"):
            model.predict_1x2("TeamA", "Ghost")

    def test_unknown_team_falls_back_to_uniform_probs_when_enabled(self) -> None:
        model = DixonColesModel(params=_minimal_params())
        result = model.predict_1x2("TeamA", "Ghost", fallback_mode=True)

        assert math.isclose(result["home_win"], 1 / 3, rel_tol=1e-12)
        assert math.isclose(result["draw"], 1 / 3, rel_tol=1e-12)
        assert math.isclose(result["away_win"], 1 / 3, rel_tol=1e-12)

    def test_unknown_team_warning_logged_once(self) -> None:
        model = DixonColesModel(params=_minimal_params())

        with patch.object(dc_module.logger, "warning") as mock_warn:
            model.predict_1x2("TeamA", "Ghost", fallback_mode=True)
            model.predict_1x2("Unknown", "TeamB", fallback_mode=True)

        assert mock_warn.call_count == 1
        (msg,), _ = mock_warn.call_args
        assert "dixon_coles.unknown_team_fallback" in msg


# ---------------------------------------------------------------------------
# Test 3: predict_props keys and types
# ---------------------------------------------------------------------------


class TestPredictProps:
    def test_all_six_keys_present(self) -> None:
        model = DixonColesModel(params=_minimal_params())
        props = model.predict_props("TeamA", "TeamB")
        expected_keys = {
            "over_2_5_goals",
            "under_2_5_goals",
            "btts_yes",
            "btts_no",
            "most_likely_score",
            "most_likely_score_prob",
        }
        assert set(props.keys()) == expected_keys

    def test_valid_types(self) -> None:
        model = DixonColesModel(params=_minimal_params())
        props = model.predict_props("TeamA", "TeamB")
        assert isinstance(props["over_2_5_goals"], float)
        assert isinstance(props["under_2_5_goals"], float)
        assert isinstance(props["btts_yes"], float)
        assert isinstance(props["btts_no"], float)
        assert isinstance(props["most_likely_score"], tuple)
        assert len(props["most_likely_score"]) == 2
        assert isinstance(props["most_likely_score_prob"], float)

    def test_over_under_sum_to_one(self) -> None:
        model = DixonColesModel(params=_minimal_params())
        props = model.predict_props("TeamC", "TeamD")
        assert abs(props["over_2_5_goals"] + props["under_2_5_goals"] - 1.0) < 1e-9

    def test_btts_sum_to_one(self) -> None:
        model = DixonColesModel(params=_minimal_params())
        props = model.predict_props("TeamC", "TeamD")
        assert abs(props["btts_yes"] + props["btts_no"] - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# Test 4: _tau formula for low-score cells
# ---------------------------------------------------------------------------


class TestTau:
    """Verify the Dixon-Coles τ correction formula at (0,0),(0,1),(1,0),(1,1)."""

    def test_tau_0_0(self) -> None:
        lambda_, mu, rho = 1.5, 1.2, -0.05
        expected = 1.0 - lambda_ * mu * rho
        result = DixonColesModel._tau(0, 0, lambda_, mu, rho)
        assert math.isclose(result, expected, rel_tol=1e-12)

    def test_tau_0_1(self) -> None:
        lambda_, mu, rho = 1.5, 1.2, -0.05
        expected = 1.0 + lambda_ * rho
        result = DixonColesModel._tau(0, 1, lambda_, mu, rho)
        assert math.isclose(result, expected, rel_tol=1e-12)

    def test_tau_1_0(self) -> None:
        lambda_, mu, rho = 1.5, 1.2, -0.05
        expected = 1.0 + mu * rho
        result = DixonColesModel._tau(1, 0, lambda_, mu, rho)
        assert math.isclose(result, expected, rel_tol=1e-12)

    def test_tau_1_1(self) -> None:
        lambda_, mu, rho = 1.5, 1.2, -0.05
        expected = 1.0 - rho
        result = DixonColesModel._tau(1, 1, lambda_, mu, rho)
        assert math.isclose(result, expected, rel_tol=1e-12)


# ---------------------------------------------------------------------------
# Test 5: _tau returns 1.0 for x >= 2 or y >= 2
# ---------------------------------------------------------------------------


class TestTauHighScores:
    @pytest.mark.parametrize(
        "x, y",
        [
            (2, 0),
            (0, 2),
            (2, 2),
            (3, 1),
            (1, 3),
            (5, 5),
            (8, 0),
        ],
    )
    def test_returns_one(self, x: int, y: int) -> None:
        result = DixonColesModel._tau(x, y, lambda_=1.5, mu=1.2, rho=-0.1)
        assert result == 1.0


# ---------------------------------------------------------------------------
# Test 6: fit() converges on synthetic dataset
# ---------------------------------------------------------------------------


class TestFit:
    def test_fit_converges_and_returns_dicts(self) -> None:
        df = _synthetic_matches()
        model = DixonColesModel()
        result = model.fit(df, decay_factor=0.0065)

        # Optimiser should not completely fail
        assert result is not None
        assert model.params is not None

        teams = {"Alpha", "Beta", "Gamma", "Delta"}
        assert isinstance(model.params.attack, dict)
        assert isinstance(model.params.defense, dict)
        assert set(model.params.attack.keys()) == teams
        assert set(model.params.defense.keys()) == teams
        assert isinstance(model.params.home_advantage, float)
        assert isinstance(model.params.rho, float)

    def test_fit_identifiability_constraints(self) -> None:
        """sum(attack) and sum(defense) should be near zero after fitting."""
        df = _synthetic_matches()
        model = DixonColesModel()
        model.fit(df, decay_factor=0.0065)
        assert model.params is not None
        attack_sum = sum(model.params.attack.values())
        defense_sum = sum(model.params.defense.values())
        assert abs(attack_sum) < 1e-4, f"attack sum {attack_sum} not near 0"
        assert abs(defense_sum) < 1e-4, f"defense sum {defense_sum} not near 0"

    def test_fit_then_predict(self) -> None:
        """After fitting, score_matrix and predict_1x2 should run without error."""
        df = _synthetic_matches()
        model = DixonColesModel()
        model.fit(df, decay_factor=0.0065)
        matrix = model.score_matrix("Alpha", "Beta")
        assert abs(matrix.sum() - 1.0) < 1e-9
        probs = model.predict_1x2("Alpha", "Beta")
        assert abs(sum(probs.values()) - 1.0) < 1e-9


# ---------------------------------------------------------------------------
# Test 7: unfitted-model fallback for predict_1x2
# ---------------------------------------------------------------------------


class TestUnfittedFallback:
    def test_predict_1x2_unfitted_raises_by_default(self) -> None:
        model = DixonColesModel()
        with pytest.raises(RuntimeError, match="predict_1x2 called before fit"):
            model.predict_1x2("AnyHome", "AnyAway")

    def test_predict_1x2_unfitted_returns_uniform_probs_when_enabled(self) -> None:
        model = DixonColesModel()
        result = model.predict_1x2("AnyHome", "AnyAway", fallback_mode=True)

        assert set(result.keys()) == {"home_win", "draw", "away_win"}
        assert math.isclose(result["home_win"], 1 / 3, rel_tol=1e-12)
        assert math.isclose(result["draw"], 1 / 3, rel_tol=1e-12)
        assert math.isclose(result["away_win"], 1 / 3, rel_tol=1e-12)
        assert math.isclose(sum(result.values()), 1.0, rel_tol=1e-12)

    def test_is_fitted_property_reflects_state(self) -> None:
        model = DixonColesModel()
        assert model.is_fitted is False

        model.params = _minimal_params()
        assert model.is_fitted is True

    def test_predict_1x2_unfitted_warning_logged_once(self) -> None:
        model = DixonColesModel()

        with patch.object(dc_module.logger, "warning") as mock_warn:
            model.predict_1x2("A", "B", fallback_mode=True)
            model.predict_1x2("C", "D", fallback_mode=True)
            model.predict_1x2("E", "F", fallback_mode=True)

        assert mock_warn.call_count == 1
        (msg,), _ = mock_warn.call_args
        assert "dixon_coles.unfitted_fallback" in msg

    def test_predict_1x2_unfitted_returns_independent_copy(self) -> None:
        """Mutating the returned dict must not affect subsequent calls."""
        model = DixonColesModel()
        first = model.predict_1x2("A", "B", fallback_mode=True)
        first["home_win"] = 0.99
        second = model.predict_1x2("A", "B", fallback_mode=True)
        assert math.isclose(second["home_win"], 1 / 3, rel_tol=1e-12)
