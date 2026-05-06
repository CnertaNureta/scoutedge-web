"""Prediction-quality metrics for 1X2 football markets.

Used by post-match attribution, walk-forward backtests, calibration analysis,
and the A/B framework.  All implementations use numpy only — no sklearn —
so the computations remain transparent and auditable.
"""

from __future__ import annotations

import numpy as np

# ---------------------------------------------------------------------------
# Types & constants
# ---------------------------------------------------------------------------

ProbDict = dict[str, float]
OUTCOMES: tuple[str, str, str] = ("home_win", "draw", "away_win")

_OUTCOME_SET: frozenset[str] = frozenset(OUTCOMES)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _validate_prob_dict(predicted: ProbDict) -> None:
    """Raise ValueError if *predicted* is not a valid 1X2 probability dict."""
    if set(predicted.keys()) != _OUTCOME_SET:
        raise ValueError(
            f"predicted keys must be exactly {set(OUTCOMES)}, got {set(predicted.keys())}"
        )
    total = sum(predicted.values())
    if abs(total - 1.0) > 1e-6:
        raise ValueError(f"predicted probabilities must sum to 1.0 within 1e-6, got {total}")


def _validate_actual(actual: str) -> None:
    """Raise ValueError if *actual* is not a recognised outcome."""
    if actual not in _OUTCOME_SET:
        raise ValueError(f"actual must be one of {OUTCOMES}, got {actual!r}")


