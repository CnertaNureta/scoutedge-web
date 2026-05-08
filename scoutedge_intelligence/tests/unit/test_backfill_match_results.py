"""Unit tests for ``scoutedge_intelligence.scripts.backfill_match_results``.

Fully isolated — neither a real database nor a live API-Football account is
touched. The async session factory and APIFootballClient are mocked at the
module level.
"""

from __future__ import annotations

import argparse
import csv
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scoutedge_intelligence.scripts.backfill_match_results import (
    LocalPending,
    MatchPairing,
    RemoteResult,
    Unmatched,
    _coerce_async_url,
    _derive_outcome,
    _match_local_to_remote,
    _parse_csv_ints,
    _parse_remote_kickoff,
    apply_updates,
    main_async,
    pair_local_remote,
    parse_args,
    write_unmatched_csv,
)
from scoutedge_intelligence.scripts.team_aliases import normalise_team_name

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _build_args(**overrides: object) -> argparse.Namespace:
    base: dict[str, object] = {
        "since": "2022-01-01",
        "leagues": "1,4,5,9,10,32",
        "seasons": "2022,2023,2024,2025,2026",
        "max_fixtures": 5000,
        "dry_run": False,
        "unmatched_out": None,
    }
    base.update(overrides)
    return argparse.Namespace(**base)


def _local(
    match_id: str,
    home_name: str,
    away_name: str,
    kickoff: str = "2024-06-01T18:00:00+00:00",
    *,
    home_team_id: str = "team-h",
    away_team_id: str = "team-a",
) -> LocalPending:
    return LocalPending(
        match_id=match_id,
        home_team_id=home_team_id,
        away_team_id=away_team_id,
        home_team_name=home_name,
        away_team_name=away_name,
        kickoff_utc=datetime.fromisoformat(kickoff),
    )


def _remote(
    home_name: str,
    away_name: str,
    *,
    home_goals: int = 1,
    away_goals: int = 0,
    kickoff: str = "2024-06-01T18:00:00+00:00",
) -> RemoteResult:
    return RemoteResult(
        home_team_name=home_name,
        away_team_name=away_name,
        kickoff_utc=datetime.fromisoformat(kickoff),
        home_goals=home_goals,
        away_goals=away_goals,
    )


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------


class TestNormaliseTeamName:
    """normalise_team_name should collapse aliases + diacritics."""

    def test_normalise_team_name_aliases(self) -> None:
        assert normalise_team_name("USA") == "united states"
        assert normalise_team_name("United States") == "united states"
        assert normalise_team_name("South Korea") == "south korea"
        assert normalise_team_name("Korea Republic") == "south korea"
        assert normalise_team_name("IR Iran") == "iran"

    def test_normalise_team_name_diacritics(self) -> None:
        assert normalise_team_name("Türkiye") == "turkey"
        assert normalise_team_name("Côte d'Ivoire") == "ivory coast"
        assert normalise_team_name("Curaçao") == "curacao"

    def test_normalise_team_name_empty(self) -> None:
        assert normalise_team_name("") == ""


class TestDeriveOutcome:
    """_derive_outcome maps final scores onto the canonical labels."""

    def test_derive_outcome_home_win(self) -> None:
        assert _derive_outcome(2, 1) == "home_win"

    def test_derive_outcome_away_win(self) -> None:
        assert _derive_outcome(0, 3) == "away_win"

    def test_derive_outcome_draw(self) -> None:
        assert _derive_outcome(1, 1) == "draw"


class TestCoerceAsyncUrl:
    """_coerce_async_url upgrades plain postgresql:// URLs to asyncpg."""

    def test_coerce_async_url_upgrades_plain_postgres(self) -> None:
        out = _coerce_async_url("postgresql://user:pw@host/db")
        assert out == "postgresql+asyncpg://user:pw@host/db"

    def test_coerce_async_url_passthrough_when_already_async(self) -> None:
        out = _coerce_async_url("postgresql+asyncpg://user:pw@host/db")
        assert out == "postgresql+asyncpg://user:pw@host/db"


