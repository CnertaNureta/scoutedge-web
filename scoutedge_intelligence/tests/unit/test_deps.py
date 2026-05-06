"""Direct unit tests for api.deps internals.

Covers paths not exercised by test_api_scaffold:
- EngineFactory.__init__ singleton wiring
- EngineFactory.build() returns a TripleLayerEngine
- EngineFactory.aclose() closes async clients
- _make_async_engine wires SQLAlchemy correctly
- get_db_session async iterator
- get_engine_factory dependency lookup
"""

from __future__ import annotations

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
