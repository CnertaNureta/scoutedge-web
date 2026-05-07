"""Football Four Factors feature computation (spec §3.6 - Four Factors for Football).

Computes four derived efficiency metrics per team side (HOME/AWAY) from
raw match statistics: xG efficiency, conversion delta, field tilt, and set-piece
reliance. All division is NaN-safe: zero denominators yield NaN, not errors.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def compute_football_four_factors(df: pd.DataFrame) -> pd.DataFrame:
    """Return *df* with four-factor columns appended for HOME and AWAY sides.

    Expected input columns (replace ``*`` with ``HOME`` or ``AWAY``):
        ``*_xG``, ``*_SHOTS``, ``*_GOALS``, ``*_FINAL_THIRD_PASSES``,
        ``*_PASSES``, ``*_SET_PIECE_xG``

    Output columns added per side:
        ``*_xG_PER_SHOT``      - xG per shot attempted (shooting quality)
        ``*_CONVERSION_DELTA`` - goals minus xG (finishing over/under-performance)
        ``*_FIELD_TILT``       - share of final-third passes out of total passes
                                  (territorial dominance proxy)
        ``*_SET_PIECE_RATIO``  - set-piece xG as share of total xG

    Args:
        df: A ``pd.DataFrame`` with one row per match.  Input is never mutated.

    Returns:
        A new ``pd.DataFrame`` with all original columns plus the eight new
        factor columns.  Rows with zero or missing denominators produce ``NaN``
        in the corresponding factor column.
    """
    out = df.copy()

    for side in ("HOME", "AWAY"):
        xg = _safe_col(out, f"{side}_xG")
        shots = _safe_col(out, f"{side}_SHOTS")
        goals = _safe_col(out, f"{side}_GOALS")
        fp_passes = _safe_col(out, f"{side}_FINAL_THIRD_PASSES")
        passes = _safe_col(out, f"{side}_PASSES")
        sp_xg = _safe_col(out, f"{side}_SET_PIECE_xG")

        # 1. xG per shot - shooting quality
        out[f"{side}_xG_PER_SHOT"] = xg / _zero_to_nan(shots)

        # 2. Conversion delta - actual finishing vs. expected finishing
        out[f"{side}_CONVERSION_DELTA"] = goals - xg

        # 3. Field tilt - final-third pass share (territorial dominance)
        out[f"{side}_FIELD_TILT"] = fp_passes / _zero_to_nan(passes)

        # 4. Set-piece ratio - set-piece xG share of total xG
        out[f"{side}_SET_PIECE_RATIO"] = sp_xg / _zero_to_nan(xg)

    return out


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _zero_to_nan(s: pd.Series) -> pd.Series:
    """Replace zeros with NaN so that division propagates NaN cleanly."""
    return s.replace(0, np.nan)


def _safe_col(df: pd.DataFrame, col: str) -> pd.Series:
    """Return the column as float Series, or a NaN Series if absent."""
    if col in df.columns:
        return df[col].astype(float)
    return pd.Series(np.nan, index=df.index, dtype=float)
