"""Unit tests for scoutedge_intelligence.scripts.precompute_predictions.

All network and database calls are mocked — no real connections are made.
"""

from __future__ import annotations

import asyncio
import datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scoutedge_intelligence.db.models import MatchSchema
from scoutedge_intelligence.scripts.precompute_predictions import (
    DEFAULT_CONCURRENCY,
    DEFAULT_HORIZON_HOURS,
    DEFAULT_LIMIT,
    build_engine_inputs,
    fetch_target_matches,
    parse_args,
    precompute_one,
    run,
)
from scoutedge_intelligence.synthesis.engine import FullPrediction, TripleLayerInputs

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

_NOW = datetime.datetime(2026, 6, 15, 12, 0, 0, tzinfo=datetime.UTC)

_SAMPLE_MATCH = MatchSchema(
    id="match-uuid-001",
    home_team_id="team-home-id",
    away_team_id="team-away-id",
    kickoff_utc=_NOW + datetime.timedelta(hours=4),
    stage="group",
    group_code="A",
    venue_city="Los Angeles",
    finished=False,
)

_SAMPLE_FULL_PREDICTION = FullPrediction(
    match_id="match-uuid-001",
    final_probs={"home_win": 0.50, "draw": 0.25, "away_win": 0.25},
    ml_probs={"home_win": 0.48, "draw": 0.27, "away_win": 0.25},
    sb_probs={"home_win": 0.52, "draw": 0.24, "away_win": 0.24},
    poly_probs={"home_win": 0.51, "draw": 0.24, "away_win": 0.25},
    weights={"ml": 0.4, "sb": 0.4, "poly": 0.2},
    diagnosis={"signal": "ml_vs_sb_gap", "severity": "low"},
    synthesizer_raw={"final_probs": {"home_win": 0.50, "draw": 0.25, "away_win": 0.25}},
    confidence="high",
    expected_margin=1,
    risk_factor="low",
    rationale="ML and SB agree; poly confirms.",
    flags=[],
    feature_generator_output=None,
    divergence_features={"ml_sb_home_win_diff": 0.04, "ml_poly_draw_diff": 0.03},
    explanation_text=None,
)


def _make_engine(*, raises: Exception | None = None) -> MagicMock:
    """Return a mock TripleLayerEngine."""
    engine = MagicMock()
    if raises is not None:
        engine.predict_match = AsyncMock(side_effect=raises)
    else:
        engine.predict_match = AsyncMock(return_value=_SAMPLE_FULL_PREDICTION)
    engine.aclose = AsyncMock()
    return engine


def _make_session() -> AsyncMock:
    """Return a mock AsyncSession."""
    session = AsyncMock()
    session.execute = AsyncMock(return_value=MagicMock(scalars=lambda: MagicMock(all=lambda: [])))
    session.commit = AsyncMock()
    return session


def _make_args(
    *,
    horizon_hours: int = DEFAULT_HORIZON_HOURS,
    limit: int = DEFAULT_LIMIT,
    dry_run: bool = False,
    match_ids: list[str] | None = None,
    concurrency: int = DEFAULT_CONCURRENCY,
) -> Any:
    """Build a mock argparse.Namespace."""
    ns = MagicMock()
    ns.horizon_hours = horizon_hours
    ns.limit = limit
    ns.dry_run = dry_run
    ns.match_ids = match_ids
    ns.concurrency = concurrency
    return ns


# ---------------------------------------------------------------------------
# 1. parse_args defaults
# ---------------------------------------------------------------------------


