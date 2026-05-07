"""Divergence features for the ScoutEdge WC2026 triple-layer synthesis (task P3.1).

Quantifies disagreement between three probability sources:
  - ML model output
  - Sportsbook implied probabilities
  - Polymarket prediction-market prices

The feature dict produced by ``compute_divergence_features`` is consumed by the
synthesis layer and the downstream Claude Analyst to answer:
  * "Do these three sources agree?"
  * "If not, where is the gap and how large is it?"
"""

from __future__ import annotations

import math

import numpy as np

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

ProbDict = dict[str, float]
"""Keys: home_win, draw, away_win — values must sum to 1.0 within 1e-6."""

_OUTCOMES: tuple[str, str, str] = ("home_win", "draw", "away_win")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_PROB_SUM_TOL: float = 1e-6
"""Maximum allowed deviation from 1.0 when validating a ProbDict."""

_KL_EPS: float = 1e-12
"""Additive epsilon to avoid log(0) in KL divergence."""

DIVERGENCE_GAP_THRESHOLD: float = 0.10
"""Absolute per-outcome gap that triggers a signal in ``triggered_signals``."""

_POLY_MIN_VOLUME: float = 10_000.0
"""Minimum 24-h Polymarket volume (USD) for the market to be considered reliable."""

_POLY_MAX_SPREAD: float = 0.03
"""Maximum bid-ask spread for the Polymarket market to be considered reliable."""

_POLY_LIQUIDITY_VOLUME_THRESHOLD: float = 10_000.0
"""Volume below this threshold triggers the 'PM_LIQUIDITY_LOW' signal."""


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def _validate(p: ProbDict, name: str = "p") -> None:
    """Raise ``ValueError`` if *p* is missing required keys or does not sum to 1."""
    for key in _OUTCOMES:
        if key not in p:
            raise ValueError(f"ProbDict '{name}' is missing key '{key}'.")
    total = sum(p[k] for k in _OUTCOMES)
    if not math.isclose(total, 1.0, abs_tol=_PROB_SUM_TOL):
        raise ValueError(f"ProbDict '{name}' must sum to 1.0 (got {total:.8f}).")


def _arr(p: ProbDict) -> np.ndarray[tuple[int], np.dtype[np.float64]]:
    """Return an ordered numpy array [home_win, draw, away_win] from a ProbDict."""
    return np.array([p[k] for k in _OUTCOMES], dtype=np.float64)


# ---------------------------------------------------------------------------
# Core divergence primitives
# ---------------------------------------------------------------------------


def kl_divergence(p: ProbDict, q: ProbDict) -> float:
    """Directional KL divergence KL(p ‖ q).

    Uses the natural logarithm and an additive epsilon of 1e-12 to guard
    against log(0).  The result is *not* symmetric.

    Parameters
    ----------
    p:
        Reference distribution.
    q:
        Approximate distribution.

    Returns
    -------
    float
        KL(p ‖ q) = Σ p_i · ln(p_i / q_i).

    Raises
    ------
    ValueError
        If either distribution does not sum to 1.0 within 1e-6.
    """
    _validate(p, "p")
    _validate(q, "q")
    pv = _arr(p) + _KL_EPS
    qv = _arr(q) + _KL_EPS
    return float(np.sum(pv * np.log(pv / qv)))


def js_divergence(p: ProbDict, q: ProbDict) -> float:
    """Jensen-Shannon divergence (symmetric, bounded in [0, ln 2]).

    JSD(p, q) = 0.5 · KL(p ‖ m) + 0.5 · KL(q ‖ m) where m = 0.5·(p + q).

    Parameters
    ----------
    p:
        First distribution.
    q:
        Second distribution.

    Returns
    -------
    float
        JSD in [0, ln(2)] using natural logarithm.

    Raises
    ------
    ValueError
        If either distribution does not sum to 1.0 within 1e-6.
    """
    _validate(p, "p")
    _validate(q, "q")
    pv = _arr(p) + _KL_EPS
    qv = _arr(q) + _KL_EPS
    mv = 0.5 * (pv + qv)
    kl_pm = float(np.sum(pv * np.log(pv / mv)))
    kl_qm = float(np.sum(qv * np.log(qv / mv)))
    return 0.5 * kl_pm + 0.5 * kl_qm


