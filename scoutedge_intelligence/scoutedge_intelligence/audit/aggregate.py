"""Weekly/monthly aggregation of per-match attribution reports.

Produces an :class:`AggregateReport` that summarises prediction quality,
risk-factor hit-rates, and diagnosis quality across a collection of
:class:`~scoutedge_intelligence.audit.attribution.AttributionReport` objects.

All functions are pure: no I/O, no DB access, no SDK calls.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from scoutedge_intelligence.audit.attribution import AttributionReport

__all__ = [
    "AggregateReport",
    "build_aggregate_report",
]


# ---------------------------------------------------------------------------
# Result schema
# ---------------------------------------------------------------------------


class AggregateReport(BaseModel):
    """Rolled-up summary across many :class:`AttributionReport` instances.

    All rate/average fields default to ``None`` when there is no data to
    aggregate (e.g., no matches with a risk factor).
    """

    period_start: datetime
    period_end: datetime

    n_matches: int
    n_finished: int  # all reports passed in are treated as finished matches

    # Mean Brier per layer across all reports.  Keyed by "ml", "sb", "poly"
    # (poly only present when at least one report includes it).
    layer_mean_brier: dict[str, float]

    final_accuracy: float  # fraction of final_correct == True
    final_top1_count: int  # raw count of correct top-1 picks

    risk_factor_hit_rate: float | None  # None when no report has a risk factor
    diagnosis_invocation_rate: float | None  # fraction of reports with diagnosis data
    diagnosis_quality_avg: float | None  # mean quality_score where diagnosis present


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def build_aggregate_report(
    reports: list[AttributionReport],
    period_start: datetime,
    period_end: datetime,
) -> AggregateReport:
    """Aggregate a list of attribution reports into a summary.

    Period filtering is *not* enforced — the caller is responsible for passing
    in the relevant subset.  ``period_start`` and ``period_end`` are stamped
    verbatim onto the result.

    Parameters
    ----------
    reports:
        Attribution reports produced by
        :func:`~scoutedge_intelligence.audit.attribution.generate_attribution`.
    period_start:
        Inclusive start of the reporting window (informational only).
    period_end:
        Inclusive end of the reporting window (informational only).

    Returns
    -------
    AggregateReport
        Fully populated aggregate.  When *reports* is empty all count fields
        are 0, all rates/averages are ``None``, and ``layer_mean_brier`` is an
        empty dict.
    """
    n = len(reports)

    if n == 0:
        return AggregateReport(
            period_start=period_start,
            period_end=period_end,
            n_matches=0,
            n_finished=0,
            layer_mean_brier={},
            final_accuracy=0.0,
            final_top1_count=0,
            risk_factor_hit_rate=None,
            diagnosis_invocation_rate=None,
            diagnosis_quality_avg=None,
        )

    # --- Layer mean Brier ------------------------------------------------------
    # Accumulate per-layer totals; handle poly which may be absent on some.
    layer_totals: dict[str, float] = {}
    layer_counts: dict[str, int] = {}
    for report in reports:
        for layer, score in report.layer_brier.items():
            layer_totals[layer] = layer_totals.get(layer, 0.0) + score
            layer_counts[layer] = layer_counts.get(layer, 0) + 1

    layer_mean_brier: dict[str, float] = {
        layer: layer_totals[layer] / layer_counts[layer] for layer in layer_totals
    }

    # --- Final accuracy --------------------------------------------------------
    top1_count = sum(1 for r in reports if r.final_correct)
    final_accuracy = top1_count / n

    # --- Risk factor hit rate --------------------------------------------------
    rf_reports = [r for r in reports if r.risk_factor_text is not None]
    if rf_reports:
        hits = sum(1 for r in rf_reports if r.risk_factor_hit is True)
        risk_factor_hit_rate: float | None = hits / len(rf_reports)
    else:
        risk_factor_hit_rate = None

    # --- Diagnosis metrics -----------------------------------------------------
    diag_reports = [r for r in reports if r.diagnosis_quality_score is not None]
    if diag_reports:
        diagnosis_invocation_rate: float | None = len(diag_reports) / n
        # diagnosis_quality_score is guaranteed non-None inside diag_reports.
        diag_scores: list[float] = [
            r.diagnosis_quality_score  # type: ignore[misc]
            for r in diag_reports
        ]
        diagnosis_quality_avg: float | None = sum(diag_scores) / len(diag_reports)
    else:
        diagnosis_invocation_rate = None
        diagnosis_quality_avg = None

    return AggregateReport(
        period_start=period_start,
        period_end=period_end,
        n_matches=n,
        n_finished=n,
        layer_mean_brier=layer_mean_brier,
        final_accuracy=final_accuracy,
        final_top1_count=top1_count,
        risk_factor_hit_rate=risk_factor_hit_rate,
        diagnosis_invocation_rate=diagnosis_invocation_rate,
        diagnosis_quality_avg=diagnosis_quality_avg,
    )
