"""Unit tests for the sportsbook soft-fail path in :class:`TripleLayerEngine`.

The integration suite covers happy-path orchestration; this unit test
focuses narrowly on the new soft-fail contract: when the sportsbook client
raises ``ValueError`` (e.g. The Odds API has no data for the match yet)
the engine must degrade to a uniform 1/3 fallback and still return a
valid :class:`FullPrediction`.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

from scoutedge_intelligence.analyst.triggers import TriggerConfig
from scoutedge_intelligence.models.dixon_coles import (
    DixonColesModel,
    DixonColesParams,
)
from scoutedge_intelligence.models.elo import FootballELO
from scoutedge_intelligence.synthesis.engine import (
    FullPrediction,
    TripleLayerEngine,
    TripleLayerInputs,
)
from scoutedge_intelligence.synthesis.synthesizer import SynthesisResult

HOME = "Brazil"
AWAY = "Germany"


def _make_synth_result() -> SynthesisResult:
    return SynthesisResult(
        final_probs={"home_win": 0.40, "draw": 0.30, "away_win": 0.30},
        confidence="low",
        expected_margin=1,
        risk_factor=None,
        weights_used={"ml": 0.80, "sb": 0.10, "poly": 0.10},
        rationale="Sportsbook fell back to uniform; ML carries most weight.",
        flags=[],
    )


def _build_engine_with_failing_sportsbook(
    *,
    dixon_coles: DixonColesModel | None = None,
) -> tuple[TripleLayerEngine, MagicMock]:
    elo = FootballELO()
    elo._ratings[HOME] = 1820.0
    elo._ratings[AWAY] = 1700.0

    if dixon_coles is None:
        dc_params = DixonColesParams(
            attack={HOME: 0.30, AWAY: 0.10},
            defense={HOME: -0.15, AWAY: 0.05},
            home_advantage=0.20,
            rho=-0.10,
        )
        dixon_coles = DixonColesModel(params=dc_params)

    sportsbook = MagicMock()
    sportsbook.fetch_consensus = AsyncMock(
        side_effect=ValueError(
            "Sportsbook response for match '9dcfb6bf' is missing outcome(s): "
            "['home', 'draw', 'away']. Cannot compute consensus."
        )
    )
    sportsbook.aclose = AsyncMock()

    synthesizer = MagicMock()
    synthesizer.synthesize = AsyncMock(return_value=_make_synth_result())

    engine = TripleLayerEngine(
        elo=elo,
        dixon_coles=dixon_coles,
        sportsbook=sportsbook,  # type: ignore[arg-type]
        synthesizer=synthesizer,  # type: ignore[arg-type]
        trigger_config=TriggerConfig(ANALYST_ENABLED=False),
    )
    return engine, sportsbook


async def test_predict_match_soft_fails_when_sportsbook_value_errors() -> None:
    """ValueError from sportsbook → uniform fallback + valid FullPrediction."""
    engine, sportsbook = _build_engine_with_failing_sportsbook()

    inputs = TripleLayerInputs(
        match_id="9dcfb6bf-aaaa-bbbb-cccc-ddddeeeeffff",
        home_team=HOME,
        away_team=AWAY,
    )

    result = await engine.predict_match(inputs)

    # The underlying client was actually invoked (so we exercised the soft-fail
    # path, not a short-circuit somewhere upstream).
    sportsbook.fetch_consensus.assert_awaited_once()

    assert isinstance(result, FullPrediction)
    # Uniform sportsbook fallback was applied.
    assert result.sb_probs == {"home_win": 1 / 3, "draw": 1 / 3, "away_win": 1 / 3}
    # Synthesizer's final_probs are returned and form a valid distribution.
    assert set(result.final_probs.keys()) == {"home_win", "draw", "away_win"}
    assert abs(sum(result.final_probs.values()) - 1.0) < 1e-6


async def test_predict_match_soft_fails_when_dixon_coles_unfitted() -> None:
    """Engine opts into Dixon-Coles fallback when artifacts are not available."""
    engine, _ = _build_engine_with_failing_sportsbook(dixon_coles=DixonColesModel())

    result = await engine.predict_match(
        TripleLayerInputs(
            match_id="9dcfb6bf-aaaa-bbbb-cccc-ddddeeeeffff",
            home_team=HOME,
            away_team=AWAY,
        )
    )

    assert set(result.ml_probs.keys()) == {"home_win", "draw", "away_win"}
    assert abs(sum(result.ml_probs.values()) - 1.0) < 1e-6
