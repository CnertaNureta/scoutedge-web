"""Remix route handler for ScoutEdge WC2026 (task P5.3).

Endpoint:
  POST /api/predict/remix — re-synthesise a match's AI probabilities
                             using user-supplied weight overrides.

The router is intentionally *not* mounted here; a separate orchestration
step (P5.4 / P5.5) wires it into api/main.py.
"""

from __future__ import annotations

from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_db_session
from scoutedge_intelligence.db.queries import get_latest_prediction
from scoutedge_intelligence.synthesis.weights import (
    BASE_WEIGHTS,
    WeightInputs,
    synthesize,
)

logger: structlog.BoundLogger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/api/predict", tags=["remix"])

# ---------------------------------------------------------------------------
# Annotated dependency alias
# ---------------------------------------------------------------------------

DbSession = Annotated[AsyncSession, Depends(get_db_session)]

# ---------------------------------------------------------------------------
# Validation constants
# ---------------------------------------------------------------------------

# Weight knobs: each component weight lives in [0, 1]
_WEIGHT_KNOBS: frozenset[str] = frozenset({"ml_weight", "sb_weight", "poly_weight"})

# Environmental modifiers: multiplicative, in [0.5, 1.5]
_MODIFIER_KNOBS: frozenset[str] = frozenset({"altitude_modifier", "heat_modifier"})

_ALL_KNOBS: frozenset[str] = _WEIGHT_KNOBS | _MODIFIER_KNOBS


# ---------------------------------------------------------------------------
# Pydantic request / response models
# ---------------------------------------------------------------------------


class RemixRequest(BaseModel):
    """Body for POST /api/predict/remix.

    Overrides are optional. Unrecognised keys are rejected (extra='forbid').
    """

    match_id: str = Field(..., description="Match UUID to remix.")
    overrides: dict[str, float] = Field(
        default_factory=dict,
        description=(
            "Weight-component knobs to override. "
            "Recognised keys: ml_weight, sb_weight, poly_weight (each in [0,1]); "
            "altitude_modifier, heat_modifier (each in [0.5, 1.5])."
        ),
    )

    @field_validator("overrides")
    @classmethod
    def _validate_override_keys(cls, v: dict[str, float]) -> dict[str, float]:
        unknown = set(v.keys()) - _ALL_KNOBS
        if unknown:
            raise ValueError(
                f"Unknown override keys: {sorted(unknown)}. Allowed: {sorted(_ALL_KNOBS)}."
            )
        return v

    @model_validator(mode="after")
    def _validate_override_ranges(self) -> RemixRequest:
        for key, val in self.overrides.items():
            if key in _WEIGHT_KNOBS:
                if not (0.0 <= val <= 1.0):
                    raise ValueError(f"Override '{key}' must be in [0.0, 1.0], got {val}.")
            elif key in _MODIFIER_KNOBS and not (0.5 <= val <= 1.5):
                raise ValueError(f"Override '{key}' must be in [0.5, 1.5], got {val}.")
        return self


class RemixResponse(BaseModel):
    """Response for POST /api/predict/remix."""

    final_probs: dict[str, float]
    weights_used: dict[str, float]
    overrides_applied: dict[str, float]
    delta_from_base: dict[str, float]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PROB_KEYS: tuple[str, ...] = ("home_win", "draw", "away_win")


def _safe_prob_dict(h: float | None, d: float | None, a: float | None) -> dict[str, float]:
    """Construct and normalise a prob dict from three nullable floats.

    Falls back to equal weight if all are None or zero.
    """
    hv = float(h or 0.0)
    dv = float(d or 0.0)
    av = float(a or 0.0)
    total = hv + dv + av
    if total <= 0.0:
        return {"home_win": 1 / 3, "draw": 1 / 3, "away_win": 1 / 3}
    return {"home_win": hv / total, "draw": dv / total, "away_win": av / total}


def _apply_modifier(probs: dict[str, float], modifier: float, favours: str) -> dict[str, float]:
    """Apply a multiplicative modifier to one probability outcome and renormalise.

    A modifier > 1.0 boosts the favoured outcome; < 1.0 suppresses it.

    Args:
        probs: Base probability dict {home_win, draw, away_win}.
        modifier: Multiplicative factor in [0.5, 1.5].
        favours: Which key the modifier primarily adjusts (the winner/loser
                 of altitude/heat advantage is determined by context; here we
                 apply it to the leading probability for simplicity).

    Returns:
        Renormalised probability dict.
    """
    adjusted = dict(probs)
    adjusted[favours] = adjusted[favours] * modifier
    total = sum(adjusted.values())
    if total <= 0.0:
        return probs
    return {k: v / total for k, v in adjusted.items()}


def _build_weight_inputs(
    ml_probs: dict[str, float],
    *,
    poly_present: bool,
) -> WeightInputs:
    """Construct a WeightInputs with conservative defaults for remix context."""
    return WeightInputs(
        ml_max_prob=max(ml_probs.values()),
        sb_books_used=5,  # assume full confidence — user is the judge now
        poly_volume_24h=None if not poly_present else 50_000.0,
        poly_bid_ask_spread=0.01 if poly_present else None,
        poly_present=poly_present,
    )


# ---------------------------------------------------------------------------
# POST /api/predict/remix
# ---------------------------------------------------------------------------


