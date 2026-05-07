"""Post-hoc analysis module for the ScoutEdge WC2026 A/B experiment (task P7.5).

Computes per-group Brier scores, accuracy, pairwise mean differences, and
paired t-test p-values over the full set of collected :class:`ABRunResult`
records.

Typical usage::

    from scoutedge_intelligence.experiments.analysis import analyse
    from scoutedge_intelligence.experiments.ab_runner import ABRunResult

    report = analyse(runs, actuals, significance_alpha=0.05)
    print(report.winner)
"""

from __future__ import annotations

import structlog
from pydantic import BaseModel
from scipy import stats

from scoutedge_intelligence.audit.metrics import brier_score_multiclass
from scoutedge_intelligence.experiments.ab_runner import ABRunResult, GroupResult

logger: structlog.BoundLogger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------

_GROUPS: tuple[str, str, str] = ("A", "B", "C")
_PAIRS: tuple[str, str, str] = ("A_vs_B", "A_vs_C", "B_vs_C")


class AnalysisReport(BaseModel):
    """Summary report of the A/B experiment.

    Attributes
    ----------
    n_matches:
        Number of completed matches included in the analysis.
    group_brier:
        Mean multiclass Brier score per group (lower is better).
    group_accuracy:
        Fraction of matches where the group's argmax prediction matched the
        actual outcome.
    pairwise_diff:
        Mean Brier difference for each pair of groups.  A positive value means
        the first group has a *higher* (worse) mean Brier than the second.
    pairwise_p_value:
        Two-sided paired t-test p-value for each pair's Brier difference.
    winner:
        Label of the group with the lowest mean Brier score, provided its
        p-value vs the next-best group is below ``significance_alpha``.
        ``None`` when the result is not statistically significant.
    """

    n_matches: int
    group_brier: dict[str, float]
    group_accuracy: dict[str, float]
    pairwise_diff: dict[str, float]
    pairwise_p_value: dict[str, float]
    winner: str | None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _extract_probs(result: GroupResult) -> dict[str, float]:
    """Return the probability dict from a GroupResult."""
    return result.probs


def _argmax_outcome(probs: dict[str, float]) -> str:
    """Return the outcome with the highest probability."""
    return max(probs, key=lambda k: probs[k])


def _compute_brier_scores(
    runs: list[ABRunResult],
    actuals: list[str],
    group: str,
) -> list[float]:
    """Compute per-match Brier scores for a single group.

    Parameters
    ----------
    runs:
        All ABRunResult records.
    actuals:
        Actual outcomes aligned with *runs*.
    group:
        One of ``"A"``, ``"B"``, ``"C"``.

    Returns
    -------
    list[float]
        One Brier score per match, same order as *runs*.
    """
    scores: list[float] = []
    for run, actual in zip(runs, actuals, strict=True):
        group_result: GroupResult = getattr(run, f"group_{group.lower()}")
        probs = _extract_probs(group_result)
        scores.append(brier_score_multiclass(probs, actual))
    return scores


