"""Unit tests for scoutedge_intelligence.scripts.run_attribution.

Coverage targets (≥ 7 tests):
  1.  parse_args defaults
  2.  build_attribution_input maps prediction columns into 3 ProbDicts correctly
  3.  build_attribution_input with poly_*_prob all None → poly_probs=None in input
  4.  build_attribution_input missing final probs → ValueError
  5.  attribute_one: missing prediction → ok=False with skipped_no_prediction=True
  6.  attribute_one: happy path → calls update_prediction_audit (assert via mock)
  7.  run: 3 matches, 1 missing prediction, 1 raises in generate_attribution, 1 ok →
      totals: total=3, ok=1, failed=1, skipped_no_prediction=1
  8.  --dry-run: 0 calls to update_prediction_audit
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scoutedge_intelligence.db.models import MatchSchema, PredictionSchema
from scoutedge_intelligence.scripts.run_attribution import (
    DEFAULT_LIMIT,
    DEFAULT_LOOKBACK_HOURS,
    attribute_one,
    build_attribution_input,
    parse_args,
    run,
)

# ---------------------------------------------------------------------------
# Shared factories
# ---------------------------------------------------------------------------


def _make_match(
    match_id: str = "match-001",
    actual_outcome: str | None = "home_win",
    home_goals: int | None = 2,
    away_goals: int | None = 1,
) -> MatchSchema:
    """Build a minimal finished MatchSchema."""
    return MatchSchema(
        id=match_id,
        finished=True,
        finished_at=datetime(2026, 6, 15, 20, 0, tzinfo=UTC),
        actual_outcome=actual_outcome,
        home_goals=home_goals,
        away_goals=away_goals,
    )


def _make_prediction(
    match_id: str = "match-001",
    *,
    with_poly: bool = True,
    final_missing: bool = False,
) -> PredictionSchema:
    """Build a minimal PredictionSchema with valid probabilities."""
    blended_home = None if final_missing else 0.55
    blended_draw = None if final_missing else 0.25
    blended_away = None if final_missing else 0.20

    poly_home = 0.50 if with_poly else None
    poly_draw = 0.25 if with_poly else None
    poly_away = 0.25 if with_poly else None

    return PredictionSchema(
        id=42,
        match_id=match_id,
        created_at=datetime(2026, 6, 15, 12, 0, tzinfo=UTC),
        # ML
        ml_home_win_prob=0.50,
        ml_draw_prob=0.30,
        ml_away_win_prob=0.20,
        # Sportsbook
        sb_home_win_prob=0.48,
        sb_draw_prob=0.28,
        sb_away_win_prob=0.24,
        # Polymarket
        poly_home_win_prob=poly_home,
        poly_draw_prob=poly_draw,
        poly_away_win_prob=poly_away,
        # Blended / final
        blended_home_win_prob=blended_home,
        blended_draw_prob=blended_draw,
        blended_away_win_prob=blended_away,
    )


# ---------------------------------------------------------------------------
# 1. parse_args defaults
# ---------------------------------------------------------------------------


class TestParseArgs:
    def test_defaults(self) -> None:
        """Verify all default values are applied when no args are passed."""
        args = parse_args([])

        assert args.lookback_hours == DEFAULT_LOOKBACK_HOURS
        assert args.limit == DEFAULT_LIMIT
        assert args.dry_run is False
        assert args.match_id is None

    def test_custom_values(self) -> None:
        """Explicit flags override defaults."""
        args = parse_args(
            ["--lookback-hours", "24", "--limit", "50", "--dry-run", "--match-id", "abc-123"]
        )

        assert args.lookback_hours == 24
        assert args.limit == 50
        assert args.dry_run is True
        assert args.match_id == "abc-123"


# ---------------------------------------------------------------------------
# 2 & 3 & 4. build_attribution_input
# ---------------------------------------------------------------------------


class TestBuildAttributionInput:
    def test_maps_all_three_prob_dicts_correctly(self) -> None:
        """All three layers are mapped into ProbDicts with the right keys."""
        match = _make_match()
        prediction = _make_prediction(with_poly=True)

        ai = build_attribution_input(match, prediction)

        # ML
        assert ai.ml_probs == {"home_win": 0.50, "draw": 0.30, "away_win": 0.20}
        # Sportsbook
        assert ai.sb_probs == {"home_win": 0.48, "draw": 0.28, "away_win": 0.24}
        # Polymarket
        assert ai.poly_probs == {"home_win": 0.50, "draw": 0.25, "away_win": 0.25}
        # Final
        assert ai.final_probs == {"home_win": 0.55, "draw": 0.25, "away_win": 0.20}
        # Passthrough fields
        assert ai.match_id == "match-001"
        assert ai.actual_outcome == "home_win"

    def test_poly_all_none_sets_poly_probs_none(self) -> None:
        """When all poly_*_prob columns are None, poly_probs is None in the input."""
        match = _make_match()
        prediction = _make_prediction(with_poly=False)

        ai = build_attribution_input(match, prediction)

        assert ai.poly_probs is None

    def test_missing_final_probs_raises_value_error(self) -> None:
        """Missing blended probabilities must raise ValueError."""
        match = _make_match()
        prediction = _make_prediction(final_missing=True)

        with pytest.raises(ValueError, match="blended/final probabilities are missing"):
            build_attribution_input(match, prediction)

    def test_derives_outcome_from_goals_when_actual_outcome_none(self) -> None:
        """When actual_outcome is None, derive from home/away goals."""
        match = _make_match(actual_outcome=None, home_goals=0, away_goals=0)
        prediction = _make_prediction()

        ai = build_attribution_input(match, prediction)

        assert ai.actual_outcome == "draw"

    def test_derives_away_win_from_goals(self) -> None:
        match = _make_match(actual_outcome=None, home_goals=1, away_goals=3)
        prediction = _make_prediction()

        ai = build_attribution_input(match, prediction)

        assert ai.actual_outcome == "away_win"

    def test_partial_poly_columns_raises_value_error(self) -> None:
        """Some but not all poly columns present is a data integrity error."""
        match = _make_match()
        prediction = _make_prediction(with_poly=True)
        # Corrupt one poly column to None while others remain non-None
        prediction = prediction.model_copy(update={"poly_away_win_prob": None})

        with pytest.raises(ValueError, match="partial poly probabilities"):
            build_attribution_input(match, prediction)


# ---------------------------------------------------------------------------
# 5. attribute_one: missing prediction → skipped_no_prediction
# ---------------------------------------------------------------------------


class TestAttributeOneMissingPrediction:
    @pytest.mark.asyncio
    async def test_missing_prediction_returns_skipped(self) -> None:
        """When no prediction exists, attribute_one returns skipped_no_prediction=True."""
        session = AsyncMock()

        with (
            patch(
                "scoutedge_intelligence.scripts.run_attribution.get_match",
                new=AsyncMock(return_value=_make_match()),
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.get_latest_prediction",
                new=AsyncMock(return_value=None),
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.update_prediction_audit",
                new=AsyncMock(),
            ) as mock_persist,
        ):
            result = await attribute_one(session, "match-001")

        assert result["ok"] is False
        assert result["skipped_no_prediction"] is True
        mock_persist.assert_not_called()


# ---------------------------------------------------------------------------
# 6. attribute_one: happy path calls update_prediction_audit
# ---------------------------------------------------------------------------


class TestAttributeOneHappyPath:
    @pytest.mark.asyncio
    async def test_happy_path_calls_persist(self) -> None:
        """Successful attribution persists exactly one PredictionAuditSchema row."""
        session = AsyncMock()

        with (
            patch(
                "scoutedge_intelligence.scripts.run_attribution.get_match",
                new=AsyncMock(return_value=_make_match()),
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.get_latest_prediction",
                new=AsyncMock(return_value=_make_prediction()),
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.update_prediction_audit",
                new=AsyncMock(),
            ) as mock_persist,
        ):
            result = await attribute_one(session, "match-001", dry_run=False)

        assert result["ok"] is True
        assert result["error"] is None
        mock_persist.assert_awaited_once()
        audit_arg = mock_persist.call_args[0][1]  # second positional arg = audit schema
        assert audit_arg.match_id == "match-001"

    @pytest.mark.asyncio
    async def test_error_in_generate_attribution_returns_failed(self) -> None:
        """Exceptions inside generate_attribution are caught and ok=False is returned."""
        session = AsyncMock()

        with (
            patch(
                "scoutedge_intelligence.scripts.run_attribution.get_match",
                new=AsyncMock(return_value=_make_match()),
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.get_latest_prediction",
                new=AsyncMock(return_value=_make_prediction()),
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.generate_attribution",
                side_effect=ValueError("boom"),
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.update_prediction_audit",
                new=AsyncMock(),
            ) as mock_persist,
        ):
            result = await attribute_one(session, "match-001")

        assert result["ok"] is False
        assert "boom" in (result["error"] or "")
        mock_persist.assert_not_called()


# ---------------------------------------------------------------------------
# 7. run: 3 matches with mixed outcomes
# ---------------------------------------------------------------------------


class TestRunOrchestrator:
    """Test the top-level run() orchestrator without a real DB."""

    def _make_args(self, **overrides: Any) -> MagicMock:
        args = MagicMock()
        args.lookback_hours = DEFAULT_LOOKBACK_HOURS
        args.limit = DEFAULT_LIMIT
        args.dry_run = False
        args.match_id = None
        for k, v in overrides.items():
            setattr(args, k, v)
        return args

    @pytest.mark.asyncio
    async def test_three_matches_mixed_results(self) -> None:
        """3 matches: 1 ok, 1 no-prediction skip, 1 generate_attribution error."""
        match_ok = _make_match("m-ok")
        match_skip = _make_match("m-skip")
        match_fail = _make_match("m-fail")
        pred_ok = _make_prediction("m-ok")
        pred_fail = _make_prediction("m-fail")

        async def fake_get_match(_session: Any, mid: str) -> MatchSchema | None:
            return {"m-ok": match_ok, "m-skip": match_skip, "m-fail": match_fail}.get(mid)

        async def fake_get_pred(_session: Any, mid: str) -> PredictionSchema | None:
            return {"m-ok": pred_ok, "m-fail": pred_fail}.get(mid)  # m-skip has no prediction

        async def fake_find_pending(_session: Any, *, since: Any, limit: Any) -> list[MatchSchema]:
            return [match_ok, match_skip, match_fail]

        def fake_generate(payload: Any) -> Any:
            if payload.match_id == "m-fail":
                raise RuntimeError("model exploded")
            from scoutedge_intelligence.audit.attribution import generate_attribution

            return generate_attribution(payload)

        with (
            patch.dict("os.environ", {"DATABASE_URL": "postgresql+asyncpg://fake/db"}),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.create_async_engine",
            ) as mock_engine_cls,
            patch(
                "scoutedge_intelligence.scripts.run_attribution.async_sessionmaker",
            ) as mock_sm_cls,
            patch(
                "scoutedge_intelligence.scripts.run_attribution.find_pending_matches",
                new=AsyncMock(side_effect=fake_find_pending),
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.get_match",
                new=AsyncMock(side_effect=fake_get_match),
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.get_latest_prediction",
                new=AsyncMock(side_effect=fake_get_pred),
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.generate_attribution",
                side_effect=fake_generate,
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.update_prediction_audit",
                new=AsyncMock(),
            ) as mock_persist,
        ):
            # Wire up a fake async context manager for the session factory
            fake_session = AsyncMock()
            mock_session_ctx = AsyncMock()
            mock_session_ctx.__aenter__ = AsyncMock(return_value=fake_session)
            mock_session_ctx.__aexit__ = AsyncMock(return_value=False)
            mock_sm_cls.return_value = MagicMock(return_value=mock_session_ctx)
            mock_engine_cls.return_value = MagicMock()

            totals = await run(self._make_args())

        assert totals["total"] == 3
        assert totals["ok"] == 1
        assert totals["failed"] == 1
        assert totals["skipped_no_prediction"] == 1
        mock_persist.assert_awaited_once()


# ---------------------------------------------------------------------------
# 8. --dry-run: zero calls to update_prediction_audit
# ---------------------------------------------------------------------------


class TestDryRun:
    @pytest.mark.asyncio
    async def test_dry_run_skips_persistence(self) -> None:
        """With --dry-run, update_prediction_audit must never be called."""
        session = AsyncMock()

        with (
            patch(
                "scoutedge_intelligence.scripts.run_attribution.get_match",
                new=AsyncMock(return_value=_make_match()),
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.get_latest_prediction",
                new=AsyncMock(return_value=_make_prediction()),
            ),
            patch(
                "scoutedge_intelligence.scripts.run_attribution.update_prediction_audit",
                new=AsyncMock(),
            ) as mock_persist,
        ):
            result = await attribute_one(session, "match-001", dry_run=True)

        assert result["ok"] is True
        mock_persist.assert_not_called()