class TestParseArgs:
    def test_defaults(self) -> None:
        """parse_args() with no arguments returns the expected defaults."""
        ns = parse_args([])
        assert ns.horizon_hours == DEFAULT_HORIZON_HOURS
        assert ns.limit == DEFAULT_LIMIT
        assert ns.dry_run is False
        assert ns.match_ids is None
        assert ns.concurrency == DEFAULT_CONCURRENCY

    def test_horizon_hours_override(self) -> None:
        """--horizon-hours is parsed correctly."""
        ns = parse_args(["--horizon-hours", "48"])
        assert ns.horizon_hours == 48

    def test_dry_run_flag(self) -> None:
        """--dry-run sets dry_run to True."""
        ns = parse_args(["--dry-run"])
        assert ns.dry_run is True

    def test_concurrency_override(self) -> None:
        """--concurrency is parsed correctly."""
        ns = parse_args(["--concurrency", "5"])
        assert ns.concurrency == 5

    # 2. parse_args --match-ids "a,b,c" → list of three
    def test_match_ids_split(self) -> None:
        """--match-ids 'a,b,c' produces a list of three strings."""
        ns = parse_args(["--match-ids", "a,b,c"])
        assert ns.match_ids == ["a", "b", "c"]

    def test_match_ids_single(self) -> None:
        """--match-ids with a single ID produces a one-element list."""
        ns = parse_args(["--match-ids", "only-one"])
        assert ns.match_ids == ["only-one"]

    def test_match_ids_strips_whitespace(self) -> None:
        """--match-ids strips whitespace around each ID."""
        ns = parse_args(["--match-ids", " x , y , z "])
        assert ns.match_ids == ["x", "y", "z"]


# ---------------------------------------------------------------------------
# 3. build_engine_inputs maps MatchSchema fields correctly
# ---------------------------------------------------------------------------


class TestBuildEngineInputs:
    def test_field_mapping(self) -> None:
        """build_engine_inputs correctly maps MatchSchema → TripleLayerInputs."""
        inputs = build_engine_inputs(_SAMPLE_MATCH)
        assert inputs.match_id == "match-uuid-001"
        assert inputs.home_team == "team-home-id"
        assert inputs.away_team == "team-away-id"
        assert inputs.venue_city == "Los Angeles"
        assert inputs.kickoff_iso is not None
        assert "2026-06-15" in inputs.kickoff_iso

    def test_intel_text_is_none(self) -> None:
        """intel_text is always None (separate pipeline)."""
        inputs = build_engine_inputs(_SAMPLE_MATCH)
        assert inputs.intel_text is None

    def test_wc_context_is_none(self) -> None:
        """wc_context is None (not populated by this script)."""
        inputs = build_engine_inputs(_SAMPLE_MATCH)
        assert inputs.wc_context is None

    def test_null_kickoff_utc(self) -> None:
        """kickoff_iso is None when match.kickoff_utc is None."""
        match = MatchSchema(
            id="m2",
            home_team_id="h",
            away_team_id="a",
            kickoff_utc=None,
            finished=False,
        )
        inputs = build_engine_inputs(match)
        assert inputs.kickoff_iso is None

    def test_null_team_ids_fallback_to_empty_string(self) -> None:
        """home_team / away_team fall back to empty string when IDs are None."""
        match = MatchSchema(id="m3", home_team_id=None, away_team_id=None, finished=False)
        inputs = build_engine_inputs(match)
        assert inputs.home_team == ""
        assert inputs.away_team == ""


# ---------------------------------------------------------------------------
# 4. precompute_one happy path
# ---------------------------------------------------------------------------


