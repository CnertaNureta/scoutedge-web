"""WC2026 fatigue feature computation (spec sec 3.7 - Fatigue & Scheduling Features).

Derives per-team fatigue signals from a match history DataFrame: rest days since
last match, cumulative travel distance over a 14-day rolling window, knockout-stage
load (match count from R16 onward), and group-stage minutes played.  First-match
rows for each team always receive NaN for time-dependent features.
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Match stages that count as knockout load (R16 and beyond)
_KNOCKOUT_STAGES: frozenset[str] = frozenset(
    {
        "R16",
        "QF",
        "SF",
        "3RD",
        "FINAL",
        # alternative spellings found in WC datasets
        "ROUND_OF_16",
        "QUARTER_FINAL",
        "SEMI_FINAL",
        "THIRD_PLACE",
    }
)

_TRAVEL_WINDOW_DAYS: int = 14


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def compute_fatigue_features(
    matches_df: pd.DataFrame,
    *,
    today: Any,
    team_col: str,
) -> pd.DataFrame:
    """Return *matches_df* with fatigue feature columns appended.

    The function iterates over each unique team found in *team_col*, sorts that
    team's appearances chronologically, and computes time-aware features with
    respect to each row's ``match_date``.

    Expected input columns:
        ``match_date``         - date/datetime of the match (coerced internally)
        ``stage``              - competition stage string (e.g. ``"GROUP"``, ``"R16"``)
        ``travel_km``          - kilometres travelled to reach the match venue
        ``minutes_played``     - total minutes played by the team in that match
        *team_col*             - team identifier column (name given by argument)

    Output columns added:
        ``rest_days``          - integer days since the team's previous match;
                                  NaN for the team's first match
        ``travel_km_14d``      - cumulative ``travel_km`` in the 14 days preceding
                                  (not including) the current match; NaN for first
        ``knockout_load``      - count of knockout-stage matches played prior to
                                  the current row; 0 for group-stage rows
        ``group_stage_minutes``- total minutes played in group-stage matches prior
                                  to the current row; 0 for the team's first match

    Args:
        matches_df: One row per team-match appearance.  Not mutated.
        today: Reference date used for any future-looking guard; currently stored
               for API consistency but not required for the feature calculations.
        team_col: Column name that identifies the team for each row.

    Returns:
        A new ``pd.DataFrame`` with all original columns plus the four fatigue
        feature columns.
    """
    out = matches_df.copy()

    # Ensure date column is datetime
    out["match_date"] = pd.to_datetime(out["match_date"])

    # Initialise output columns with NaN / 0 as appropriate
    out["rest_days"] = np.nan
    out["travel_km_14d"] = np.nan
    out["knockout_load"] = np.nan
    out["group_stage_minutes"] = np.nan

    for _team, group in out.groupby(team_col, sort=False):
        idx = group.sort_values("match_date").index

        for i, row_idx in enumerate(idx):
            if i == 0:
                # First match - time-dependent features are undefined
                out.loc[row_idx, "rest_days"] = np.nan
                out.loc[row_idx, "travel_km_14d"] = np.nan
                out.loc[row_idx, "knockout_load"] = 0
                out.loc[row_idx, "group_stage_minutes"] = 0
                continue

            prior_indices = idx[:i]
            prior_rows = out.loc[prior_indices]

            current_date: pd.Timestamp = out.loc[row_idx, "match_date"]

            # 1. Rest days - days since most-recent prior match
            last_date: pd.Timestamp = prior_rows["match_date"].max()
            out.loc[row_idx, "rest_days"] = float((current_date - last_date).days)

            # 2. Travel km in rolling 14-day window prior to this match
            window_start = current_date - pd.Timedelta(days=_TRAVEL_WINDOW_DAYS)
            in_window = prior_rows[
                (prior_rows["match_date"] > window_start)
                & (prior_rows["match_date"] < current_date)
            ]
            travel_col = _get_optional_series(prior_rows, "travel_km")
            if travel_col is not None:
                window_travel_col = _get_optional_series(in_window, "travel_km")
                out.loc[row_idx, "travel_km_14d"] = (
                    window_travel_col.sum() if window_travel_col is not None else np.nan
                )
            else:
                out.loc[row_idx, "travel_km_14d"] = np.nan

            # 3. Knockout load - count of prior knockout-stage matches
            if "stage" in prior_rows.columns:
                knockout_mask = prior_rows["stage"].isin(_KNOCKOUT_STAGES)
                out.loc[row_idx, "knockout_load"] = float(knockout_mask.sum())
            else:
                out.loc[row_idx, "knockout_load"] = 0.0

            # 4. Group-stage minutes - sum of minutes played in group stage so far
            if "stage" in prior_rows.columns and "minutes_played" in prior_rows.columns:
                group_mask = ~prior_rows["stage"].isin(_KNOCKOUT_STAGES)
                out.loc[row_idx, "group_stage_minutes"] = float(
                    prior_rows.loc[group_mask, "minutes_played"].sum()
                )
            elif "minutes_played" in prior_rows.columns:
                out.loc[row_idx, "group_stage_minutes"] = float(prior_rows["minutes_played"].sum())
            else:
                out.loc[row_idx, "group_stage_minutes"] = 0.0

    return out


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_optional_series(df: pd.DataFrame, col: str) -> pd.Series | None:
    """Return column Series if present, else None."""
    if col in df.columns:
        return df[col].astype(float)
    return None