def max_pairwise_gap(p: ProbDict, q: ProbDict) -> float:
    """Maximum absolute per-outcome difference between two distributions.

    max_outcome |p[o] - q[o]| across the three match outcomes.

    Parameters
    ----------
    p:
        First distribution.
    q:
        Second distribution.

    Returns
    -------
    float
        Maximum absolute gap in [0, 1].

    Raises
    ------
    ValueError
        If either distribution does not sum to 1.0 within 1e-6.
    """
    _validate(p, "p")
    _validate(q, "q")
    return float(np.max(np.abs(_arr(p) - _arr(q))))


def consensus_flag(probs: list[ProbDict], tol: float = 0.05) -> bool:
    """Return True iff every pairwise max_pairwise_gap among *probs* is below *tol*.

    Parameters
    ----------
    probs:
        List of ProbDicts to compare.  Must contain at least two distributions.
    tol:
        Gap threshold.  Default 0.05.

    Returns
    -------
    bool
        True when all pairs agree within *tol*.

    Raises
    ------
    ValueError
        If any distribution does not sum to 1.0 within 1e-6, or if fewer than
        two distributions are provided.
    """
    if len(probs) < 2:
        raise ValueError("consensus_flag requires at least two ProbDicts.")
    for i, p in enumerate(probs):
        _validate(p, f"probs[{i}]")
    for i in range(len(probs)):
        for j in range(i + 1, len(probs)):
            if max_pairwise_gap(probs[i], probs[j]) >= tol:
                return False
    return True


# ---------------------------------------------------------------------------
# Full feature computation
# ---------------------------------------------------------------------------