class TestPrecomputeOne:
    @pytest.mark.asyncio
    async def test_happy_path(self) -> None:
        """precompute_one returns ok=True and a prediction_id on success."""
        mock_engine = _make_engine()
        mock_session = _make_session()
        expected_id = "prediction-uuid-042"

        with patch(
            "scoutedge_intelligence.scripts.precompute_predictions.queries.insert_prediction",
            new_callable=AsyncMock,
            return_value=expected_id,
        ):
            result = await precompute_one(mock_engine, mock_session, _SAMPLE_MATCH, dry_run=False)

        assert result["ok"] is True
        assert result["error"] is None
        assert result["prediction_id"] == expected_id
        assert result["match_id"] == "match-uuid-001"
        mock_engine.predict_match.assert_awaited_once()

    # 5. precompute_one engine raises → ok=False, error string captured
    @pytest.mark.asyncio
    async def test_engine_raises(self) -> None:
        """precompute_one catches engine exceptions and returns ok=False."""
        mock_engine = _make_engine(raises=RuntimeError("sportsbook unavailable"))
        mock_session = _make_session()

        result = await precompute_one(mock_engine, mock_session, _SAMPLE_MATCH, dry_run=False)

        assert result["ok"] is False
        assert "RuntimeError" in (result["error"] or "")
        assert "sportsbook unavailable" in (result["error"] or "")
        assert result["prediction_id"] is None

    @pytest.mark.asyncio
    async def test_dry_run_skips_insert(self) -> None:
        """precompute_one with dry_run=True does not call insert_prediction."""
        mock_engine = _make_engine()
        mock_session = _make_session()

        with patch(
            "scoutedge_intelligence.scripts.precompute_predictions.queries.insert_prediction",
            new_callable=AsyncMock,
        ) as mock_insert:
            result = await precompute_one(mock_engine, mock_session, _SAMPLE_MATCH, dry_run=True)

        mock_insert.assert_not_awaited()
        assert result["ok"] is True
        assert result["prediction_id"] is None


# ---------------------------------------------------------------------------
# 6. run: 3 matches, 1 fails → totals: total=3, ok=2, failed=1
# ---------------------------------------------------------------------------