def _compute_accuracy(
    runs: list[ABRunResult],
    actuals: list[str],
    group: str,
) -> float:
    """Compute argmax prediction accuracy for a single group.

    Parameters
    ----------
    runs:
        All ABRunResult records.
    actuals:
        Actual outcomes aligned with *runs*.
    group:
        One of ``"A"``, ``"B"``, ``"C"``.

    Returns
    -------
    float
        Fraction of matches correctly predicted (0.0 - 1.0).
    """
    correct = 0
    for run, actual in zip(runs, actuals, strict=True):
        group_result: GroupResult = getattr(run, f"group_{group.lower()}")
        probs = _extract_probs(group_result)
        if _argmax_outcome(probs) == actual:
            correct += 1
    return correct / len(runs)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def analyse(
    runs: list[ABRunResult],
    actuals: list[str],
    *,
    significance_alpha: float = 0.05,
) -> AnalysisReport:
    """Compute Brier per group, accuracy, pairwise differences, and t-test p-values.

    Uses ``scipy.stats.ttest_rel`` for paired two-sided t-tests on per-match
    Brier score arrays.  The *winner* is the group with the lowest mean Brier
    IFF its p-value against the next-best group is below *significance_alpha*;
    otherwise ``winner`` is ``None``.

    Parameters
    ----------
    runs:
        List of :class:`ABRunResult` records, one per completed match.
    actuals:
        Observed outcomes — each must be one of ``OUTCOMES`` (``"home_win"``,
        ``"draw"``, ``"away_win"``).  Must be the same length as *runs*.
    significance_alpha:
        Significance threshold for declaring a winner.  Defaults to ``0.05``.

    Returns
    -------
    AnalysisReport
        Full summary of Brier scores, accuracy, pairwise statistics, and
        winner determination.

    Raises
    ------
    ValueError
        If *runs* is empty, *actuals* is empty, or the two lists differ in
        length.
    """
    if not runs or not actuals:
        raise ValueError("runs and actuals must both be non-empty")
    if len(runs) != len(actuals):
        raise ValueError(
            f"runs and actuals must have equal length, got {len(runs)} vs {len(actuals)}"
        )

    n = len(runs)
    log = logger.bind(n_matches=n, significance_alpha=significance_alpha)
    log.info("ab_analysis.start")

    # --- Brier score arrays per group ------------------------------------
    brier_a = _compute_brier_scores(runs, actuals, "A")
    brier_b = _compute_brier_scores(runs, actuals, "B")
    brier_c = _compute_brier_scores(runs, actuals, "C")

    group_scores: dict[str, list[float]] = {"A": brier_a, "B": brier_b, "C": brier_c}

    # --- Mean Brier per group -------------------------------------------
    group_brier: dict[str, float] = {
        g: sum(scores) / len(scores) for g, scores in group_scores.items()
    }

    # --- Accuracy per group ---------------------------------------------
    group_accuracy: dict[str, float] = {g: _compute_accuracy(runs, actuals, g) for g in _GROUPS}

    # --- Pairwise mean Brier difference and paired t-test ---------------
    pairs: dict[str, tuple[str, str]] = {
        "A_vs_B": ("A", "B"),
        "A_vs_C": ("A", "C"),
        "B_vs_C": ("B", "C"),
    }

    pairwise_diff: dict[str, float] = {}
    pairwise_p_value: dict[str, float] = {}

    for pair_key, (g1, g2) in pairs.items():
        scores1 = group_scores[g1]
        scores2 = group_scores[g2]

        diff_mean = (sum(scores1) / n) - (sum(scores2) / n)
        pairwise_diff[pair_key] = diff_mean

        if n < 2:
            # t-test is undefined for n=1; fall back to p=1.0
            pairwise_p_value[pair_key] = 1.0
        else:
            result = stats.ttest_rel(scores1, scores2)
            pairwise_p_value[pair_key] = float(result.pvalue)

    # --- Winner determination -------------------------------------------
    winner = _determine_winner(group_brier, pairwise_p_value, significance_alpha)

    log.info(
        "ab_analysis.done",
        group_brier=group_brier,
        winner=winner,
    )

    return AnalysisReport(
        n_matches=n,
        group_brier=group_brier,
        group_accuracy=group_accuracy,
        pairwise_diff=pairwise_diff,
        pairwise_p_value=pairwise_p_value,
        winner=winner,
    )


def _determine_winner(
    group_brier: dict[str, float],
    pairwise_p_value: dict[str, float],
    significance_alpha: float,
) -> str | None:
    """Return the winning group label, or None if not significant.

    The winner is the group with the lowest mean Brier score, provided its
    paired t-test p-value against the *next*-best group is below
    *significance_alpha*.

    Parameters
    ----------
    group_brier:
        Mean Brier per group.
    pairwise_p_value:
        Paired t-test p-values for all three group pairs.
    significance_alpha:
        Threshold for statistical significance.

    Returns
    -------
    str or None
        Group label or ``None``.
    """
    # Sort groups by ascending Brier (lower is better)
    ranked: list[str] = sorted(group_brier, key=lambda g: group_brier[g])
    best = ranked[0]
    second = ranked[1]

    # Build the canonical pair key
    pair_key = (
        f"{best}_vs_{second}"
        if (best, second) in [("A", "B"), ("A", "C"), ("B", "C")]
        else f"{second}_vs_{best}"
    )

    p_value = pairwise_p_value.get(pair_key, 1.0)

    if p_value < significance_alpha:
        return best
    return None
