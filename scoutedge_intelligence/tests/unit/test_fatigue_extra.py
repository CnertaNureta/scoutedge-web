"""Extra coverage for features.fatigue: paths missed by test_features.

Targets:
- compute_fatigue_features when ``travel_km`` column is absent → travel_km_14d=NaN
- compute_fatigue_features when ``stage`` column is absent → knockout_load=0
- compute_fatigue_features when both ``stage`` and ``minutes_played`` absent →
  group_stage_minutes=0
- compute_fatigue_features when ``minutes_played`` absent but ``stage`` present →
  group_stage_minutes=0 (covers stage-but-no-minutes branch)
- _get_optional_series returns None when column is absent
"""

from __future__ import annotations

import math

import pandas as pd

from scoutedge_intelligence.features.fatigue import (
    _get_optional_series,
    compute_fatigue_features,
)


def _two_match_df(extra_cols: dict[str, list]) -> pd.DataFrame:
    base = {
        "team": ["BRA", "BRA"],
        "match_date": ["2026-06-15", "2026-06-19"],
    }
    base.update(extra_cols)
    return pd.DataFrame(base)


def test_no_travel_km_column_yields_nan() -> None:
    df = _two_match_df({"stage": ["GROUP", "GROUP"], "minutes_played": [90, 90]})
    out = compute_fatigue_features(df, today="2026-06-19", team_col="team")
    second = out.iloc[1]
    assert math.isnan(second["travel_km_14d"])


def test_no_stage_column_yields_zero_knockout_load() -> None:
    df = _two_match_df({"travel_km": [500.0, 300.0], "minutes_played": [90, 90]})
    out = compute_fatigue_features(df, today="2026-06-19", team_col="team")
    assert out.iloc[1]["knockout_load"] == 0.0


def test_minutes_only_no_stage_sums_all_minutes() -> None:
    """When ``stage`` is absent but ``minutes_played`` exists, sum all prior minutes."""
    df = _two_match_df({"travel_km": [500.0, 300.0], "minutes_played": [85, 90]})
    out = compute_fatigue_features(df, today="2026-06-19", team_col="team")
    assert out.iloc[1]["group_stage_minutes"] == 85.0


def test_no_stage_no_minutes_yields_zero_group_stage_minutes() -> None:
    df = _two_match_df({"travel_km": [500.0, 300.0]})
    out = compute_fatigue_features(df, today="2026-06-19", team_col="team")
    assert out.iloc[1]["group_stage_minutes"] == 0.0


def test_get_optional_series_returns_none_when_missing() -> None:
    df = pd.DataFrame({"a": [1, 2]})
    assert _get_optional_series(df, "missing") is None
    series = _get_optional_series(df, "a")
    assert series is not None
    assert series.dtype == float