class TestRun:
    def _make_three_matches(self) -> list[MatchSchema]:
        """Return three MatchSchema instances for testing."""
        base_time = _NOW + datetime.timedelta(hours=2)
        return [
            MatchSchema(
                id=f"m{i}",
                home_team_id="h",
                away_team_id="a",
                kickoff_utc=base_time,
                finished=False,
            )
            for i in range(3)
        ]

    @pytest.mark.asyncio
    async def test_three_matches_one_fails(self) -> None:
        """run returns correct totals when 1 of 3 matches fails."""
        matches = self._make_three_matches()
        call_count = 0

        async def _side_effect(inputs: TripleLayerInputs) -> FullPrediction:
            nonlocal call_count
            call_count += 1
            if inputs.match_id == "m1":
                raise RuntimeError("forced failure")
            return _SAMPLE_FULL_PREDICTION

        mock_engine = MagicMock()
        mock_engine.predict_match = AsyncMock(side_effect=_side_effect)

        args = _make_args()

        with (
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.create_async_engine",
            ) as mock_create_engine,
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.async_sessionmaker",
            ) as mock_sm,
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.fetch_target_matches",
                new_callable=AsyncMock,
                return_value=matches,
            ),
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.queries.insert_prediction",
                new_callable=AsyncMock,
                return_value=99,
            ),
        ):
            # Wire up the async_sessionmaker context manager
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            mock_sm.return_value.return_value = mock_session

            async_engine_mock = AsyncMock()
            async_engine_mock.dispose = AsyncMock()
            mock_create_engine.return_value = async_engine_mock

            summary = await run(args, engine_factory_override=lambda: mock_engine)

        assert summary["total"] == 3
        assert summary["ok"] == 2
        assert summary["failed"] == 1

    # 7. run --dry-run: no insert_prediction calls
    @pytest.mark.asyncio
    async def test_dry_run_no_inserts(self) -> None:
        """run with dry_run=True never calls insert_prediction."""
        matches = self._make_three_matches()
        mock_engine = _make_engine()
        args = _make_args(dry_run=True)

        with (
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.create_async_engine",
            ) as mock_create_engine,
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.async_sessionmaker",
            ) as mock_sm,
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.fetch_target_matches",
                new_callable=AsyncMock,
                return_value=matches,
            ),
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.queries.insert_prediction",
                new_callable=AsyncMock,
                return_value=99,
            ) as mock_insert,
        ):
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            mock_sm.return_value.return_value = mock_session

            async_engine_mock = AsyncMock()
            async_engine_mock.dispose = AsyncMock()
            mock_create_engine.return_value = async_engine_mock

            summary = await run(args, engine_factory_override=lambda: mock_engine)

        mock_insert.assert_not_awaited()
        assert summary["total"] == 3
        assert summary["ok"] == 3
        assert summary["skipped_dry_run"] == 3

    # 8. concurrency: with concurrency=2 and 4 matches, semaphore limits parallelism
    @pytest.mark.asyncio
    async def test_concurrency_limits_parallelism(self) -> None:
        """Semaphore limits concurrent execution to at most `concurrency` tasks."""
        base_time = _NOW + datetime.timedelta(hours=2)
        matches = [
            MatchSchema(
                id=f"m{i}",
                home_team_id="h",
                away_team_id="a",
                kickoff_utc=base_time,
                finished=False,
            )
            for i in range(4)
        ]

        concurrent_peak = 0
        current_active = 0
        lock = asyncio.Lock()

        async def _slow_predict(inputs: TripleLayerInputs) -> FullPrediction:
            nonlocal concurrent_peak, current_active
            async with lock:
                current_active += 1
                concurrent_peak = max(concurrent_peak, current_active)
            # yield control to let other coroutines proceed
            await asyncio.sleep(0)
            async with lock:
                current_active -= 1
            return _SAMPLE_FULL_PREDICTION

        mock_engine = MagicMock()
        mock_engine.predict_match = AsyncMock(side_effect=_slow_predict)

        args = _make_args(concurrency=2)

        with (
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.create_async_engine",
            ) as mock_create_engine,
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.async_sessionmaker",
            ) as mock_sm,
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.fetch_target_matches",
                new_callable=AsyncMock,
                return_value=matches,
            ),
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.queries.insert_prediction",
                new_callable=AsyncMock,
                return_value=1,
            ),
        ):
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            mock_sm.return_value.return_value = mock_session

            async_engine_mock = AsyncMock()
            async_engine_mock.dispose = AsyncMock()
            mock_create_engine.return_value = async_engine_mock

            summary = await run(args, engine_factory_override=lambda: mock_engine)

        assert summary["total"] == 4
        assert summary["ok"] == 4
        # The semaphore permits at most concurrency=2 simultaneous tasks
        assert concurrent_peak <= 2

    # Edge case: match_ids arg triggers get_match path
    @pytest.mark.asyncio
    async def test_match_ids_uses_get_match(self) -> None:
        """When args.match_ids is set, run fetches matches via get_match."""
        mock_engine = _make_engine()
        args = _make_args(match_ids=["m-abc"])

        with (
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.create_async_engine",
            ) as mock_create_engine,
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.async_sessionmaker",
            ) as mock_sm,
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.queries.get_match",
                new_callable=AsyncMock,
                return_value=_SAMPLE_MATCH,
            ) as mock_get_match,
            patch(
                "scoutedge_intelligence.scripts.precompute_predictions.queries.insert_prediction",
                new_callable=AsyncMock,
                return_value=5,
            ),
        ):
            mock_session = AsyncMock()
            mock_session.__aenter__ = AsyncMock(return_value=mock_session)
            mock_session.__aexit__ = AsyncMock(return_value=False)
            mock_sm.return_value.return_value = mock_session

            async_engine_mock = AsyncMock()
            async_engine_mock.dispose = AsyncMock()
            mock_create_engine.return_value = async_engine_mock

            summary = await run(args, engine_factory_override=lambda: mock_engine)

        mock_get_match.assert_awaited_once_with(mock_session, "m-abc")
        assert summary["total"] == 1
        assert summary["ok"] == 1


# ---------------------------------------------------------------------------
# fetch_target_matches (unit)
# ---------------------------------------------------------------------------


class TestFetchTargetMatches:
    @pytest.mark.asyncio
    async def test_returns_empty_on_no_rows(self) -> None:
        """fetch_target_matches returns an empty list when the DB has no rows."""
        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        session.execute = AsyncMock(return_value=result_mock)

        rows = await fetch_target_matches(session, horizon_hours=48, limit=10)
        assert rows == []