def compute_divergence_features(
    ml: ProbDict,
    sb: ProbDict,
    poly: ProbDict | None,
    *,
    poly_volume_24h: float | None = None,
    poly_bid_ask_spread: float | None = None,
) -> dict[str, object]:
    """Compute all divergence features for the synthesis layer.

    Parameters
    ----------
    ml:
        ML model probability distribution.
    sb:
        Sportsbook implied probability distribution.
    poly:
        Polymarket probability distribution.  Pass ``None`` when unavailable.
    poly_volume_24h:
        Polymarket 24-hour trading volume in USD.  ``None`` if unavailable.
    poly_bid_ask_spread:
        Polymarket aggregate bid-ask spread.  ``None`` if unavailable.

    Returns
    -------
    dict
        Feature dictionary with the following keys:

        **KL divergences** (directional, natural log):
          ``kl_ml_sb``, ``kl_sb_ml``, ``kl_ml_poly``, ``kl_poly_ml``,
          ``kl_sb_poly``, ``kl_poly_sb``

        **Jensen-Shannon divergences** (symmetric):
          ``js_ml_sb``, ``js_ml_poly``, ``js_sb_poly``

        **Aggregates**:
          ``max_pairwise_kl`` — max of all finite KL values,
          ``max_pairwise_js`` — max of all finite JS values,
          ``max_pairwise_gap`` — max per-outcome absolute gap across all pairs,
          ``consensus_flag`` (bool, tol=0.05),
          ``three_way_agreement_score`` = 1.0 - max_pairwise_js  in [0, 1],
          ``three_way_entropy`` = max_pairwise_js (proxy entropy),
          ``polymarket_reliable`` (bool)

        **Triggered signals** (``list[str]``):
          ``'ML_SB_HOME_GAP'``, ``'ML_SB_DRAW_GAP'``, ``'ML_SB_AWAY_WIN_GAP'``,
          ``'SB_PM_HOME_GAP'``, ``'SB_PM_DRAW_GAP'``, ``'SB_PM_AWAY_WIN_GAP'``,
          ``'ML_PM_HOME_GAP'``, ``'ML_PM_DRAW_GAP'``, ``'ML_PM_AWAY_WIN_GAP'``,
          ``'PM_LIQUIDITY_LOW'``

        When *poly* is ``None`` all ``*_poly*`` metrics are ``np.nan``.

    Raises
    ------
    ValueError
        If any provided distribution does not sum to 1.0 within 1e-6.
    """
    _validate(ml, "ml")
    _validate(sb, "sb")
    if poly is not None:
        _validate(poly, "poly")

    nan = float("nan")

    # ------------------------------------------------------------------
    # KL divergences
    # ------------------------------------------------------------------
    kl_ml_sb = kl_divergence(ml, sb)
    kl_sb_ml = kl_divergence(sb, ml)

    if poly is not None:
        kl_ml_poly: float = kl_divergence(ml, poly)
        kl_poly_ml: float = kl_divergence(poly, ml)
        kl_sb_poly: float = kl_divergence(sb, poly)
        kl_poly_sb: float = kl_divergence(poly, sb)
    else:
        kl_ml_poly = kl_poly_ml = kl_sb_poly = kl_poly_sb = nan

    # ------------------------------------------------------------------
    # JS divergences
    # ------------------------------------------------------------------
    js_ml_sb = js_divergence(ml, sb)

    if poly is not None:
        js_ml_poly: float = js_divergence(ml, poly)
        js_sb_poly: float = js_divergence(sb, poly)
    else:
        js_ml_poly = js_sb_poly = nan

    # ------------------------------------------------------------------
    # Aggregates
    # ------------------------------------------------------------------
    kl_values = [kl_ml_sb, kl_sb_ml, kl_ml_poly, kl_poly_ml, kl_sb_poly, kl_poly_sb]
    finite_kl = [v for v in kl_values if not math.isnan(v)]
    max_pairwise_kl: float = max(finite_kl) if finite_kl else nan

    js_values = [js_ml_sb, js_ml_poly, js_sb_poly]
    finite_js = [v for v in js_values if not math.isnan(v)]
    max_pairwise_js_val: float = max(finite_js) if finite_js else nan

    # max_pairwise_gap over all available pairs
    gap_ml_sb = max_pairwise_gap(ml, sb)
    gap_candidates: list[float] = [gap_ml_sb]
    if poly is not None:
        gap_candidates.append(max_pairwise_gap(ml, poly))
        gap_candidates.append(max_pairwise_gap(sb, poly))
    overall_max_gap: float = max(gap_candidates)

    # consensus (use only available distributions)
    available_probs: list[ProbDict] = [ml, sb] + ([poly] if poly is not None else [])
    consensus: bool = consensus_flag(available_probs, tol=0.05)

    agreement_score: float = (
        1.0 - max_pairwise_js_val if not math.isnan(max_pairwise_js_val) else nan
    )

    # ------------------------------------------------------------------
    # Polymarket reliability
    # ------------------------------------------------------------------
    poly_reliable: bool = (
        poly is not None
        and poly_volume_24h is not None
        and poly_bid_ask_spread is not None
        and poly_volume_24h >= _POLY_MIN_VOLUME
        and poly_bid_ask_spread <= _POLY_MAX_SPREAD
    )

    # ------------------------------------------------------------------
    # Triggered signals
    # ------------------------------------------------------------------
    signals: list[str] = []

    _signal_pairs: list[tuple[str, ProbDict, ProbDict]] = [
        ("ML_SB", ml, sb),
    ]
    if poly is not None:
        _signal_pairs.append(("SB_PM", sb, poly))
        _signal_pairs.append(("ML_PM", ml, poly))

    _outcome_labels: dict[str, str] = {
        "home_win": "HOME_GAP",
        "draw": "DRAW_GAP",
        "away_win": "AWAY_WIN_GAP",
    }

    for pair_label, pa, pb in _signal_pairs:
        for outcome, signal_suffix in _outcome_labels.items():
            if abs(pa[outcome] - pb[outcome]) > DIVERGENCE_GAP_THRESHOLD:
                signals.append(f"{pair_label}_{signal_suffix}")

    if poly_volume_24h is not None and poly_volume_24h < _POLY_LIQUIDITY_VOLUME_THRESHOLD:
        signals.append("PM_LIQUIDITY_LOW")

    # ------------------------------------------------------------------
    # Assemble output
    # ------------------------------------------------------------------
    return {
        "kl_ml_sb": kl_ml_sb,
        "kl_sb_ml": kl_sb_ml,
        "kl_ml_poly": kl_ml_poly,
        "kl_poly_ml": kl_poly_ml,
        "kl_sb_poly": kl_sb_poly,
        "kl_poly_sb": kl_poly_sb,
        "js_ml_sb": js_ml_sb,
        "js_ml_poly": js_ml_poly,
        "js_sb_poly": js_sb_poly,
        "max_pairwise_kl": max_pairwise_kl,
        "max_pairwise_js": max_pairwise_js_val,
        "max_pairwise_gap": overall_max_gap,
        "consensus_flag": consensus,
        "three_way_agreement_score": agreement_score,
        "polymarket_reliable": poly_reliable,
        "triggered_signals": signals,
        "three_way_entropy": max_pairwise_js_val,
    }
