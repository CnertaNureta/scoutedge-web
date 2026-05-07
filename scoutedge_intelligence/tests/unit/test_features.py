"""Unit tests for four_factors.py and fatigue.py (spec §3.6-3.7).

Covers:
  - Football Four Factors: zero-shot NaN safety, formula correctness, idempotency,
    missing column fallback, and empty-DataFrame handling.
  - Fatigue: first-match NaN, rest-day gap, 14-day travel window, knockout load
    progression, group-stage minutes accumulation, and empty-DataFrame handling.
"""

from __future__ import annotations

import math
from datetime import date, timedelta

import pandas as pd
import pytest

from scoutedge_intelligence.features.fatigue import compute_fatigue_features
from scoutedge_intelligence.features.four_factors import compute_football_four_factors

# ===========================================================================
# Helpers
# ===========================================================================


def _make_ff_row(**kwargs: float) -> dict[str, float]:
    """Return a single-row dict with all required four-factor input columns."""
    defaults: dict[str, float] = {
        "HOME_xG": 1.5,
        "HOME_SHOTS": 12.0,
        "HOME_GOALS": 2.0,
        "HOME_FINAL_THIRD_PASSES": 80.0,
        "HOME_PASSES": 400.0,
        "HOME_SET_PIECE_xG": 0.3,
        "AWAY_xG": 1.0,
        "AWAY_SHOTS": 8.0,
        "AWAY_GOALS": 1.0,
        "AWAY_FINAL_THIRD_PASSES": 50.0,
        "AWAY_PASSES": 300.0,
        "AWAY_SET_PIECE_xG": 0.2,
    }
    defaults.update(kwargs)
    return defaults


def _ff_df(**kwargs: float) -> pd.DataFrame:
    return pd.DataFrame([_make_ff_row(**kwargs)])


def _fatigue_df(rows: list[dict]) -> pd.DataFrame:  # type: ignore[type-arg]
    """Build a fatigue input DataFrame from a list of row dicts."""
    return pd.DataFrame(rows)


# ===========================================================================
# Four Factors - §3.6
# ===========================================================================


class TestFourFactorsZeroShots:
    """Zero shots → xG_PER_SHOT is NaN, no exception raised."""

    def test_home_zero_shots_yields_nan(self) -> None:
        df = _ff_df(HOME_SHOTS=0.0)
        result = compute_football_four_factors(df)
        assert math.isnan(result["HOME_xG_PER_SHOT"].iloc[0])

    def test_away_zero_shots_yields_nan(self) -> None:
        df = _ff_df(AWAY_SHOTS=0.0)
        result = compute_football_four_factors(df)
        assert math.isnan(result["AWAY_xG_PER_SHOT"].iloc[0])

    def test_zero_xg_set_piece_ratio_nan(self) -> None:
        """Zero total xG → SET_PIECE_RATIO is NaN."""
        df = _ff_df(HOME_xG=0.0)
        result = compute_football_four_factors(df)
        assert math.isnan(result["HOME_SET_PIECE_RATIO"].iloc[0])

    def test_zero_passes_field_tilt_nan(self) -> None:
        """Zero total passes → FIELD_TILT is NaN."""
        df = _ff_df(HOME_PASSES=0.0)
        result = compute_football_four_factors(df)
        assert math.isnan(result["HOME_FIELD_TILT"].iloc[0])