class TestParseCsvInts:
    """_parse_csv_ints accepts a comma-separated list of ints."""

    def test_parse_csv_ints_basic(self) -> None:
        assert _parse_csv_ints("1, 2,3", name="leagues") == [1, 2, 3]

    def test_parse_csv_ints_empty_raises(self) -> None:
        with pytest.raises(ValueError):
            _parse_csv_ints("", name="leagues")


class TestParseRemoteKickoff:
    """_parse_remote_kickoff handles ISO and Z-suffixed strings."""

    def test_parse_z_suffix(self) -> None:
        out = _parse_remote_kickoff("2024-06-01T18:00:00Z")
        assert out is not None
        assert out.tzinfo is not None
        assert out.year == 2024 and out.hour == 18

    def test_parse_invalid_returns_none(self) -> None:
        assert _parse_remote_kickoff("not-a-date") is None

    def test_parse_none(self) -> None:
        assert _parse_remote_kickoff(None) is None


# ---------------------------------------------------------------------------
# Matching
# ---------------------------------------------------------------------------


class TestMatchLocalToRemote:
    def test_match_local_to_remote_exact(self) -> None:
        local = _local("m1", "Brazil", "Argentina")
        remotes = [
            _remote("Germany", "France"),
            _remote("Brazil", "Argentina", home_goals=3, away_goals=2),
        ]
        hit = _match_local_to_remote(local, remotes)
        assert hit is not None
        assert hit.strategy == "exact"
        assert hit.remote.home_goals == 3 and hit.remote.away_goals == 2

    def test_match_local_to_remote_fuzzy_via_alias(self) -> None:
        local = _local("m2", "South Korea", "USA")
        remotes = [
            _remote("Korea Republic", "United States", home_goals=1, away_goals=1),
        ]
        hit = _match_local_to_remote(local, remotes)
        assert hit is not None
        assert hit.strategy == "fuzzy"

    def test_match_local_to_remote_reversed_pair(self) -> None:
        local = _local("m3", "Brazil", "Argentina")
        remotes = [
            _remote("Argentina", "Brazil", home_goals=2, away_goals=2),
        ]
        hit = _match_local_to_remote(local, remotes)
        assert hit is not None
        assert hit.strategy == "reversed"

    def test_match_local_to_remote_unmatched_when_kickoff_too_far(self) -> None:
        local = _local("m4", "Brazil", "Argentina", kickoff="2024-06-01T18:00:00+00:00")
        remotes = [
            _remote(
                "Brazil",
                "Argentina",
                kickoff="2024-06-05T18:00:00+00:00",  # > 24h diff
            ),
        ]
        assert _match_local_to_remote(local, remotes) is None

    def test_match_local_to_remote_within_window(self) -> None:
        local = _local("m5", "Brazil", "Argentina", kickoff="2024-06-01T18:00:00+00:00")
        remotes = [
            _remote(
                "Brazil",
                "Argentina",
                kickoff="2024-06-02T12:00:00+00:00",  # 18h diff < 24h
            ),
        ]
        assert _match_local_to_remote(local, remotes) is not None


class TestPairLocalRemote:
    def test_pair_local_remote_collects_unmatched(self) -> None:
        locals_ = [
            _local("m1", "Brazil", "Argentina"),
            _local("m2", "Germany", "Spain"),
        ]
        remotes = [
            _remote("Brazil", "Argentina"),
        ]
        pairings, unmatched = pair_local_remote(locals_, remotes)
        assert len(pairings) == 1
        assert len(unmatched) == 1
        assert unmatched[0].match_id == "m2"
        assert unmatched[0].reason == "no_remote_within_24h"


# ---------------------------------------------------------------------------
# parse_args
# ---------------------------------------------------------------------------


class TestParseArgs:
    def test_parse_args_defaults(self) -> None:
        ns = parse_args([])
        assert ns.since == "2022-01-01"
        assert ns.leagues == "1,4,5,9,10,32"
        assert ns.seasons == "2022,2023,2024,2025,2026"
        assert ns.max_fixtures == 5000
        assert ns.dry_run is False
        assert ns.unmatched_out is None

    def test_parse_args_custom(self) -> None:
        ns = parse_args(
            [
                "--since",
                "2020-01-01",
                "--leagues",
                "1,32",
                "--seasons",
                "2022",
                "--max-fixtures",
                "10",
                "--dry-run",
                "--unmatched-out",
                "out.csv",
            ]
        )
        assert ns.since == "2020-01-01"
        assert ns.leagues == "1,32"
        assert ns.seasons == "2022"
        assert ns.max_fixtures == 10
        assert ns.dry_run is True
        assert ns.unmatched_out == "out.csv"


