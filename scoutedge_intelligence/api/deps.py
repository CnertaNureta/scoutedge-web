"""Dependency injection helpers for the ScoutEdge FastAPI service.

Provides:
- Settings: pydantic-settings model loaded from environment / .env file.
- EngineFactory: builds a TripleLayerEngine on demand, sharing singletons
  (HTTP clients, ML model instances) across requests.
- get_db_session: async-iterator FastAPI dependency yielding an AsyncSession.
- get_engine_factory: FastAPI dependency returning the app-scoped EngineFactory.

Note: ML models (ELO, Dixon-Coles) are loaded once at factory initialisation
and reused per-request. HTTP clients are closed on EngineFactory.aclose().
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Annotated

import structlog
from fastapi import Depends, Request
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from scoutedge_intelligence.analyst.divergence import DivergenceAnalyst
from scoutedge_intelligence.claude.feature_generator import FeatureGenerator
from scoutedge_intelligence.claude.translator import Translator
from scoutedge_intelligence.models.dixon_coles import DixonColesModel
from scoutedge_intelligence.models.elo import FootballELO
from scoutedge_intelligence.sources.polymarket import PolymarketClient
from scoutedge_intelligence.sources.sportsbook import SportsbookClient
from scoutedge_intelligence.synthesis.engine import TripleLayerEngine
from scoutedge_intelligence.synthesis.synthesizer import JSONSynthesizer

logger: structlog.BoundLogger = structlog.get_logger(__name__)


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------


class Settings(BaseSettings):
    """Application configuration loaded from environment variables or .env.

    All fields have sensible defaults for local development. In production,
    override via environment variables (e.g. DATABASE_URL=...).
    """

    database_url: str = "postgresql+asyncpg://localhost/scoutedge"
    redis_url: str = "redis://localhost:6379"
    cors_origins: list[str] = Field(default=["http://localhost:3000", "https://scoutedge.app"])
    api_key: str | None = None  # when set, x-api-key header required on non-exempt paths
    rate_limit_per_minute: int = 120
    log_level: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# ---------------------------------------------------------------------------
# EngineFactory
# ---------------------------------------------------------------------------


class EngineFactory:
    """Builds a TripleLayerEngine per-request with shared singleton collaborators.

    Singleton lifecycle (owned by this factory):
    - FootballELO and DixonColesModel: constructed once, reused for all requests.
    - PolymarketClient and SportsbookClient: async HTTP clients constructed once
      and closed via aclose().
    - FeatureGenerator, DivergenceAnalyst, JSONSynthesizer, Translator: constructed
      once; each holds an AsyncAnthropic client internally.

    Per-request (not shared):
    - TripleLayerEngine is cheap to construct; a new instance is created per build()
      call so that its internal state cannot leak between concurrent requests.
    """

    def __init__(self, settings: Settings) -> None:
        """Initialise shared singletons from settings.

        Args:
            settings: Application settings.
        """
        self._settings = settings
        logger.info("engine_factory.init", log_level=settings.log_level)

        # ML models — in-process, no I/O at construction time
        self._elo = FootballELO()
        self._dixon_coles = DixonColesModel()

        # External API clients — share httpx connection pools
        self._polymarket = PolymarketClient()
        self._sportsbook = SportsbookClient()

        # Claude collaborators — share AsyncAnthropic clients
        self._feature_generator = FeatureGenerator()
        self._analyst = DivergenceAnalyst()
        self._synthesizer = JSONSynthesizer()
        self._translator = Translator()

    async def build(self) -> TripleLayerEngine:
        """Construct and return a fresh TripleLayerEngine for one request.

        All collaborators are shared singletons; only the engine wrapper is
        new so there is no per-request cross-contamination of state.

        Returns:
            A ready-to-use TripleLayerEngine.
        """
        return TripleLayerEngine(
            elo=self._elo,
            dixon_coles=self._dixon_coles,
            polymarket=self._polymarket,
            sportsbook=self._sportsbook,
            feature_generator=self._feature_generator,
            analyst=self._analyst,
            synthesizer=self._synthesizer,
            translator=self._translator,
        )

    async def aclose(self) -> None:
        """Close owned async clients.

        Called during application shutdown via the lifespan context manager.
        """
        logger.info("engine_factory.aclose")
        try:
            await self._polymarket.aclose()
        except Exception as exc:  # pragma: no cover
            logger.warning("engine_factory.polymarket_close_failed", error=str(exc))
        try:
            await self._sportsbook.aclose()
        except Exception as exc:  # pragma: no cover
            logger.warning("engine_factory.sportsbook_close_failed", error=str(exc))


# ---------------------------------------------------------------------------
# SQLAlchemy async engine / session
# ---------------------------------------------------------------------------


def _make_async_engine(settings: Settings) -> AsyncEngine:
    """Create a SQLAlchemy async engine from settings.

    Args:
        settings: Application settings (database_url used).

    Returns:
        Configured AsyncEngine.
    """
    return create_async_engine(
        settings.database_url,
        pool_pre_ping=True,
        echo=False,
    )


# ---------------------------------------------------------------------------
# FastAPI dependency functions
# ---------------------------------------------------------------------------


async def get_db_session(request: Request) -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: yield an AsyncSession for the current request.

    The session is closed (and any transaction rolled back) after the response
    is sent. The sessionmaker is retrieved from ``request.app.state``, which
    is populated during the lifespan startup.

    Yields:
        An open AsyncSession bound to the current request.
    """
    session_factory: async_sessionmaker[AsyncSession] = request.app.state.session_factory
    async with session_factory() as session:
        yield session


def get_engine_factory(request: Request) -> EngineFactory:
    """FastAPI dependency: return the app-scoped EngineFactory.

    Args:
        request: The current FastAPI request (used to access app.state).

    Returns:
        The EngineFactory initialised during lifespan startup.
    """
    factory: EngineFactory = request.app.state.engine_factory
    return factory


# Annotated aliases for use in route signatures
DbSession = Annotated[AsyncSession, Depends(get_db_session)]
AppEngineFactory = Annotated[EngineFactory, Depends(get_engine_factory)]
