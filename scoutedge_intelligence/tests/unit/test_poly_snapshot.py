"""Unit tests for scoutedge_intelligence.scripts.poly_snapshot.

All network and database calls are mocked — no real connections are made.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scoutedge_intelligence.scripts.poly_snapshot import (
    DEFAULT_HORIZON_DAYS,
    DEFAULT_RATE_LIMIT_QPS,
    parse_args,
    run,
    snapshot_match,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SAMPLE_MARKET_DATA: dict[str, Any] = {
    "prob_home": 0.50,
    "prob_draw": 0.25,
    "prob_away": 0.25,
    "liquidity": 10_000.0,
    "volume_24h": 2_500.0,
    "bid_ask_spread": 0.02,
    "raw": {"id": "market-abc", "slug": "match-1"},
}


def _make_poly_client(*, raises: Exception | None = None) -> AsyncMock:
    """Return a mock PolymarketClient."""
    client = MagicMock()
    if raises is not None:
        client.fetch_market = AsyncMock(side_effect=raises)
    else:
        client.fetch_market = AsyncMock(return_value=SAMPLE_MARKET_DATA)
    client.aclose = AsyncMock()
    return client


def _make_session() -> AsyncMock:
    """Return a mock AsyncSession whose execute returns an empty result."""
    session = AsyncMock()
    session.execute = AsyncMock(return_value=MagicMock(all=lambda: []))
    session.commit = AsyncMock()
    return session


# ---------------------------------------------------------------------------
# parse_args tests
# ---------------------------------------------------------------------------


class TestParseArgs:
    def test_defaults(self) -> None:
        """parse_args() with no arguments should return all defaults."""
        ns = parse_args([])
        assert ns.horizon_days == DEFAULT_HORIZON_DAYS
        assert ns.rate_limit_qps == DEFAULT_RATE_LIMIT_QPS
        assert ns.dry_run is False
        assert ns.match_ids is None

    def test_match_ids_parsed_as_string(self) -> None:
        """--match-ids should be stored as a raw comma-separated string."""
        ns = parse_args(["--match-ids", "id1,id2"])
        assert ns.match_ids == "id1,id2"
        # Confirm splitting produces exactly two items.
        ids = [m.strip() for m in ns.match_ids.split(",") if m.strip()]
        assert ids == ["id1", "id2"]
        assert len(ids) == 2

    def test_horizon_days_override(self) -> None:
        """--horizon-days should override the default."""
        ns = parse_args(["--horizon-days", "7"])
        assert ns.horizon_days == 7

    def test_dry_run_flag(self) -> None:
        """--dry-run should set dry_run to True."""
        ns = parse_args(["--dry-run"])
        assert ns.dry_run is True

    def test_rate_limit_qps_override(self) -> None:
        """--rate-limit-qps should be stored as a float."""
        ns = parse_args(["--rate-limit-qps", "0.5"])
        assert ns.rate_limit_qps == pytest.approx(0.5)


# ---------------------------------------------------------------------------
# snapshot_match tests
# ---------------------------------------------------------------------------


class TestSnapshotMatch:
    @pytest.mark.asyncio
    async def test_happy_path_returns_ok_true(self) -> None:
        """snapshot_match with a healthy client returns ok=True and data."""
        poly_client = _make_poly_client()
        session = _make_session()

        with patch(
            "scoutedge_intelligence.scripts.poly_snapshot.queries.upsert_polymarket_snapshot",
            new_callable=AsyncMock,
        ) as mock_upsert:
            result = await snapshot_match(poly_client, session, "match-1")

        assert result["ok"] is True
        assert result["error"] is None
        assert result["match_id"] == "match-1"
        assert result["data"] is not None
        assert result["data"]["prob_home"] == pytest.approx(0.50)
        mock_upsert.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_poly_client_raises_returns_ok_false(self) -> None:
        """snapshot_match must catch exceptions and return ok=False without re-raising."""
        poly_client = _make_poly_client(raises=ValueError("market not found"))
        session = _make_session()

        with patch(
            "scoutedge_intelligence.scripts.poly_snapshot.queries.upsert_polymarket_snapshot",
            new_callable=AsyncMock,
        ) as mock_upsert:
            result = await snapshot_match(poly_client, session, "bad-match")

        assert result["ok"] is False
        assert "market not found" in result["error"]
        assert result["data"] is None
        # No DB write should have been attempted.
        mock_upsert.assert_not_called()

    @pytest.mark.asyncio
    async def test_dry_run_skips_upsert(self) -> None:
        """dry_run=True fetches but does not call upsert_polymarket_snapshot."""
        poly_client = _make_poly_client()
        session = _make_session()

        with patch(
            "scoutedge_intelligence.scripts.poly_snapshot.queries.upsert_polymarket_snapshot",
            new_callable=AsyncMock,
        ) as mock_upsert:
            result = await snapshot_match(poly_client, session, "match-dry", dry_run=True)

        assert result["ok"] is True
        mock_upsert.assert_not_called()

    @pytest.mark.asyncio
    async def test_http_error_does_not_propagate(self) -> None:
        """An httpx.HTTPError from the client must be swallowed and returned as ok=False."""
        import httpx

        poly_client = _make_poly_client(raises=httpx.HTTPError("timeout"))
        session = _make_session()

        with patch(
            "scoutedge_intelligence.scripts.poly_snapshot.queries.upsert_polymarket_snapshot",
            new_callable=AsyncMock,
        ):
            result = await snapshot_match(poly_client, session, "timeout-match")

        assert result["ok"] is False
        assert "timeout" in result["error"]


# ---------------------------------------------------------------------------
# run() orchestration tests
# ---------------------------------------------------------------------------


def _make_args(
    *,
    match_ids: str | None = None,
    horizon_days: int = DEFAULT_HORIZON_DAYS,
    rate_limit_qps: float = DEFAULT_RATE_LIMIT_QPS,
    dry_run: bool = False,
) -> object:
    """Build a minimal argparse.Namespace-like object for run()."""
    import argparse

    ns = argparse.Namespace()
    ns.match_ids = match_ids
    ns.horizon_days = horizon_days
    ns.rate_limit_qps = rate_limit_qps
    ns.dry_run = dry_run
    return ns


class TestRun:
    def _make_engine_mock(self) -> MagicMock:
        """Return a MagicMock engine whose dispose() is awaitable."""
        engine = MagicMock()
        engine.dispose = AsyncMock()
        return engine

    @pytest.mark.asyncio
    async def test_three_matches_one_fails_totals(self) -> None:
        """run() with 3 matches where 1 fails → total=3, ok=2, failed=1."""
        args = _make_args(match_ids="m1,m2,m3")

        async def _fake_snapshot(
            poly_client: Any, session: Any, match_id: str, *, dry_run: bool = False
        ) -> dict[str, Any]:
            if match_id == "m2":
                return {"match_id": match_id, "ok": False, "error": "boom", "data": None}
            return {"match_id": match_id, "ok": True, "error": None, "data": SAMPLE_MARKET_DATA}

        with (
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.create_async_engine",
                return_value=self._make_engine_mock(),
            ),
            patch("scoutedge_intelligence.scripts.poly_snapshot.async_sessionmaker"),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.PolymarketClient",
                return_value=_make_poly_client(),
            ),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.snapshot_match",
                side_effect=_fake_snapshot,
            ),
        ):
            summary = await run(args)

        assert summary["total"] == 3
        assert summary["ok"] == 2
        assert summary["failed"] == 1

    @pytest.mark.asyncio
    async def test_dry_run_skipped_dry_run_equals_total(self) -> None:
        """run() with --dry-run → skipped_dry_run==total, no upsert calls."""
        args = _make_args(match_ids="m1,m2", dry_run=True)

        async def _fake_snapshot(
            poly_client: Any, session: Any, match_id: str, *, dry_run: bool = False
        ) -> dict[str, Any]:
            return {"match_id": match_id, "ok": True, "error": None, "data": SAMPLE_MARKET_DATA}

        with (
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.create_async_engine",
                return_value=self._make_engine_mock(),
            ),
            patch("scoutedge_intelligence.scripts.poly_snapshot.async_sessionmaker"),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.PolymarketClient",
                return_value=_make_poly_client(),
            ),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.snapshot_match",
                side_effect=_fake_snapshot,
            ),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.queries.upsert_polymarket_snapshot",
                new_callable=AsyncMock,
            ) as mock_upsert,
        ):
            summary = await run(args)

        assert summary["skipped_dry_run"] == summary["total"]
        assert summary["total"] == 2
        mock_upsert.assert_not_called()

    @pytest.mark.asyncio
    async def test_rate_limit_sleep_called_between_matches(self) -> None:
        """asyncio.sleep is called at least once when there are 2+ matches."""
        args = _make_args(match_ids="m1,m2,m3", rate_limit_qps=2.0)

        async def _fake_snapshot(
            poly_client: Any, session: Any, match_id: str, *, dry_run: bool = False
        ) -> dict[str, Any]:
            return {"match_id": match_id, "ok": True, "error": None, "data": SAMPLE_MARKET_DATA}

        with (
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.create_async_engine",
                return_value=self._make_engine_mock(),
            ),
            patch("scoutedge_intelligence.scripts.poly_snapshot.async_sessionmaker"),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.PolymarketClient",
                return_value=_make_poly_client(),
            ),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.snapshot_match",
                side_effect=_fake_snapshot,
            ),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.asyncio.sleep", new_callable=AsyncMock
            ) as mock_sleep,
        ):
            await run(args)

        # With 3 matches, sleep is called twice (between 1→2 and 2→3).
        assert mock_sleep.call_count >= 1
        # Verify the sleep interval corresponds to the QPS setting.
        for call in mock_sleep.call_args_list:
            assert call.args[0] == pytest.approx(1.0 / 2.0)

    @pytest.mark.asyncio
    async def test_no_sleep_on_single_match(self) -> None:
        """asyncio.sleep is NOT called when there is only one match."""
        args = _make_args(match_ids="m1")

        async def _fake_snapshot(
            poly_client: Any, session: Any, match_id: str, *, dry_run: bool = False
        ) -> dict[str, Any]:
            return {"match_id": match_id, "ok": True, "error": None, "data": SAMPLE_MARKET_DATA}

        with (
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.create_async_engine",
                return_value=self._make_engine_mock(),
            ),
            patch("scoutedge_intelligence.scripts.poly_snapshot.async_sessionmaker"),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.PolymarketClient",
                return_value=_make_poly_client(),
            ),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.snapshot_match",
                side_effect=_fake_snapshot,
            ),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.asyncio.sleep", new_callable=AsyncMock
            ) as mock_sleep,
        ):
            summary = await run(args)

        mock_sleep.assert_not_called()
        assert summary["total"] == 1