# ---------------------------------------------------------------------------
# apply_updates / write_unmatched_csv
# ---------------------------------------------------------------------------


async def test_apply_updates_calls_session_execute_per_pairing() -> None:
    pairings = [
        MatchPairing(
            local=_local("m1", "Brazil", "Argentina"),
            remote=_remote("Brazil", "Argentina", home_goals=2, away_goals=1),
            strategy="exact",
        ),
    ]

    session = MagicMock()
    exec_result = MagicMock()
    exec_result.rowcount = 1
    session.execute = AsyncMock(return_value=exec_result)
    session.commit = AsyncMock()

    updated = await apply_updates(session, pairings)
    assert updated == 1
    session.execute.assert_awaited_once()
    session.commit.assert_awaited_once()


def test_write_unmatched_csv_round_trip(tmp_path: Path) -> None:
    rows = [
        Unmatched(
            match_id="m1",
            home_team_id="team-h",
            away_team_id="team-a",
            kickoff_utc=datetime(2024, 6, 1, 18, 0, tzinfo=UTC),
            reason="no_remote_within_24h",
        ),
    ]
    out = tmp_path / "unmatched.csv"
    write_unmatched_csv(str(out), rows)

    with open(out, encoding="utf-8") as fh:
        reader = list(csv.reader(fh))
    assert reader[0] == [
        "match_id",
        "home_team_id",
        "away_team_id",
        "kickoff_utc",
        "reason",
    ]
    assert reader[1][0] == "m1"
    assert reader[1][4] == "no_remote_within_24h"


# ---------------------------------------------------------------------------
# main_async failure modes
# ---------------------------------------------------------------------------


async def test_main_returns_1_when_database_url_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("API_FOOTBALL_KEY", "x")
    rc = await main_async(_build_args())
    assert rc == 1


async def test_main_returns_1_when_api_football_key_missing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://x/y")
    monkeypatch.delenv("API_FOOTBALL_KEY", raising=False)
    rc = await main_async(_build_args())
    assert rc == 1


async def test_main_returns_1_when_since_unparseable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://x/y")
    monkeypatch.setenv("API_FOOTBALL_KEY", "x")
    rc = await main_async(_build_args(since="not-a-date"))
    assert rc == 1


# ---------------------------------------------------------------------------
# main_async dry-run pipeline
# ---------------------------------------------------------------------------


def _make_session_cm() -> tuple[MagicMock, MagicMock]:
    session = MagicMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()

    session_cm = MagicMock()
    session_cm.__aenter__ = AsyncMock(return_value=session)
    session_cm.__aexit__ = AsyncMock(return_value=None)
    return session, session_cm


async def test_dry_run_skips_update(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://x/y")
    monkeypatch.setenv("API_FOOTBALL_KEY", "x")

    locals_ = [_local("m1", "Brazil", "Argentina")]
    remotes = [_remote("Brazil", "Argentina", home_goals=2, away_goals=1)]

    session, session_cm = _make_session_cm()
    fake_factory = MagicMock(return_value=session_cm)
    fake_client = MagicMock()
    fake_client.aclose = AsyncMock()

    with (
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.create_async_engine",
            return_value=MagicMock(),
        ),
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.async_sessionmaker",
            return_value=fake_factory,
        ),
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.APIFootballClient",
            return_value=fake_client,
        ),
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.list_local_pending",
            new=AsyncMock(return_value=locals_),
        ),
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.fetch_remote_finished",
            new=AsyncMock(return_value=remotes),
        ),
    ):
        rc = await main_async(_build_args(dry_run=True))

    assert rc == 0
    # Dry-run must not issue UPDATE statements or commit.
    session.execute.assert_not_awaited()
    session.commit.assert_not_awaited()