def _validate_lists(predicted: list[ProbDict], actual: list[str]) -> None:
    """Raise ValueError on empty input or length mismatch."""
    if len(predicted) == 0 or len(actual) == 0:
        raise ValueError("predicted and actual must be non-empty")
    if len(predicted) != len(actual):
        raise ValueError(
            f"predicted and actual must have equal length, got {len(predicted)} vs {len(actual)}"
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def brier_score_multiclass(predicted: ProbDict, actual: str) -> float:
    """Multiclass Brier score (sum of squared deviations across all 3 classes).

    Range [0, 2].  Lower is better.

    Parameters
    ----------
    predicted:
        A dict with keys exactly ``{"home_win", "draw", "away_win"}`` whose
        values are non-negative and sum to 1.0 within 1e-6.
    actual:
        The realised outcome; must be one of ``OUTCOMES``.

    Returns
    -------
    float
        Brier score in [0, 2].

    Raises
    ------
    ValueError
        If *predicted* keys/sum are invalid, or *actual* is not in OUTCOMES.
    """
    _validate_prob_dict(predicted)
    _validate_actual(actual)

    score: float = 0.0
    for outcome in OUTCOMES:
        p = predicted[outcome]
        o = 1.0 if outcome == actual else 0.0
        score += (p - o) ** 2
    return score


def log_loss(predicted: ProbDict, actual: str, *, eps: float = 1e-15) -> float:
    """Negative log-likelihood of the actual outcome.

    Range [0, +inf).  Lower is better.  Clips the predicted probability to
    ``[eps, 1 - eps]`` for numerical stability.

    Parameters
    ----------
    predicted:
        A valid 1X2 probability dict.
    actual:
        The realised outcome.
    eps:
        Small value used for clipping to avoid log(0).

    Returns
    -------
    float
        Non-negative log loss.

    Raises
    ------
    ValueError
        If *predicted* is invalid or *actual* is not in OUTCOMES.
    """
    _validate_prob_dict(predicted)
    _validate_actual(actual)

    p = float(np.clip(predicted[actual], eps, 1.0 - eps))
    return -float(np.log(p))


def expected_calibration_error(
    predicted: list[ProbDict],
    actual: list[str],
    *,
    n_bins: int = 10,
) -> float:
    """Expected Calibration Error (ECE).

    Evaluated on the predicted probability of the *predicted-most-likely*
    outcome for each match.  Bins are uniform in [0, 1]; each bin contributes
    ``(bin_size / n) * |mean_predicted - empirical_correct|``.

    Parameters
    ----------
    predicted:
        List of valid 1X2 probability dicts.
    actual:
        List of realised outcomes, same length as *predicted*.
    n_bins:
        Number of equal-width bins in [0, 1].

    Returns
    -------
    float
        ECE in [0, 1].

    Raises
    ------
    ValueError
        On length mismatch, empty input, or invalid dicts / outcomes.
    """
    _validate_lists(predicted, actual)

    n = len(predicted)
    top_probs = np.empty(n, dtype=np.float64)
    correct = np.empty(n, dtype=np.float64)

    for i, (pred_dict, act) in enumerate(zip(predicted, actual, strict=True)):
        _validate_prob_dict(pred_dict)
        _validate_actual(act)
        top_outcome = max(pred_dict, key=lambda k: pred_dict[k])
        top_probs[i] = pred_dict[top_outcome]
        correct[i] = 1.0 if top_outcome == act else 0.0

    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    ece: float = 0.0

    for b in range(n_bins):
        lo, hi = bin_edges[b], bin_edges[b + 1]
        if b < n_bins - 1:
            mask = (top_probs >= lo) & (top_probs < hi)
        else:
            # Include right edge in the last bin
            mask = (top_probs >= lo) & (top_probs <= hi)

        bin_size = int(mask.sum())
        if bin_size == 0:
            continue
        mean_pred = float(top_probs[mask].mean())
        empirical = float(correct[mask].mean())
        ece += (bin_size / n) * abs(mean_pred - empirical)

    return ece


def reliability_curve(
    predicted: list[ProbDict],
    actual: list[str],
    *,
    n_bins: int = 10,
) -> tuple[
    np.ndarray[tuple[int], np.dtype[np.float64]],
    np.ndarray[tuple[int], np.dtype[np.float64]],
    np.ndarray[tuple[int], np.dtype[np.int64]],
]:
    """Reliability (calibration) curve for the most-likely predicted outcome.

    Parameters
    ----------
    predicted:
        List of valid 1X2 probability dicts.
    actual:
        List of realised outcomes, same length as *predicted*.
    n_bins:
        Number of equal-width bins in [0, 1].

    Returns
    -------
    bin_mean_predicted : np.ndarray, shape (n_bins,)
        Mean predicted probability in each bin; NaN where bin is empty.
    bin_empirical_correct : np.ndarray, shape (n_bins,)
        Fraction of correct predictions in each bin; NaN where empty.
    bin_count : np.ndarray, shape (n_bins,)
        Number of samples in each bin.

    Raises
    ------
    ValueError
        On length mismatch, empty input, or invalid inputs.
    """
    _validate_lists(predicted, actual)

    n = len(predicted)
    top_probs = np.empty(n, dtype=np.float64)
    correct = np.empty(n, dtype=np.float64)

    for i, (pred_dict, act) in enumerate(zip(predicted, actual, strict=True)):
        _validate_prob_dict(pred_dict)
        _validate_actual(act)
        top_outcome = max(pred_dict, key=lambda k: pred_dict[k])
        top_probs[i] = pred_dict[top_outcome]
        correct[i] = 1.0 if top_outcome == act else 0.0

    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    bin_mean_predicted = np.full(n_bins, np.nan)
    bin_empirical_correct = np.full(n_bins, np.nan)
    bin_count = np.zeros(n_bins, dtype=np.int64)

    for b in range(n_bins):
        lo, hi = bin_edges[b], bin_edges[b + 1]
        if b < n_bins - 1:
            mask = (top_probs >= lo) & (top_probs < hi)
        else:
            mask = (top_probs >= lo) & (top_probs <= hi)

        bin_size = int(mask.sum())
        bin_count[b] = bin_size
        if bin_size > 0:
            bin_mean_predicted[b] = float(top_probs[mask].mean())
            bin_empirical_correct[b] = float(correct[mask].mean())

    return bin_mean_predicted, bin_empirical_correct, bin_count


def aggregate_brier(
    predicted: list[ProbDict],
    actual: list[str],
) -> dict[str, float]:
    """Aggregate Brier score statistics over a collection of predictions.

    Parameters
    ----------
    predicted:
        List of valid 1X2 probability dicts.
    actual:
        List of realised outcomes, same length as *predicted*.

    Returns
    -------
    dict with keys:
        ``mean``   - arithmetic mean Brier score
        ``median`` - median Brier score
        ``p25``    - 25th-percentile Brier score
        ``p75``    - 75th-percentile Brier score
        ``n``      - number of predictions (stored as float for type uniformity)

    Raises
    ------
    ValueError
        On length mismatch, empty input, or invalid inputs.
    """
    _validate_lists(predicted, actual)

    scores = np.array(
        [brier_score_multiclass(p, a) for p, a in zip(predicted, actual, strict=True)],
        dtype=np.float64,
    )

    return {
        "mean": float(np.mean(scores)),
        "median": float(np.median(scores)),
        "p25": float(np.percentile(scores, 25)),
        "p75": float(np.percentile(scores, 75)),
        "n": float(len(scores)),
    }