@router.post("/remix", response_model=RemixResponse, status_code=200)
async def remix_prediction(body: RemixRequest, db: DbSession) -> RemixResponse:
    """Re-synthesise a match's AI probabilities using user weight overrides.

    Steps:
    1. Validate override ranges (Pydantic handles this via RemixRequest validators).
    2. Load the latest stored AI prediction for the match.
    3. Clone its per-layer probability vectors.
    4. Apply altitude_modifier and heat_modifier to ml_probs (most sensitive layer).
    5. Override weights if weight knobs provided; re-run synthesize().
    6. Renormalise and return delta_from_base.

    Raises:
        404: No prediction found for match_id.
        422: Overrides contain out-of-range values (raised by Pydantic before
             handler is called).
    """
    log = logger.bind(match_id=body.match_id, overrides=body.overrides)

    # ---- Load base prediction -----------------------------------------------
    base_pred = await get_latest_prediction(db, body.match_id)
    if base_pred is None:
        log.warning("remix.no_base_prediction")
        raise HTTPException(
            status_code=404,
            detail=f"No AI prediction found for match {body.match_id!r}.",
        )

    # ---- Clone layer probability vectors ------------------------------------
    ml_probs = _safe_prob_dict(
        base_pred.ml_home_win_prob,
        base_pred.ml_draw_prob,
        base_pred.ml_away_win_prob,
    )
    sb_probs = _safe_prob_dict(
        base_pred.sb_home_win_prob,
        base_pred.sb_draw_prob,
        base_pred.sb_away_win_prob,
    )
    poly_home = base_pred.poly_home_win_prob
    poly_draw = base_pred.poly_draw_prob
    poly_away = base_pred.poly_away_win_prob
    poly_present = any(v is not None for v in (poly_home, poly_draw, poly_away))
    poly_probs: dict[str, float] | None = (
        _safe_prob_dict(poly_home, poly_draw, poly_away) if poly_present else None
    )

    # Capture base blended probs for delta computation
    base_blended = _safe_prob_dict(
        base_pred.blended_home_win_prob,
        base_pred.blended_draw_prob,
        base_pred.blended_away_win_prob,
    )

    overrides = body.overrides

    # ---- Step 4: Apply environmental modifiers to ml_probs ------------------
    # Altitude and heat modifiers adjust the ML layer (most context-sensitive).
    # Convention: modifier > 1.0 boosts the leading home_win prob (high-altitude
    # or heat more often favours the geographically-closer/prepared side, which
    # is the home team in WC group play). RemixSliders (P8.3) may expose more
    # granular target keys; for now we apply to the highest probability outcome.
    altitude_mod = overrides.get("altitude_modifier", 1.0)
    heat_mod = overrides.get("heat_modifier", 1.0)

    combined_env_modifier = altitude_mod * heat_mod
    if combined_env_modifier != 1.0:
        # Apply to the leading outcome in ml_probs
        leading_key = max(ml_probs, key=lambda k: ml_probs[k])
        ml_probs = _apply_modifier(ml_probs, combined_env_modifier, leading_key)

    # ---- Step 5: Build effective weights from overrides ---------------------
    # If the user supplied explicit weight knobs, use them directly (after
    # normalisation). Otherwise derive from synthesize() adaptive logic.
    weight_overrides_applied: dict[str, float] = {}

    if any(k in overrides for k in _WEIGHT_KNOBS):
        # User explicitly set weights; honour them after normalisation
        w_ml = overrides.get("ml_weight", BASE_WEIGHTS["ml"])
        w_sb = overrides.get("sb_weight", BASE_WEIGHTS["sb"])
        w_poly = overrides.get("poly_weight", BASE_WEIGHTS["poly"])

        # Zero-out poly if no polymarket data
        if not poly_present:
            excess = w_poly
            w_poly = 0.0
            # Redistribute proportionally between ml and sb
            total_ml_sb = w_ml + w_sb
            if total_ml_sb > 0:
                ratio = w_ml / total_ml_sb
                w_ml += excess * ratio
                w_sb += excess * (1.0 - ratio)

        total = w_ml + w_sb + w_poly
        if total > 0.0:
            w_ml /= total
            w_sb /= total
            w_poly /= total

        weights_used = {"ml": w_ml, "sb": w_sb, "poly": w_poly}
        weight_overrides_applied = {k: overrides[k] for k in _WEIGHT_KNOBS if k in overrides}

        # Manually blend with user weights
        final_probs: dict[str, float] = {}
        for key in _PROB_KEYS:
            poly_contrib = (poly_probs[key] * w_poly) if poly_probs is not None else 0.0
            final_probs[key] = ml_probs[key] * w_ml + sb_probs[key] * w_sb + poly_contrib
        # Renormalise for floating-point safety
        fp_total = sum(final_probs.values())
        if fp_total > 0.0:
            final_probs = {k: v / fp_total for k, v in final_probs.items()}

    else:
        # No weight overrides — use adaptive synthesis
        weight_inputs = _build_weight_inputs(ml_probs, poly_present=poly_present)
        synthesis = synthesize(ml=ml_probs, sb=sb_probs, poly=poly_probs, inputs=weight_inputs)
        final_probs = synthesis.final_probs
        weights_used = synthesis.weights

    # ---- Step 6: Compute delta_from_base ------------------------------------
    delta_from_base = {
        key: round(final_probs.get(key, 0.0) - base_blended.get(key, 0.0), 6) for key in _PROB_KEYS
    }

    # Collect all applied overrides (both weight knobs and modifier knobs)
    all_overrides_applied: dict[str, float] = {**weight_overrides_applied}
    if "altitude_modifier" in overrides:
        all_overrides_applied["altitude_modifier"] = overrides["altitude_modifier"]
    if "heat_modifier" in overrides:
        all_overrides_applied["heat_modifier"] = overrides["heat_modifier"]

    log.info(
        "remix.ok",
        weights_used=weights_used,
        overrides_applied=all_overrides_applied,
    )

    return RemixResponse(
        final_probs={k: round(final_probs[k], 6) for k in _PROB_KEYS},
        weights_used={k: round(v, 6) for k, v in weights_used.items()},
        overrides_applied=all_overrides_applied,
        delta_from_base=delta_from_base,
    )