async def test_full_pipeline_with_mocked_session_and_client(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """3 local pending → 4 remote → 2 exact + 1 reversed = 3 updates, 0 unmatched."""
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://x/y")
    monkeypatch.setenv("API_FOOTBALL_KEY", "x")

    base_kickoff = "2024-06-01T18:00:00+00:00"
    locals_ = [
        _local("m1", "Brazil", "Argentina", kickoff=base_kickoff, home_team_id="b", away_team_id="a"),
        _local("m2", "Germany", "France", kickoff=base_kickoff, home_team_id="g", away_team_id="f"),
        _local("m3", "Spain", "Italy", kickoff=base_kickoff, home_team_id="s", away_team_id="i"),
    ]
    remotes = [
        _remote("Brazil", "Argentina", home_goals=2, away_goals=1, kickoff=base_kickoff),
        _remote("Germany", "France", home_goals=0, away_goals=0, kickoff=base_kickoff),
        # Reversed pair for m3 — Italy hosting Spain
        _remote("Italy", "Spain", home_goals=1, away_goals=2, kickoff=base_kickoff),
        # Unrelated remote to ensure noise tolerated
        _remote("Mexico", "USA", home_goals=1, away_goals=1, kickoff=base_kickoff),
    ]

    session, session_cm = _make_session_cm()
    exec_result = MagicMock()
    exec_result.rowcount = 1
    session.execute = AsyncMock(return_value=exec_result)
    fake_factory = MagicMock(return_value=session_cm)
    fake_client = MagicMock()
    fake_client.aclose = AsyncMock()

    out_path = tmp_path / "unmatched.csv"

    with (
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.create_async_engine",
            return_value=MagicMock(),
        ),
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.async_sessionmaker",
            return_value=fake_factory,
        ),
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.APIFootballClient",
            return_value=fake_client,
        ),
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.list_local_pending",
            new=AsyncMock(return_value=locals_),
        ),
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.fetch_remote_finished",
            new=AsyncMock(return_value=remotes),
        ),
    ):
        rc = await main_async(_build_args(unmatched_out=str(out_path)))

    assert rc == 0
    # 3 UPDATEs issued + commit called once.
    assert session.execute.await_count == 3
    session.commit.assert_awaited_once()
    # Unmatched CSV should be written with header only (zero unmatched rows).
    assert out_path.exists()
    with open(out_path, encoding="utf-8") as fh:
        rows = list(csv.reader(fh))
    assert rows[0][0] == "match_id"
    assert len(rows) == 1  # header only


async def test_full_pipeline_records_unmatched(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """One local with no remote candidate must end up in the unmatched CSV."""
    monkeypatch.setenv("DATABASE_URL", "postgresql+asyncpg://x/y")
    monkeypatch.setenv("API_FOOTBALL_KEY", "x")

    locals_ = [
        _local("m1", "Brazil", "Argentina"),
        # Way outside the 24h window — no match available.
        _local(
            "m2",
            "Germany",
            "France",
            kickoff=(datetime(2024, 6, 1, tzinfo=UTC) + timedelta(days=10)).isoformat(),
        ),
    ]
    remotes = [
        _remote("Brazil", "Argentina", home_goals=2, away_goals=1),
    ]

    session, session_cm = _make_session_cm()
    exec_result = MagicMock()
    exec_result.rowcount = 1
    session.execute = AsyncMock(return_value=exec_result)
    fake_factory = MagicMock(return_value=session_cm)
    fake_client = MagicMock()
    fake_client.aclose = AsyncMock()

    out_path = tmp_path / "unmatched.csv"

    with (
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.create_async_engine",
            return_value=MagicMock(),
        ),
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.async_sessionmaker",
            return_value=fake_factory,
        ),
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.APIFootballClient",
            return_value=fake_client,
        ),
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.list_local_pending",
            new=AsyncMock(return_value=locals_),
        ),
        patch(
            "scoutedge_intelligence.scripts.backfill_match_results.fetch_remote_finished",
            new=AsyncMock(return_value=remotes),
        ),
    ):
        rc = await main_async(_build_args(unmatched_out=str(out_path)))

    assert rc == 0
    # 1 UPDATE for the matched pair.
    assert session.execute.await_count == 1
    # Exactly 1 unmatched row in the CSV.
    with open(out_path, encoding="utf-8") as fh:
        rows = list(csv.reader(fh))
    assert len(rows) == 2  # header + 1
    assert rows[1][0] == "m2"