class TestFourFactorsFormulas:
    """Known small df → expected ratios within 1e-9."""

    def test_xg_per_shot(self) -> None:
        df = _ff_df(HOME_xG=1.5, HOME_SHOTS=10.0)
        result = compute_football_four_factors(df)
        assert result["HOME_xG_PER_SHOT"].iloc[0] == pytest.approx(0.15, abs=1e-9)

    def test_conversion_delta_positive(self) -> None:
        df = _ff_df(HOME_GOALS=3.0, HOME_xG=2.0)
        result = compute_football_four_factors(df)
        assert result["HOME_CONVERSION_DELTA"].iloc[0] == pytest.approx(1.0, abs=1e-9)

    def test_conversion_delta_negative(self) -> None:
        df = _ff_df(HOME_GOALS=0.0, HOME_xG=1.5)
        result = compute_football_four_factors(df)
        assert result["HOME_CONVERSION_DELTA"].iloc[0] == pytest.approx(-1.5, abs=1e-9)

    def test_field_tilt(self) -> None:
        df = _ff_df(HOME_FINAL_THIRD_PASSES=100.0, HOME_PASSES=500.0)
        result = compute_football_four_factors(df)
        assert result["HOME_FIELD_TILT"].iloc[0] == pytest.approx(0.2, abs=1e-9)

    def test_set_piece_ratio(self) -> None:
        df = _ff_df(HOME_SET_PIECE_xG=0.5, HOME_xG=2.0)
        result = compute_football_four_factors(df)
        assert result["HOME_SET_PIECE_RATIO"].iloc[0] == pytest.approx(0.25, abs=1e-9)

    def test_away_side_independent(self) -> None:
        """AWAY factors must be computed independently of HOME values."""
        df = _ff_df(
            AWAY_xG=2.0,
            AWAY_SHOTS=20.0,
            AWAY_GOALS=1.0,
            AWAY_FINAL_THIRD_PASSES=60.0,
            AWAY_PASSES=300.0,
            AWAY_SET_PIECE_xG=0.4,
        )
        result = compute_football_four_factors(df)
        assert result["AWAY_xG_PER_SHOT"].iloc[0] == pytest.approx(0.1, abs=1e-9)
        assert result["AWAY_CONVERSION_DELTA"].iloc[0] == pytest.approx(-1.0, abs=1e-9)
        assert result["AWAY_FIELD_TILT"].iloc[0] == pytest.approx(0.2, abs=1e-9)
        assert result["AWAY_SET_PIECE_RATIO"].iloc[0] == pytest.approx(0.2, abs=1e-9)


class TestFourFactorsIdempotent:
    """Running compute_football_four_factors twice must not break columns."""

    def test_idempotent_values(self) -> None:
        df = _ff_df()
        first = compute_football_four_factors(df)
        second = compute_football_four_factors(first)
        for col in [
            "HOME_xG_PER_SHOT",
            "HOME_CONVERSION_DELTA",
            "HOME_FIELD_TILT",
            "HOME_SET_PIECE_RATIO",
            "AWAY_xG_PER_SHOT",
            "AWAY_CONVERSION_DELTA",
            "AWAY_FIELD_TILT",
            "AWAY_SET_PIECE_RATIO",
        ]:
            assert first[col].iloc[0] == pytest.approx(second[col].iloc[0], abs=1e-9), (
                f"Column {col} changed after second call"
            )

    def test_original_df_not_mutated(self) -> None:
        df = _ff_df()
        original_cols = set(df.columns)
        _ = compute_football_four_factors(df)
        assert set(df.columns) == original_cols


class TestFourFactorsMissingColumns:
    """Missing input columns are treated as NaN, no KeyError raised."""

    def test_missing_shots_column_no_exception(self) -> None:
        df = pd.DataFrame(
            [
                {
                    "HOME_xG": 1.0,
                    "HOME_GOALS": 1.0,
                    "HOME_FINAL_THIRD_PASSES": 50.0,
                    "HOME_PASSES": 300.0,
                    "HOME_SET_PIECE_xG": 0.2,
                    "AWAY_xG": 1.0,
                    "AWAY_SHOTS": 8.0,
                    "AWAY_GOALS": 1.0,
                    "AWAY_FINAL_THIRD_PASSES": 50.0,
                    "AWAY_PASSES": 300.0,
                    "AWAY_SET_PIECE_xG": 0.2,
                }
            ]
        )
        result = compute_football_four_factors(df)
        assert math.isnan(result["HOME_xG_PER_SHOT"].iloc[0])


