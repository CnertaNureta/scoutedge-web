"""Analyst trigger logic for ScoutEdge WC2026 (task P3.3).

Decides when to invoke the Divergence Analyst (Role 2, Sonnet, ~$0.01/call)
based on the divergence-features dict produced by
``scoutedge_intelligence.features.divergence.compute_divergence_features``.

No I/O or SDK calls are made here — this module is pure, deterministic logic.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Literal, cast

# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------

DecisionReason = Literal[
    "consensus_skip",
    "high_pairwise_kl",
    "ml_outlier",
    "poly_disagreement",
    "draw_outlier",
    "feature_flag_disabled",
    "feature_flag_high_only",
    "always_on_fallback",
]


@dataclass(frozen=True)
class TriggerDecision:
    """Immutable result of a trigger evaluation.

    Attributes
    ----------
    invoke:
        Whether the Analyst should be called for this match.
    reasons:
        Ordered list of :data:`DecisionReason` values that led to the decision.
    triggered_signals:
        Subset of ``divergence_features["triggered_signals"]`` that contributed
        to the decision.  May be empty even when *invoke* is ``True``.
    estimated_priority:
        Float in ``[0, 1]``.  Higher means stronger reason to invoke.
    """

    invoke: bool
    reasons: list[DecisionReason]
    triggered_signals: list[str]
    estimated_priority: float


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------


@dataclass
class TriggerConfig:
    """Thresholds and feature-flags for the trigger gate.

    Class-level attributes define the defaults.  Instantiate with
    :meth:`from_env` to read overrides from environment variables.
    """

    KL_HIGH_THRESHOLD: float = 0.06
    GAP_HIGH_THRESHOLD: float = 0.12
    AGREEMENT_SKIP_THRESHOLD: float = 0.92
    ANALYST_ENABLED: bool = True
    HIGH_DIVERGENCE_ONLY: bool = False

    @classmethod
    def from_env(cls) -> TriggerConfig:
        """Return a :class:`TriggerConfig` populated from environment variables.

        Recognised variables
        --------------------
        ``ANALYST_ENABLED``
            ``"false"`` (case-insensitive) disables the analyst. Anything else
            (including absence) keeps it enabled.
        ``ANALYST_HIGH_DIVERGENCE_ONLY``
            ``"true"`` (case-insensitive) restricts invocations to
            high-priority divergence only.

        All numeric thresholds use the class defaults and are not currently
        overrideable via env to keep the surface area small.
        """
        enabled_raw = os.environ.get("ANALYST_ENABLED", "true")
        analyst_enabled = enabled_raw.strip().lower() != "false"

        high_only_raw = os.environ.get("ANALYST_HIGH_DIVERGENCE_ONLY", "false")
        high_divergence_only = high_only_raw.strip().lower() == "true"

        return cls(
            ANALYST_ENABLED=analyst_enabled,
            HIGH_DIVERGENCE_ONLY=high_divergence_only,
        )


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _clamp(value: float, lo: float, hi: float) -> float:
    """Return *value* clamped to the closed interval ``[lo, hi]``."""
    return max(lo, min(hi, value))


def _classify_signals(
    triggered_signals: list[str],
) -> tuple[list[DecisionReason], list[str]]:
    """Map signal names to :data:`DecisionReason` labels.

    Parameters
    ----------
    triggered_signals:
        List of signal strings from ``divergence_features["triggered_signals"]``.

    Returns
    -------
    reasons:
        Deduplicated list of matched :data:`DecisionReason` values.
    matched_signals:
        Signals that matched at least one reason (preserves order, no dups).
    """
    reasons: list[DecisionReason] = []
    matched_signals: list[str] = []
    seen_reasons: set[DecisionReason] = set()

    for sig in triggered_signals:
        sig_upper = sig.upper()
        matched = False

        if "DRAW" in sig_upper:
            if "draw_outlier" not in seen_reasons:
                reasons.append("draw_outlier")
                seen_reasons.add("draw_outlier")
            matched = True

        if "PM" in sig_upper or "POLY" in sig_upper:
            if "poly_disagreement" not in seen_reasons:
                reasons.append("poly_disagreement")
                seen_reasons.add("poly_disagreement")
            matched = True

        if "ML" in sig_upper:
            if "ml_outlier" not in seen_reasons:
                reasons.append("ml_outlier")
                seen_reasons.add("ml_outlier")
            matched = True

        if matched and sig not in matched_signals:
            matched_signals.append(sig)

    return reasons, matched_signals


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def should_invoke_analyst(
    divergence_features: dict[str, object],
    config: TriggerConfig | None = None,
) -> TriggerDecision:
    """Decide whether to invoke the Divergence Analyst for a given match.

    The decision is deterministic and side-effect-free.  It reads only the
    keys defined in
    ``scoutedge_intelligence.features.divergence.compute_divergence_features``.

    Parameters
    ----------
    divergence_features:
        Feature dict as returned by ``compute_divergence_features``.
        Required keys: ``three_way_agreement_score``, ``max_pairwise_kl``,
        ``max_pairwise_gap``, ``triggered_signals``.
        Missing keys raise :class:`KeyError`.
    config:
        Optional :class:`TriggerConfig`.  Defaults to
        ``TriggerConfig()`` (class defaults) when ``None``.

    Returns
    -------
    TriggerDecision
        Immutable decision record.

    Raises
    ------
    KeyError
        If any required key is absent from *divergence_features*.
    """
    if config is None:
        config = TriggerConfig()

    # ------------------------------------------------------------------
    # Rule 1 — feature-flag kill-switch
    # ------------------------------------------------------------------
    if not config.ANALYST_ENABLED:
        return TriggerDecision(
            invoke=False,
            reasons=["feature_flag_disabled"],
            triggered_signals=[],
            estimated_priority=0.0,
        )

    # ------------------------------------------------------------------
    # Extract required fields (KeyError propagates to caller)
    # ------------------------------------------------------------------
    agreement_score: float = float(cast(float, divergence_features["three_way_agreement_score"]))
    max_kl: float = float(cast(float, divergence_features["max_pairwise_kl"]))
    max_gap: float = float(cast(float, divergence_features["max_pairwise_gap"]))
    triggered_signals: list[str] = list(cast(list[str], divergence_features["triggered_signals"]))

    # ------------------------------------------------------------------
    # Rule 2 — consensus skip
    # ------------------------------------------------------------------
    if agreement_score >= config.AGREEMENT_SKIP_THRESHOLD:
        return TriggerDecision(
            invoke=False,
            reasons=["consensus_skip"],
            triggered_signals=[],
            estimated_priority=0.0,
        )

    # ------------------------------------------------------------------
    # Rule 3 — priority components
    # ------------------------------------------------------------------
    kl_range = config.KL_HIGH_THRESHOLD - 0.02
    p_kl = _clamp((max_kl - 0.02) / kl_range, 0.0, 1.0) if kl_range > 0 else 0.0

    gap_range = config.GAP_HIGH_THRESHOLD - 0.05
    p_gap = _clamp((max_gap - 0.05) / gap_range, 0.0, 1.0) if gap_range > 0 else 0.0

    p_signal = 0.0 if not triggered_signals else min(1.0, len(triggered_signals) / 3.0)

    estimated_priority = max(p_kl, p_gap, p_signal)

    # ------------------------------------------------------------------
    # Rule 4 — high-divergence-only gate
    # ------------------------------------------------------------------
    if config.HIGH_DIVERGENCE_ONLY and estimated_priority < 0.5:
        # Classify signals even on skip so callers can see what was present
        _, matched = _classify_signals(triggered_signals)
        return TriggerDecision(
            invoke=False,
            reasons=["feature_flag_high_only"],
            triggered_signals=matched,
            estimated_priority=estimated_priority,
        )

    # ------------------------------------------------------------------
    # Rule 5 — build reasons for invoke=True
    # ------------------------------------------------------------------
    signal_reasons, matched_signals = _classify_signals(triggered_signals)

    invoke_reasons: list[DecisionReason] = []

    if max_kl > config.KL_HIGH_THRESHOLD:
        invoke_reasons.append("high_pairwise_kl")

    invoke_reasons.extend(signal_reasons)

    if not invoke_reasons:
        invoke_reasons.append("always_on_fallback")

    return TriggerDecision(
        invoke=True,
        reasons=invoke_reasons,
        triggered_signals=matched_signals,
        estimated_priority=estimated_priority,
    )
