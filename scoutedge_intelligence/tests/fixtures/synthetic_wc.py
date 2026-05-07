"""Synthetic World Cup-shaped dataset builder.

Used by integration tests (in particular the P9.3 capstone E2E smoke test) to
generate a deterministic, World Cup-sized fixture without relying on real
historical data. Each team is assigned a hidden "true strength" and goals are
sampled from a Poisson distribution whose rate is derived from those strengths
plus a fixed home advantage. This mirrors the data-generating process that the
Dixon-Coles model is itself designed to fit, so backtests on this dataset
should cleanly meet the smoke-test thresholds.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import numpy as np
import pandas as pd

__all__ = ["build_synthetic_wc"]


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_HOME_ADVANTAGE: float = 0.25
"""Log-rate boost applied to the home team's expected goals."""

_BASE_LOG_RATE: float = 0.30
"""Base log-rate so league average is roughly e^0.30 ≈ 1.35 goals per side."""

_STRENGTH_SD: float = 0.5
"""Standard deviation of each team's hidden 'true strength'."""

_WC_START: datetime = datetime(2026, 6, 1)
"""Inclusive start of the simulated WC window."""

_WC_END: datetime = datetime(2026, 7, 13)
"""Inclusive end of the simulated WC window (final on July 13)."""

_GROUP_STAGE_FRACTION: float = 0.75
"""Fraction of matches treated as group stage (the rest are knockout)."""


def _team_name(idx: int) -> str:
    """Return a deterministic synthetic team name for index *idx*."""
    return f"Team{idx:02d}"


def _spread_dates(n_matches: int) -> list[datetime]:
    """Spread *n_matches* dates evenly across the WC window."""
    if n_matches <= 1:
        return [_WC_START]
    span_days = (_WC_END - _WC_START).days
    step = span_days / float(n_matches - 1)
    return [_WC_START + timedelta(days=round(i * step)) for i in range(n_matches)]


def build_synthetic_wc(
    n_teams: int = 32,
    n_matches: int = 64,
    seed: int = 42,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Build a synthetic World Cup-shaped match dataset.

    Each team has a hidden ``strength`` sampled from ``N(0, 0.5)``. Goals for a
    fixture between home team H and away team A are drawn independently from
    Poisson distributions with rates::

        lambda_home = exp(_BASE_LOG_RATE + strength[H] - strength[A] + 0.25)
        mu_away    = exp(_BASE_LOG_RATE + strength[A] - strength[H])

    The home-advantage term (``+0.25``) only enters the home rate, mirroring
    the structural assumption baked into Dixon-Coles.

    Parameters
    ----------
    n_teams:
        Number of distinct teams (default 32, matching FIFA WC format).
    n_matches:
        Total fixtures to generate (default 64, matching the WC bracket size).
    seed:
        Numpy RNG seed for full determinism.

    Returns
    -------
    tuple[pd.DataFrame, dict[str, Any]]
        ``(matches_df, metadata)`` where ``matches_df`` has columns:
        ``home_team``, ``away_team``, ``date`` (datetime64[ns]),
        ``home_goals`` (int), ``away_goals`` (int), and ``stage``
        (``"group"`` or ``"knockout"``). ``metadata`` carries the per-team
        hidden strengths plus the home-advantage value and the seed.
    """
    if n_teams < 2:
        raise ValueError("n_teams must be >= 2")
    if n_matches < 1:
        raise ValueError("n_matches must be >= 1")

    rng = np.random.default_rng(seed)

    teams: list[str] = [_team_name(i) for i in range(n_teams)]
    raw_strengths: np.ndarray[Any, np.dtype[np.float64]] = rng.normal(
        loc=0.0, scale=_STRENGTH_SD, size=n_teams
    )
    # Centre to zero-sum to avoid drifting Dixon-Coles identifiability.
    centred: np.ndarray[Any, np.dtype[np.float64]] = raw_strengths - raw_strengths.mean()
    team_strengths: dict[str, float] = {team: float(centred[i]) for i, team in enumerate(teams)}

    # Pick (home, away) pairs uniformly without self-matches.
    home_idx: np.ndarray[Any, np.dtype[np.int_]] = rng.integers(low=0, high=n_teams, size=n_matches)
    away_idx: np.ndarray[Any, np.dtype[np.int_]] = rng.integers(low=0, high=n_teams, size=n_matches)
    # Resolve self-matches by rotating the away index forward.
    same_mask = home_idx == away_idx
    away_idx = np.where(same_mask, (away_idx + 1) % n_teams, away_idx)

    dates = _spread_dates(n_matches)
    knockout_threshold = round(n_matches * _GROUP_STAGE_FRACTION)

    rows: list[dict[str, Any]] = []
    for i in range(n_matches):
        h = teams[int(home_idx[i])]
        a = teams[int(away_idx[i])]
        s_h = team_strengths[h]
        s_a = team_strengths[a]

        lambda_home = float(np.exp(_BASE_LOG_RATE + s_h - s_a + _HOME_ADVANTAGE))
        mu_away = float(np.exp(_BASE_LOG_RATE + s_a - s_h))

        home_goals = int(rng.poisson(lambda_home))
        away_goals = int(rng.poisson(mu_away))

        stage = "group" if i < knockout_threshold else "knockout"
        rows.append(
            {
                "home_team": h,
                "away_team": a,
                "date": dates[i],
                "home_goals": home_goals,
                "away_goals": away_goals,
                "stage": stage,
            }
        )

    matches_df = pd.DataFrame(rows)
    matches_df["date"] = pd.to_datetime(matches_df["date"])
    matches_df = matches_df.sort_values("date").reset_index(drop=True)

    metadata: dict[str, Any] = {
        "team_strengths": team_strengths,
        "home_advantage_used": _HOME_ADVANTAGE,
        "seed": seed,
        "n_teams": n_teams,
        "n_matches": n_matches,
    }
    return matches_df, metadata
