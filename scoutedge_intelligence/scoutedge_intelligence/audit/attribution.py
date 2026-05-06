"""Post-match attribution generator for ScoutEdge WC2026.

Produces a fully-populated :class:`AttributionReport` from a finished match's
predicted probabilities and the realised outcome.  The function is intentionally
pure: no I/O, no database calls, no SDK invocations.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel

from scoutedge_intelligence.audit.metrics import (
    OUTCOMES,
    ProbDict,
    brier_score_multiclass,
    log_loss,
)

# ---------------------------------------------------------------------------
# Public type aliases re-exported for downstream callers
# ---------------------------------------------------------------------------

__all__ = [
    "AttributionInput",
    "AttributionReport",
    "ProbDict",
    "generate_attribution",
]


# ---------------------------------------------------------------------------
# Result schema
# ---------------------------------------------------------------------------


class AttributionReport(BaseModel):
    """Structured per-match attribution result.

    All metric fields use the naming conventions from
    :mod:`scoutedge_intelligence.audit.metrics` (lower is better for Brier and
    log-loss).
    """

    match_id: str
    actual_outcome: str
    final_predicted_winner: str
    final_brier: float

    # Layer-level metrics — "poly" key is absent when poly layer was not supplied.
    layer_brier: dict[str, float]
    layer_log_loss: dict[str, float]

    final_correct: bool

    # Risk-factor evaluation
    risk_factor_text: str | None
    risk_factor_hit: bool | None  # None when risk_factor_text is None

    # Diagnosis quality
    diagnosis_directional_correct: bool | None
    diagnosis_edge_realized: bool | None
    diagnosis_quality_score: float | None  # 0..1; None when diagnosis is absent

    audit_completed_at: datetime


# ---------------------------------------------------------------------------
# Input schema
# ---------------------------------------------------------------------------


class AttributionInput(BaseModel):
    """All data required to produce a single :class:`AttributionReport`."""

    match_id: str
    actual_outcome: str
    actual_home_score: int
    actual_away_score: int

    final_probs: ProbDict
    ml_probs: ProbDict
    sb_probs: ProbDict
    poly_probs: ProbDict | None = None

    risk_factor_text: str | None = None
    diagnosis: dict[str, Any] | None = None


# ---------------------------------------------------------------------------
# Core logic
# ---------------------------------------------------------------------------


def _argmax(probs: ProbDict) -> str:
    """Return the outcome with the highest predicted probability."""
    return max(probs, key=lambda k: probs[k])


def _evaluate_risk_factor(
    risk_factor_text: str | None,
    actual_outcome: str,
    ml_probs: ProbDict,
) -> bool | None:
    """Determine whether the predicted risk factor materialised.

    Returns
    -------
    None
        When *risk_factor_text* is ``None`` (no risk factor was flagged).
    True
        When a risk factor was flagged **and** the actual outcome was the
        ML underdog (i.e. ``actual_outcome != argmax(ml_probs)``).
    False
        When a risk factor was flagged but the ML favourite won.
    """
    if risk_factor_text is None:
        return None
    ml_favourite = _argmax(ml_probs)
    return actual_outcome != ml_favourite


def _evaluate_diagnosis(
    diagnosis: dict[str, Any] | None,
    layer_brier: dict[str, float],
    ml_brier: float,
    final_brier: float,
) -> tuple[bool | None, bool | None, float | None]:
    """Compute the three diagnosis quality fields.

    Parameters
    ----------
    diagnosis:
        The raw diagnosis dict from the analyst output, or ``None``.
    layer_brier:
        Per-layer Brier scores keyed by ``"ml"``, ``"sb"``, and optionally
        ``"poly"``.
    ml_brier:
        Pre-extracted ML layer Brier score (convenience alias).
    final_brier:
        Brier score of the blended final layer.

    Returns
    -------
    tuple of (directional_correct, edge_realized, quality_score)
        All three are ``None`` when *diagnosis* is ``None``.
    """
    if diagnosis is None:
        return None, None, None

    # --- directional_correct ---------------------------------------------------
    # The diagnosis field "most_trustworthy_source" names the layer the analyst
    # trusts most.  The claim is directionally correct if that layer actually
    # achieved the lowest Brier score among {ml, sb, poly}.
    most_trusted: str | None = diagnosis.get("most_trustworthy_source")
    if most_trusted is not None and most_trusted in layer_brier:
        best_layer = min(layer_brier, key=lambda k: layer_brier[k])
        directional_correct: bool | None = most_trusted == best_layer
    else:
        # Cannot evaluate if the field is absent or names an unknown layer.
        directional_correct = None

    # --- edge_realized ---------------------------------------------------------
    # True when the blended final layer beats raw ML alone.
    edge_realized: bool = final_brier < ml_brier

    # --- quality_score ---------------------------------------------------------
    if directional_correct is None:
        # Partial evaluation: weight only the edge signal.
        quality_score: float | None = 0.5 * float(edge_realized)
    else:
        quality_score = 0.5 * float(directional_correct) + 0.5 * float(edge_realized)

    return directional_correct, edge_realized, quality_score


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def generate_attribution(payload: AttributionInput) -> AttributionReport:
    """Generate a per-match attribution report.

    Pure function — performs no I/O, no DB access, and no SDK calls.

    Parameters
    ----------
    payload:
        Validated :class:`AttributionInput` containing all prediction layers
        and the realised match outcome.

    Returns
    -------
    AttributionReport
        Fully populated attribution result.

    Raises
    ------
    ValueError
        If ``actual_outcome`` is not one of ``OUTCOMES`` or if any required
        probability dict fails validation (delegated to the metric functions).
    """
    actual = payload.actual_outcome
    if actual not in OUTCOMES:
        raise ValueError(f"actual_outcome must be one of {OUTCOMES}, got {actual!r}")

    # --- Layer-level scores ----------------------------------------------------
    ml_brier = brier_score_multiclass(payload.ml_probs, actual)
    ml_ll = log_loss(payload.ml_probs, actual)

    sb_brier = brier_score_multiclass(payload.sb_probs, actual)
    sb_ll = log_loss(payload.sb_probs, actual)

    layer_brier: dict[str, float] = {"ml": ml_brier, "sb": sb_brier}
    layer_log_loss_map: dict[str, float] = {"ml": ml_ll, "sb": sb_ll}

    if payload.poly_probs is not None:
        poly_brier = brier_score_multiclass(payload.poly_probs, actual)
        poly_ll = log_loss(payload.poly_probs, actual)
        layer_brier["poly"] = poly_brier
        layer_log_loss_map["poly"] = poly_ll

    # --- Final layer -----------------------------------------------------------
    final_brier = brier_score_multiclass(payload.final_probs, actual)
    final_predicted_winner = _argmax(payload.final_probs)
    final_correct = final_predicted_winner == actual

    # --- Risk factor -----------------------------------------------------------
    risk_factor_hit = _evaluate_risk_factor(payload.risk_factor_text, actual, payload.ml_probs)

    # --- Diagnosis quality -----------------------------------------------------
    directional_correct, edge_realized, quality_score = _evaluate_diagnosis(
        payload.diagnosis,
        layer_brier,
        ml_brier,
        final_brier,
    )

    return AttributionReport(
        match_id=payload.match_id,
        actual_outcome=actual,
        final_predicted_winner=final_predicted_winner,
        final_brier=final_brier,
        layer_brier=layer_brier,
        layer_log_loss=layer_log_loss_map,
        final_correct=final_correct,
        risk_factor_text=payload.risk_factor_text,
        risk_factor_hit=risk_factor_hit,
        diagnosis_directional_correct=directional_correct,
        diagnosis_edge_realized=edge_realized,
        diagnosis_quality_score=quality_score,
        audit_completed_at=datetime.now(UTC),
    )