class TestFourFactorsEmptyInput:
    """Empty input returns empty DataFrame with all eight new columns present."""

    def test_empty_df_has_output_columns(self) -> None:
        empty = pd.DataFrame(
            columns=[
                "HOME_xG",
                "HOME_SHOTS",
                "HOME_GOALS",
                "HOME_FINAL_THIRD_PASSES",
                "HOME_PASSES",
                "HOME_SET_PIECE_xG",
                "AWAY_xG",
                "AWAY_SHOTS",
                "AWAY_GOALS",
                "AWAY_FINAL_THIRD_PASSES",
                "AWAY_PASSES",
                "AWAY_SET_PIECE_xG",
            ]
        )
        result = compute_football_four_factors(empty)
        expected_new_cols = {
            "HOME_xG_PER_SHOT",
            "HOME_CONVERSION_DELTA",
            "HOME_FIELD_TILT",
            "HOME_SET_PIECE_RATIO",
            "AWAY_xG_PER_SHOT",
            "AWAY_CONVERSION_DELTA",
            "AWAY_FIELD_TILT",
            "AWAY_SET_PIECE_RATIO",
        }
        assert expected_new_cols.issubset(set(result.columns))
        assert len(result) == 0


# ===========================================================================
# Fatigue - §3.7
# ===========================================================================

_BASE_DATE = date(2026, 6, 1)


def _d(offset: int) -> str:
    """Return ISO date string offset days from _BASE_DATE."""
    return (_BASE_DATE + timedelta(days=offset)).isoformat()


def _make_fatigue_rows(team: str = "Brazil") -> list[dict]:  # type: ignore[type-arg]
    return [
        {
            "team": team,
            "match_date": _d(0),
            "stage": "GROUP",
            "travel_km": 500.0,
            "minutes_played": 90.0,
        },
        {
            "team": team,
            "match_date": _d(3),
            "stage": "GROUP",
            "travel_km": 300.0,
            "minutes_played": 90.0,
        },
        {
            "team": team,
            "match_date": _d(10),
            "stage": "GROUP",
            "travel_km": 400.0,
            "minutes_played": 90.0,
        },
        {
            "team": team,
            "match_date": _d(20),
            "stage": "R16",
            "travel_km": 600.0,
            "minutes_played": 120.0,
        },
        {
            "team": team,
            "match_date": _d(25),
            "stage": "QF",
            "travel_km": 700.0,
            "minutes_played": 90.0,
        },
    ]


class TestFatigueFirstMatch:
    """First match of a team → rest_days is NaN."""

    def test_first_match_rest_days_nan(self) -> None:
        rows = _make_fatigue_rows()
        df = _fatigue_df(rows)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        first_row = result[result["match_date"] == pd.Timestamp(_d(0))].iloc[0]
        assert math.isnan(first_row["rest_days"])

    def test_first_match_travel_km_14d_nan(self) -> None:
        rows = _make_fatigue_rows()
        df = _fatigue_df(rows)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        first_row = result[result["match_date"] == pd.Timestamp(_d(0))].iloc[0]
        assert math.isnan(first_row["travel_km_14d"])


class TestFatigueRestDays:
    """3-day gap between matches → rest_days == 3."""

    def test_three_day_gap(self) -> None:
        rows = _make_fatigue_rows()
        df = _fatigue_df(rows)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        second_row = result[result["match_date"] == pd.Timestamp(_d(3))].iloc[0]
        assert second_row["rest_days"] == pytest.approx(3.0)

    def test_seven_day_gap(self) -> None:
        rows = _make_fatigue_rows()
        df = _fatigue_df(rows)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        # Third match is at day 10, second was at day 3 → gap = 7
        third_row = result[result["match_date"] == pd.Timestamp(_d(10))].iloc[0]
        assert third_row["rest_days"] == pytest.approx(7.0)


class TestFatigueTravelWindow:
    """14-day rolling travel accumulation correctness."""

    def test_travel_within_window(self) -> None:
        """Third match: prior matches at d+0 and d+3 are within 14-day window."""
        rows = _make_fatigue_rows()
        df = _fatigue_df(rows)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        # At d+10 the window covers d+0 (10 days prior) and d+3 (7 days prior) - both in range
        third_row = result[result["match_date"] == pd.Timestamp(_d(10))].iloc[0]
        assert third_row["travel_km_14d"] == pytest.approx(500.0 + 300.0, abs=1e-6)

    def test_travel_outside_window_excluded(self) -> None:
        """Fourth match at d+20: d+0 and d+3 are >14 days prior and excluded."""
        rows = _make_fatigue_rows()
        df = _fatigue_df(rows)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        # At d+20 the 14-day window covers d+6 onward; d+10 is in, d+3 and d+0 are out
        fourth_row = result[result["match_date"] == pd.Timestamp(_d(20))].iloc[0]
        # Only d+10 (travel_km=400) falls within 14 days of d+20
        assert fourth_row["travel_km_14d"] == pytest.approx(400.0, abs=1e-6)


