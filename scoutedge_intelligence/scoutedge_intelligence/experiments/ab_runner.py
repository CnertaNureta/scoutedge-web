"""A/B experiment runner for ScoutEdge WC2026 (task P7.5).

Runs three prediction variants concurrently for every match and records
all outputs alongside metadata needed for post-hoc analysis:

    Group A: TripleLayerEngine with analyst disabled
    Group B: TripleLayerEngine with analyst forced-on
    Group C: ML-only baseline derived from Group A's ml_probs (no extra calls)

The runner issues Group A and Group B predict_match calls concurrently via
``asyncio.gather``; Group C is computed locally from Group A's result.
"""

from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

import structlog
from pydantic import BaseModel, ConfigDict

if TYPE_CHECKING:
    from scoutedge_intelligence.synthesis.engine import (
        FullPrediction,
        TripleLayerEngine,
        TripleLayerInputs,
    )

logger: structlog.BoundLogger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------

OUTCOMES: tuple[str, str, str] = ("home_win", "draw", "away_win")


@dataclass
class GroupResult:
    """Output for a single experiment group.

    Attributes
    ----------
    group:
        Experiment group label — one of ``"A"``, ``"B"``, ``"C"``.
    probs:
        1X2 probability dict with keys ``home_win``, ``draw``, ``away_win``.
    metadata:
        Arbitrary diagnostic metadata including ``latency_ms``, ``weights``,
        ``diagnosis_used``, ``tokens``, etc.
    """

    group: str
    probs: dict[str, float]
    metadata: dict[str, Any] = field(default_factory=dict)


class ABRunResult(BaseModel):
    """Complete A/B result for a single match.

    Attributes
    ----------
    match_id:
        Canonical match identifier.
    group_a:
        Result from the analyst-disabled engine.
    group_b:
        Result from the analyst-forced engine.
    group_c:
        ML-only baseline derived from ``group_a.probs``.
    user_assigned_group:
        Which group was shown to the real user (default ``"A"``).
    divergence_features:
        Optional divergence feature dict from Group A's prediction, useful for
        downstream analysis.
    """

    match_id: str
    group_a: GroupResult
    group_b: GroupResult
    group_c: GroupResult
    user_assigned_group: str = "A"
    divergence_features: dict[str, Any] | None = None

    model_config = ConfigDict(arbitrary_types_allowed=True)


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------


class ABRunner:
    """Runs the three A/B experiment groups for each match.

    Parameters
    ----------
    engine_a:
        :class:`TripleLayerEngine` configured with the analyst *disabled*
        (pass ``analyst=None`` or a :class:`TriggerConfig` that always skips).
    engine_b:
        :class:`TripleLayerEngine` configured with the analyst *forced on*
        for every match.
    """

    def __init__(
        self,
        engine_a: TripleLayerEngine,
        engine_b: TripleLayerEngine,
    ) -> None:
        self._engine_a = engine_a
        self._engine_b = engine_b
        logger.info("ab_runner.init")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def run_match(
        self,
        inputs: TripleLayerInputs,
        *,
        assigned_group: str = "A",
    ) -> ABRunResult:
        """Run all three groups for a single match.

        Group A and Group B predictions are issued concurrently via
        ``asyncio.gather``.  Group C is derived locally from Group A's
        ``ml_probs`` field — no additional API or model calls are made.

        Parameters
        ----------
        inputs:
            The match inputs forwarded verbatim to both engines.
        assigned_group:
            Which group's output was shown to the real user. Stored in the
            result for downstream attribution. Defaults to ``"A"``.

        Returns
        -------
        ABRunResult
            All three groups' results plus metadata.
        """
        log = logger.bind(match_id=inputs.match_id, assigned_group=assigned_group)
        log.info("ab_runner.run_match.start")

        # Run engine_a and engine_b concurrently and track wall-clock latency.
        t0 = time.monotonic()
        pred_a, pred_b = await asyncio.gather(
            self._timed_predict(self._engine_a, inputs, "A"),
            self._timed_predict(self._engine_b, inputs, "B"),
        )
        total_ms = (time.monotonic() - t0) * 1000.0
        log.info("ab_runner.run_match.done", total_latency_ms=round(total_ms, 1))

        group_a_result, latency_a = pred_a
        group_b_result, latency_b = pred_b

        result_a = self._to_group_result("A", group_a_result, latency_a)
        result_b = self._to_group_result("B", group_b_result, latency_b)
        result_c = self._make_group_c(group_a_result)

        return ABRunResult(
            match_id=inputs.match_id,
            group_a=result_a,
            group_b=result_b,
            group_c=result_c,
            user_assigned_group=assigned_group,
            divergence_features=dict(group_a_result.divergence_features)
            if group_a_result.divergence_features
            else None,
        )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    @staticmethod
    async def _timed_predict(
        engine: TripleLayerEngine,
        inputs: TripleLayerInputs,
        group: str,
    ) -> tuple[FullPrediction, float]:
        """Call engine.predict_match and return (result, latency_ms)."""
        t0 = time.monotonic()
        prediction = await engine.predict_match(inputs)
        latency_ms = (time.monotonic() - t0) * 1000.0
        logger.debug(
            "ab_runner.engine_done",
            group=group,
            match_id=inputs.match_id,
            latency_ms=round(latency_ms, 1),
        )
        return prediction, latency_ms

    @staticmethod
    def _to_group_result(
        group: str,
        prediction: FullPrediction,
        latency_ms: float,
    ) -> GroupResult:
        """Convert a FullPrediction into a GroupResult with metadata."""
        return GroupResult(
            group=group,
            probs=dict(prediction.final_probs),
            metadata={
                "latency_ms": latency_ms,
                "weights": dict(prediction.weights),
                "diagnosis_used": prediction.diagnosis is not None,
                "confidence": prediction.confidence,
                "risk_factor": prediction.risk_factor,
                "flags": list(prediction.flags),
            },
        )

    @staticmethod
    def _make_group_c(prediction_a: FullPrediction) -> GroupResult:
        """Derive the ML-only Group C result from Group A's ml_probs.

        No additional API, model, or data calls are made. The probability
        vector is taken directly from ``prediction_a.ml_probs``.

        Parameters
        ----------
        prediction_a:
            The FullPrediction produced by engine_a.

        Returns
        -------
        GroupResult
            Group C result using raw ml_probs.
        """
        ml_probs = dict(prediction_a.ml_probs)
        return GroupResult(
            group="C",
            probs=ml_probs,
            metadata={
                "latency_ms": 0.0,
                "source": "ml_probs_from_group_a",
                "diagnosis_used": False,
            },
        )
