"""Adaptive weighting layer for ScoutEdge WC2026 triple-layer probability synthesis.

Combines ML, Sportsbook, and Polymarket signals into final 1X2 probabilities by
computing three non-negative weights (w_ml, w_sb, w_poly) that sum to 1.0.
Weights are adapted based on signal quality metrics.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

ProbDict = dict[str, float]
"""Keys: home_win, draw, away_win — each in [0, 1], summing to 1.0."""

_PROB_KEYS: frozenset[str] = frozenset({"home_win", "draw", "away_win"})

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

POLYMARKET_HARD_CAP: float = 0.15
"""Maximum allowed weight for Polymarket signal."""

POLYMARKET_VOLUME_THRESHOLD: float = 10_000.0
"""24-hour volume below this renders Polymarket weight essentially zero (≤ 0.01)."""

BASE_WEIGHTS: dict[str, float] = {"ml": 0.40, "sb": 0.45, "poly": 0.15}
"""Starting weights when all signals are fully reliable."""

_BASE_ML_SB_RATIO: float = BASE_WEIGHTS["ml"] / (BASE_WEIGHTS["ml"] + BASE_WEIGHTS["sb"])
"""Fraction of (ml + sb) budget allocated to ml at baseline (≈ 0.4706)."""

# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class WeightInputs:
    """Quality signals used to adapt the three source weights.

    Attributes:
        ml_max_prob: max(P_home, P_draw, P_away) from the ML layer. Range [0, 1].
        sb_books_used: Number of sportsbooks that contributed to the consensus line. ≥ 1.
        poly_volume_24h: Polymarket 24-hour traded volume in USD. None if absent.
        poly_bid_ask_spread: Current best-bid / best-ask spread as a fraction. None if absent.
        poly_present: False when the Polymarket layer is entirely missing for this match.
    """

    ml_max_prob: float
    sb_books_used: int
    poly_volume_24h: float | None
    poly_bid_ask_spread: float | None
    poly_present: bool

    def __post_init__(self) -> None:
        if not (0.0 <= self.ml_max_prob <= 1.0):
            raise ValueError(f"ml_max_prob must be in [0, 1], got {self.ml_max_prob}")
        if self.sb_books_used < 1:
            raise ValueError(f"sb_books_used must be ≥ 1, got {self.sb_books_used}")
        if self.poly_volume_24h is not None and self.poly_volume_24h < 0.0:
            raise ValueError(f"poly_volume_24h must be non-negative, got {self.poly_volume_24h}")
        if self.poly_bid_ask_spread is not None and not (0.0 <= self.poly_bid_ask_spread <= 1.0):
            raise ValueError(
                f"poly_bid_ask_spread must be in [0, 1], got {self.poly_bid_ask_spread}"
            )


@dataclass(frozen=True)
class WeightedSynthesis:
    """Result of synthesizing ML, Sportsbook, and Polymarket probability estimates.

    Attributes:
        final_probs: Weighted-average 1X2 probabilities. Keys: home_win, draw, away_win.
        weights: Adapted weights used. Keys: ml, sb, poly. Values sum to 1.0.
        notes: Human-readable list of adaptation decisions applied.
    """

    final_probs: ProbDict
    weights: dict[str, float]
    notes: list[str]


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------


def _validate_prob_dict(probs: ProbDict, name: str) -> None:
    """Raise ValueError if *probs* is not a valid ProbDict."""
    if set(probs.keys()) != _PROB_KEYS:
        raise ValueError(
            f"{name} must have exactly the keys {{home_win, draw, away_win}}, "
            f"got {set(probs.keys())}"
        )
    total = sum(probs.values())
    if abs(total - 1.0) > 1e-6:
        raise ValueError(f"{name} probabilities must sum to 1.0 (within 1e-6), got {total}")


def _validate_inputs(inputs: WeightInputs) -> None:
    """Validate WeightInputs.

    Validation is also enforced in WeightInputs.__post_init__.
    This function exists for explicit re-validation at API boundaries.
    """
    # Delegates to dataclass validation; any invalid state raises ValueError there.
    # Re-raise with context if somehow bypassed.
    if not (0.0 <= inputs.ml_max_prob <= 1.0):
        raise ValueError(f"ml_max_prob must be in [0, 1], got {inputs.ml_max_prob}")
    if inputs.sb_books_used < 1:
        raise ValueError(f"sb_books_used must be ≥ 1, got {inputs.sb_books_used}")
    if inputs.poly_volume_24h is not None and inputs.poly_volume_24h < 0.0:
        raise ValueError(f"poly_volume_24h must be non-negative, got {inputs.poly_volume_24h}")
    if inputs.poly_bid_ask_spread is not None and not (0.0 <= inputs.poly_bid_ask_spread <= 1.0):
        raise ValueError(f"poly_bid_ask_spread must be in [0, 1], got {inputs.poly_bid_ask_spread}")


# ---------------------------------------------------------------------------
# Core weight computation
# ---------------------------------------------------------------------------


def compute_weights(inputs: WeightInputs) -> tuple[dict[str, float], list[str]]:
    """Compute adaptive weights for ML, Sportsbook, and Polymarket signals.

    Returns:
        A 2-tuple of:
        - weights dict with keys ``ml``, ``sb``, ``poly`` summing to 1.0.
        - notes list of human-readable adaptation decisions.

    Raises:
        ValueError: If inputs contain impossible values.
    """
    _validate_inputs(inputs)
    notes: list[str] = []

    w_ml = BASE_WEIGHTS["ml"]
    w_sb = BASE_WEIGHTS["sb"]

    # ------------------------------------------------------------------
    # Step 1: Polymarket weight
    # ------------------------------------------------------------------
    if not inputs.poly_present:
        # Redistribute poly budget proportionally to ml and sb
        freed = BASE_WEIGHTS["poly"]
        w_ml += freed * _BASE_ML_SB_RATIO
        w_sb += freed * (1.0 - _BASE_ML_SB_RATIO)
        w_poly = 0.0
        notes.append("poly_disabled_no_data")
    else:
        # Volume factor: smooth log ramp from 0 at threshold to 1 at 100x threshold
        vol = inputs.poly_volume_24h
        if vol is None or vol < POLYMARKET_VOLUME_THRESHOLD:
            vol_factor = 0.0
        else:
            # log10(vol / threshold) / 2  -- reaches 1.0 at 100x threshold
            vol_factor = min(1.0, math.log10(vol / POLYMARKET_VOLUME_THRESHOLD) / 2.0)

        # Spread factor: linear decay from 1 (zero spread) to 0 (spread >= 5%)
        spread = inputs.poly_bid_ask_spread
        spread_factor = 0.0 if spread is None or spread > 0.05 else max(0.0, 1.0 - spread / 0.05)

        poly_quality = vol_factor * spread_factor  # in [0, 1]

        raw_w_poly = BASE_WEIGHTS["poly"] * poly_quality
        w_poly = min(POLYMARKET_HARD_CAP, raw_w_poly)

        if vol is not None and vol < POLYMARKET_VOLUME_THRESHOLD:
            notes.append("poly_capped_low_liquidity")
        elif poly_quality < 0.5:
            # Spread killed quality even with sufficient volume
            notes.append("poly_capped_low_liquidity")

        # Redistribute freed poly budget proportionally between ml and sb
        freed = BASE_WEIGHTS["poly"] - w_poly
        w_ml += freed * _BASE_ML_SB_RATIO
        w_sb += freed * (1.0 - _BASE_ML_SB_RATIO)

    # ------------------------------------------------------------------
    # Step 2: Sportsbook books-used multiplier
    # ------------------------------------------------------------------
    sb_factor = min(1.0, inputs.sb_books_used / 5.0)
    if sb_factor < 1.0:
        freed_sb = w_sb * (1.0 - sb_factor)
        w_sb *= sb_factor
        w_ml += freed_sb  # freed budget goes to ml
        notes.append("sb_few_books")

    # ------------------------------------------------------------------
    # Step 3: ML confidence mild down-weighting
    # Only applied (and noted) when confidence is meaningfully below peak.
    # ml_conf=0 at uniform (max_prob≈0.34), ml_conf=1 at perfect certainty.
    # ------------------------------------------------------------------
    ml_conf = max(0.0, (inputs.ml_max_prob - 0.34) / 0.66)
    ml_reliability = max(0.7, 1.0 - 0.3 * (1.0 - ml_conf))
    # Note and redistribute only when confidence is genuinely low (< 90th percentile)
    if ml_conf < 0.9:
        freed_ml = w_ml * (1.0 - ml_reliability)
        w_ml *= ml_reliability
        # Freed ml budget goes to sb (closest reliable signal)
        w_sb += freed_ml
        notes.append("ml_low_confidence")

    # ------------------------------------------------------------------
    # Step 4: Renormalise to ensure exact sum of 1.0
    # ------------------------------------------------------------------
    total = w_ml + w_sb + w_poly
    if total <= 0.0:
        # Fallback: equal split (should be unreachable in practice)
        w_ml, w_sb, w_poly = 1.0 / 3, 1.0 / 3, 1.0 / 3
    else:
        w_ml /= total
        w_sb /= total
        w_poly /= total

    weights: dict[str, float] = {"ml": w_ml, "sb": w_sb, "poly": w_poly}
    return weights, notes


# ---------------------------------------------------------------------------
# Synthesis entry point
# ---------------------------------------------------------------------------


def synthesize(
    ml: ProbDict,
    sb: ProbDict,
    poly: ProbDict | None,
    inputs: WeightInputs,
) -> WeightedSynthesis:
    """Blend ML, Sportsbook, and Polymarket probability estimates into a single output.

    Args:
        ml: Probability dict from the ML layer.
        sb: Probability dict from the Sportsbook consensus layer.
        poly: Probability dict from Polymarket, or None when absent.
        inputs: Quality signals for weight adaptation.

    Returns:
        WeightedSynthesis containing final probabilities, weights, and notes.

    Raises:
        ValueError: If any prob dict is invalid, or if inputs contain impossible values.
    """
    _validate_prob_dict(ml, "ml")
    _validate_prob_dict(sb, "sb")
    if poly is not None:
        _validate_prob_dict(poly, "poly")

    weights, notes = compute_weights(inputs)

    w_ml = weights["ml"]
    w_sb = weights["sb"]
    w_poly = weights["poly"]

    # Weighted average; when poly is None treat its weight as already redistributed
    final_probs: ProbDict = {}
    for key in _PROB_KEYS:
        poly_contrib = (poly[key] * w_poly) if poly is not None else 0.0
        final_probs[key] = ml[key] * w_ml + sb[key] * w_sb + poly_contrib

    # Renormalise final_probs for floating-point safety
    prob_total = sum(final_probs.values())
    if prob_total > 0.0:
        final_probs = {k: v / prob_total for k, v in final_probs.items()}

    return WeightedSynthesis(final_probs=final_probs, weights=weights, notes=notes)