class TestFatigueKnockoutLoad:
    """knockout_load is 0 in group stage, increments after R16."""

    def test_group_stage_knockout_load_zero(self) -> None:
        rows = _make_fatigue_rows()
        df = _fatigue_df(rows)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        # All three group matches should have knockout_load == 0
        group_rows = result[result["stage"] == "GROUP"]
        for _, row in group_rows.iterrows():
            assert row["knockout_load"] == pytest.approx(0.0)

    def test_r16_knockout_load_zero(self) -> None:
        """R16 match itself: prior matches are all group stage → knockout_load 0."""
        rows = _make_fatigue_rows()
        df = _fatigue_df(rows)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        r16_row = result[result["stage"] == "R16"].iloc[0]
        assert r16_row["knockout_load"] == pytest.approx(0.0)

    def test_qf_knockout_load_one(self) -> None:
        """QF match: one R16 played prior → knockout_load == 1."""
        rows = _make_fatigue_rows()
        df = _fatigue_df(rows)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        qf_row = result[result["stage"] == "QF"].iloc[0]
        assert qf_row["knockout_load"] == pytest.approx(1.0)


class TestFatigueGroupStageMinutes:
    """group_stage_minutes accumulates correctly across group-stage rows."""

    def test_first_match_group_minutes_zero(self) -> None:
        rows = _make_fatigue_rows()
        df = _fatigue_df(rows)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        first_row = result[result["match_date"] == pd.Timestamp(_d(0))].iloc[0]
        assert first_row["group_stage_minutes"] == pytest.approx(0.0)

    def test_second_match_group_minutes(self) -> None:
        rows = _make_fatigue_rows()
        df = _fatigue_df(rows)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        second_row = result[result["match_date"] == pd.Timestamp(_d(3))].iloc[0]
        # Only the first match (90 min, GROUP) has been played
        assert second_row["group_stage_minutes"] == pytest.approx(90.0)

    def test_r16_sees_all_group_minutes(self) -> None:
        rows = _make_fatigue_rows()
        df = _fatigue_df(rows)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        r16_row = result[result["stage"] == "R16"].iloc[0]
        # Three group matches at 90 min each = 270
        assert r16_row["group_stage_minutes"] == pytest.approx(270.0)


class TestFatigueMultipleTeams:
    """Teams must be computed independently; one team's data must not bleed."""

    def test_two_teams_independent(self) -> None:
        rows_a = _make_fatigue_rows("TeamA")
        rows_b = [
            {
                "team": "TeamB",
                "match_date": _d(0),
                "stage": "GROUP",
                "travel_km": 100.0,
                "minutes_played": 90.0,
            },
            {
                "team": "TeamB",
                "match_date": _d(5),
                "stage": "GROUP",
                "travel_km": 200.0,
                "minutes_played": 90.0,
            },
        ]
        df = _fatigue_df(rows_a + rows_b)
        result = compute_fatigue_features(df, today=_BASE_DATE, team_col="team")
        # TeamB second match: rest_days must be 5, not influenced by TeamA
        team_b_second = result[
            (result["team"] == "TeamB") & (result["match_date"] == pd.Timestamp(_d(5)))
        ].iloc[0]
        assert team_b_second["rest_days"] == pytest.approx(5.0)


class TestFatigueEmptyInput:
    """Empty input returns empty DataFrame with fatigue columns present."""

    def test_empty_df_has_output_columns(self) -> None:
        empty = pd.DataFrame(columns=["team", "match_date", "stage", "travel_km", "minutes_played"])
        result = compute_fatigue_features(empty, today=_BASE_DATE, team_col="team")
        for col in ["rest_days", "travel_km_14d", "knockout_load", "group_stage_minutes"]:
            assert col in result.columns
        assert len(result) == 0
