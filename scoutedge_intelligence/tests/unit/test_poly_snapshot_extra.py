"""Extra coverage for poly_snapshot: paths missed by test_poly_snapshot.

Targets:
- fetch_target_match_ids: queries Match table and returns list of ids
- run() falls back to fetch_target_match_ids when --match-ids is empty
- run() counts a failed dry-run match in failed_count
- main() returns 0 on success, 1 on any failure
"""

from __future__ import annotations

import contextlib
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scoutedge_intelligence.scripts import poly_snapshot as ps

# ---------------------------------------------------------------------------
# fetch_target_match_ids
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_target_match_ids_returns_ordered_ids() -> None:
    result = MagicMock()
    result.all.return_value = [("m-001",), ("m-002",), ("m-003",)]
    session = MagicMock()
    session.execute = AsyncMock(return_value=result)

    ids = await ps.fetch_target_match_ids(session, horizon_days=7)

    assert ids == ["m-001", "m-002", "m-003"]
    session.execute.assert_awaited_once()


# ---------------------------------------------------------------------------
# run() — fallback to DB when --match-ids is empty
# ---------------------------------------------------------------------------


def _make_args(**overrides: Any) -> Any:
    args = MagicMock()
    args.match_ids = None
    args.horizon_days = 7
    args.rate_limit_qps = 100.0
    args.dry_run = False
    for k, v in overrides.items():
        setattr(args, k, v)
    return args


def _patch_run_env(snapshot_results: list[dict[str, Any]]):
    """Build the standard set of patches for run() with a stubbed session."""
    session = MagicMock()
    session_cm = MagicMock()
    session_cm.__aenter__ = AsyncMock(return_value=session)
    session_cm.__aexit__ = AsyncMock(return_value=False)
    session_factory = MagicMock(return_value=session_cm)

    poly_client = MagicMock()
    poly_client.aclose = AsyncMock()

    engine = MagicMock()
    engine.dispose = AsyncMock()

    snapshot_mock = AsyncMock(side_effect=snapshot_results)

    return (
        session,
        snapshot_mock,
        [
            patch.dict("os.environ", {"DATABASE_URL": "postgresql+asyncpg://stub/db"}),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.create_async_engine",
                return_value=engine,
            ),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.async_sessionmaker",
                return_value=session_factory,
            ),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.PolymarketClient",
                return_value=poly_client,
            ),
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.snapshot_match",
                new=snapshot_mock,
            ),
        ],
    )


@pytest.mark.asyncio
async def test_run_uses_fetch_target_match_ids_when_match_ids_empty() -> None:
    args = _make_args(match_ids="")
    _, snapshot_mock, ctxs = _patch_run_env(
        [{"match_id": "m-1", "ok": True, "error": None, "data": {}}]
    )

    with contextlib.ExitStack() as stack:
        for cm in ctxs:
            stack.enter_context(cm)
        fetch_mock = stack.enter_context(
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.fetch_target_match_ids",
                new=AsyncMock(return_value=["m-1"]),
            )
        )
        summary = await ps.run(args)

    fetch_mock.assert_awaited_once()
    assert summary == {"total": 1, "ok": 1, "failed": 0, "skipped_dry_run": 0}
    snapshot_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_run_dry_run_failed_increments_failed_count() -> None:
    args = _make_args(match_ids="m-1,m-2", dry_run=True)
    _, _, ctxs = _patch_run_env(
        [
            {"match_id": "m-1", "ok": True, "error": None, "data": {}},
            {"match_id": "m-2", "ok": False, "error": "boom", "data": None},
        ]
    )

    with contextlib.ExitStack() as stack:
        for cm in ctxs:
            stack.enter_context(cm)
        stack.enter_context(
            patch(
                "scoutedge_intelligence.scripts.poly_snapshot.asyncio.sleep",
                new=AsyncMock(),
            )
        )
        summary = await ps.run(args)

    assert summary == {"total": 2, "ok": 1, "failed": 1, "skipped_dry_run": 2}


# ---------------------------------------------------------------------------
# main() — exit codes
# ---------------------------------------------------------------------------


def test_main_returns_0_when_no_failures() -> None:
    fake_args = MagicMock()
    with (
        patch(
            "scoutedge_intelligence.scripts.poly_snapshot.parse_args",
            return_value=fake_args,
        ),
        patch(
            "scoutedge_intelligence.scripts.poly_snapshot.asyncio.run",
            return_value={"total": 3, "ok": 3, "failed": 0, "skipped_dry_run": 0},
        ),
    ):
        assert ps.main() == 0


def test_main_returns_1_when_any_failure() -> None:
    fake_args = MagicMock()
    with (
        patch(
            "scoutedge_intelligence.scripts.poly_snapshot.parse_args",
            return_value=fake_args,
        ),
        patch(
            "scoutedge_intelligence.scripts.poly_snapshot.asyncio.run",
            return_value={"total": 3, "ok": 2, "failed": 1, "skipped_dry_run": 0},
        ),
    ):
        assert ps.main() == 1
