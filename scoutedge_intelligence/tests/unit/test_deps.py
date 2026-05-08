"""Direct unit tests for api.deps internals.

Covers paths not exercised by test_api_scaffold:
- EngineFactory.__init__ singleton wiring
- EngineFactory.build() returns a TripleLayerEngine
- EngineFactory.aclose() closes async clients
- _make_async_engine wires SQLAlchemy correctly
- get_db_session async iterator
- get_engine_factory dependency lookup
- Warm-up: Dixon-Coles params loaded from latest artifact
- Warm-up: ELO seeded from DB rows; degrades on missing data / failure
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from api.deps import (
    EngineFactory,
    Settings,
    _make_async_engine,
    get_db_session,
    get_engine_factory,
)
from scoutedge_intelligence.models.dixon_coles import DixonColesModel
from scoutedge_intelligence.models.elo import FootballELO
from scoutedge_intelligence.synthesis.engine import TripleLayerEngine


def _stub_settings(**overrides: Any) -> Settings:
    defaults = {
        "database_url": "sqlite+aiosqlite:///./test_deps.db",
        "redis_url": "redis://localhost:6379",
        "cors_origins": ["http://localhost:3000"],
        "api_key": None,
        "rate_limit_per_minute": 120,
        "log_level": "DEBUG",
    }
    defaults.update(overrides)
    return Settings.model_construct(**defaults)


def _patched_factory() -> EngineFactory:
    """Build an EngineFactory with all heavy collaborators stubbed."""
    with (
        patch("api.deps.FootballELO", return_value=MagicMock()),
        patch("api.deps.DixonColesModel", return_value=MagicMock()),
        patch("api.deps.PolymarketClient", return_value=MagicMock()),
        patch("api.deps.SportsbookClient", return_value=MagicMock()),
        patch("api.deps.FeatureGenerator", return_value=MagicMock()),
        patch("api.deps.DivergenceAnalyst", return_value=MagicMock()),
        patch("api.deps.JSONSynthesizer", return_value=MagicMock()),
        patch("api.deps.Translator", return_value=MagicMock()),
        patch("api.deps._load_dc_params_from_disk", return_value=None),
        patch("api.deps._seed_elo_from_db", return_value=0),
    ):
        return EngineFactory(_stub_settings())


def test_engine_factory_init_constructs_singletons() -> None:
    factory = _patched_factory()
    assert factory._elo is not None
    assert factory._dixon_coles is not None
    assert factory._polymarket is not None
    assert factory._sportsbook is not None
    assert factory._feature_generator is not None
    assert factory._analyst is not None
    assert factory._synthesizer is not None
    assert factory._translator is not None


@pytest.mark.asyncio
async def test_engine_factory_build_returns_triple_layer_engine() -> None:
    factory = _patched_factory()
    engine = await factory.build()
    assert isinstance(engine, TripleLayerEngine)


@pytest.mark.asyncio
async def test_engine_factory_aclose_closes_http_clients() -> None:
    factory = _patched_factory()
    factory._polymarket.aclose = AsyncMock()
    factory._sportsbook.aclose = AsyncMock()
    await factory.aclose()
    factory._polymarket.aclose.assert_awaited_once()
    factory._sportsbook.aclose.assert_awaited_once()


def test_make_async_engine_uses_settings_url() -> None:
    settings = _stub_settings(database_url="sqlite+aiosqlite:///./made.db")
    sentinel = MagicMock(name="async_engine")
    with patch("api.deps.create_async_engine", return_value=sentinel) as cae:
        result = _make_async_engine(settings)
    assert result is sentinel
    cae.assert_called_once_with("sqlite+aiosqlite:///./made.db", pool_pre_ping=True, echo=False)


def test_make_async_engine_normalizes_plain_postgres_url() -> None:
    settings = _stub_settings(database_url="postgres://user:pw@host/db")
    sentinel = MagicMock(name="async_engine")
    with patch("api.deps.create_async_engine", return_value=sentinel) as cae:
        result = _make_async_engine(settings)
    assert result is sentinel
    cae.assert_called_once_with(
        "postgresql+asyncpg://user:pw@host/db",
        pool_pre_ping=True,
        echo=False,
    )


@pytest.mark.asyncio
async def test_get_db_session_yields_session_from_app_state() -> None:
    session = MagicMock(name="async_session")
    session_cm = AsyncMock()
    session_cm.__aenter__.return_value = session
    session_cm.__aexit__.return_value = None
    factory_callable = MagicMock(return_value=session_cm)

    request = MagicMock()
    request.app.state.session_factory = factory_callable

    yielded: list[Any] = []
    async for s in get_db_session(request):
        yielded.append(s)

    assert yielded == [session]
    factory_callable.assert_called_once_with()


def test_get_engine_factory_returns_app_state_factory() -> None:
    sentinel = MagicMock(name="engine_factory")
    request = MagicMock()
    request.app.state.engine_factory = sentinel
    assert get_engine_factory(request) is sentinel


# ---------------------------------------------------------------------------
# Warm-up tests
# ---------------------------------------------------------------------------


def _write_params_artifact(path: Path, fitted_at: str) -> None:
    payload = {
        "attack": {"Brazil": 0.42, "Germany": 0.31},
        "defense": {"Brazil": -0.18, "Germany": -0.22},
        "home_advantage": 0.27,
        "rho": -0.14,
        "fitted_at": fitted_at,
    }
    path.write_text(json.dumps(payload))


def test_engine_factory_warmup_loads_latest_params_file(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    older = tmp_path / "params_20251231_2359.json"
    newer = tmp_path / "params_20260315_1042.json"
    _write_params_artifact(older, "2025-12-31T23:59:00+00:00")
    _write_params_artifact(newer, "2026-03-15T10:42:00+00:00")

    # Add a non-matching file; must be ignored.
    (tmp_path / "params_old.json").write_text("{}")

    monkeypatch.setenv("SCOUTEDGE_PARAMS_DIR", str(tmp_path))

    with (
        patch("api.deps.PolymarketClient", return_value=MagicMock()),
        patch("api.deps.SportsbookClient", return_value=MagicMock()),
        patch("api.deps.FeatureGenerator", return_value=MagicMock()),
        patch("api.deps.DivergenceAnalyst", return_value=MagicMock()),
        patch("api.deps.JSONSynthesizer", return_value=MagicMock()),
        patch("api.deps.Translator", return_value=MagicMock()),
        patch("api.deps._seed_elo_from_db", return_value=0),
    ):
        factory = EngineFactory(_stub_settings())

    assert isinstance(factory._dixon_coles, DixonColesModel)
    assert factory._dixon_coles.params is not None
    # Newer artifact wins.
    assert factory._dixon_coles.params.attack == {"Brazil": 0.42, "Germany": 0.31}
    assert factory._dixon_coles.params.home_advantage == pytest.approx(0.27)
    assert factory._dixon_coles.params.rho == pytest.approx(-0.14)


def test_engine_factory_warmup_skips_when_params_dir_missing(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    missing_dir = tmp_path / "does-not-exist"
    monkeypatch.setenv("SCOUTEDGE_PARAMS_DIR", str(missing_dir))

    with (
        patch("api.deps.PolymarketClient", return_value=MagicMock()),
        patch("api.deps.SportsbookClient", return_value=MagicMock()),
        patch("api.deps.FeatureGenerator", return_value=MagicMock()),
        patch("api.deps.DivergenceAnalyst", return_value=MagicMock()),
        patch("api.deps.JSONSynthesizer", return_value=MagicMock()),
        patch("api.deps.Translator", return_value=MagicMock()),
        patch("api.deps._seed_elo_from_db", return_value=0),
    ):
        factory = EngineFactory(_stub_settings())

    assert isinstance(factory._dixon_coles, DixonColesModel)
    # Graceful: no params attached, no exception raised.
    assert factory._dixon_coles.params is None


def test_engine_factory_warmup_seeds_elo_from_db_rows(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    rows = [
        MagicMock(team_id="team-brazil", rating=1820.5),
        MagicMock(team_id="team-germany", rating=1795.0),
        MagicMock(team_id="team-argentina", rating=1888.25),
    ]

    fake_conn = MagicMock()
    fake_conn.execute.return_value = iter(rows)
    fake_conn.__enter__ = MagicMock(return_value=fake_conn)
    fake_conn.__exit__ = MagicMock(return_value=None)

    fake_engine = MagicMock()
    fake_engine.connect.return_value = fake_conn

    # Disable artifact loading and point at a tmp dir that doesn't exist.
    monkeypatch.setenv("SCOUTEDGE_PARAMS_DIR", "/tmp/scoutedge-no-such-dir")

    with (
        patch("api.deps.PolymarketClient", return_value=MagicMock()),
        patch("api.deps.SportsbookClient", return_value=MagicMock()),
        patch("api.deps.FeatureGenerator", return_value=MagicMock()),
        patch("api.deps.DivergenceAnalyst", return_value=MagicMock()),
        patch("api.deps.JSONSynthesizer", return_value=MagicMock()),
        patch("api.deps.Translator", return_value=MagicMock()),
        patch("api.deps.create_engine", return_value=fake_engine) as ce,
    ):
        factory = EngineFactory(_stub_settings(database_url="postgresql+asyncpg://x/y"))

    # Sync URL must coerce async hint to psycopg v3 (the installed sync driver).
    assert ce.call_args.args[0] == "postgresql+psycopg://x/y"
    assert isinstance(factory._elo, FootballELO)
    assert factory._elo._ratings == {
        "team-brazil": 1820.5,
        "team-germany": 1795.0,
        "team-argentina": 1888.25,
    }
    fake_engine.dispose.assert_called_once_with()


def test_engine_factory_warmup_normalizes_legacy_postgres_url(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_conn = MagicMock()
    fake_conn.execute.return_value = iter([])
    fake_conn.__enter__ = MagicMock(return_value=fake_conn)
    fake_conn.__exit__ = MagicMock(return_value=None)

    fake_engine = MagicMock()
    fake_engine.connect.return_value = fake_conn

    monkeypatch.setenv("SCOUTEDGE_PARAMS_DIR", "/tmp/scoutedge-no-such-dir")

    with (
        patch("api.deps.PolymarketClient", return_value=MagicMock()),
        patch("api.deps.SportsbookClient", return_value=MagicMock()),
        patch("api.deps.FeatureGenerator", return_value=MagicMock()),
        patch("api.deps.DivergenceAnalyst", return_value=MagicMock()),
        patch("api.deps.JSONSynthesizer", return_value=MagicMock()),
        patch("api.deps.Translator", return_value=MagicMock()),
        patch("api.deps.create_engine", return_value=fake_engine) as ce,
    ):
        EngineFactory(_stub_settings(database_url="postgres://x/y"))

    assert ce.call_args.args[0] == "postgresql+psycopg://x/y"


def test_engine_factory_warmup_skips_elo_when_db_query_fails(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_engine = MagicMock()
    fake_engine.connect.side_effect = RuntimeError("connection refused")

    monkeypatch.setenv("SCOUTEDGE_PARAMS_DIR", "/tmp/scoutedge-no-such-dir")

    with (
        patch("api.deps.PolymarketClient", return_value=MagicMock()),
        patch("api.deps.SportsbookClient", return_value=MagicMock()),
        patch("api.deps.FeatureGenerator", return_value=MagicMock()),
        patch("api.deps.DivergenceAnalyst", return_value=MagicMock()),
        patch("api.deps.JSONSynthesizer", return_value=MagicMock()),
        patch("api.deps.Translator", return_value=MagicMock()),
        patch("api.deps.create_engine", return_value=fake_engine),
    ):
        # Constructor must not raise.
        factory = EngineFactory(_stub_settings())

    assert isinstance(factory._elo, FootballELO)
    assert factory._elo._ratings == {}
    # Engine must still be disposed even on failure.
    fake_engine.dispose.assert_called_once_with()
