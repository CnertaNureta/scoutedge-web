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

import json
import os
import re
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Annotated

import structlog
from fastapi import Depends, Request
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from scoutedge_intelligence.analyst.divergence import DivergenceAnalyst
from scoutedge_intelligence.claude.feature_generator import FeatureGenerator
from scoutedge_intelligence.claude.translator import Translator
from scoutedge_intelligence.models.dixon_coles import DixonColesModel, DixonColesParams
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
# Warm-up helpers
# ---------------------------------------------------------------------------


_PARAMS_FILENAME_RE = re.compile(r"^params_(\d{8}_\d{4})\.json$")
_DEFAULT_PARAMS_DIR = "./artifacts"


def _load_dc_params_from_disk(params_dir: Path) -> DixonColesParams | None:
    """Load the latest Dixon-Coles parameter artifact from a directory.

    The artifact format is the JSON document written by
    ``scoutedge_intelligence.scripts.train_ml.persist_params``. Files are
    named ``params_YYYYMMDD_HHMM.json`` and the latest stamp wins.

    Args:
        params_dir: Directory to scan for ``params_*.json`` files.

    Returns:
        A ``DixonColesParams`` instance built from the latest artifact, or
        ``None`` if the directory is missing, empty, or has no matching file.
    """
    if not params_dir.is_dir():
        logger.warning("warmup.dc.params_dir_missing", path=str(params_dir))
        return None

    candidates: list[tuple[str, Path]] = []
    for entry in params_dir.iterdir():
        if not entry.is_file():
            continue
        match = _PARAMS_FILENAME_RE.match(entry.name)
        if match is None:
            continue
        candidates.append((match.group(1), entry))

    if not candidates:
        logger.warning("warmup.dc.no_artifacts", path=str(params_dir))
        return None

    candidates.sort(key=lambda pair: pair[0])
    _, latest_path = candidates[-1]

    try:
        raw = json.loads(latest_path.read_text())
        return DixonColesParams(
            attack=dict(raw["attack"]),
            defense=dict(raw["defense"]),
            home_advantage=float(raw["home_advantage"]),
            rho=float(raw["rho"]),
        )
    except (OSError, ValueError, KeyError, TypeError) as exc:
        logger.warning(
            "warmup.dc.load_failed",
            path=str(latest_path),
            error=str(exc),
        )
        return None


def _sync_database_url(database_url: str) -> str:
    """Coerce an async SQLAlchemy URL to use an installed sync driver.

    Image ships psycopg v3 (``psycopg``) but not psycopg2. SQLAlchemy's
    default for the bare ``postgresql://`` scheme is psycopg2, so we
    force ``postgresql+psycopg://`` (v3) for the warm-up sync engine.

    SQLite stays with the default sync driver after stripping the
    aiosqlite hint.

    Args:
        database_url: Possibly-async SQLAlchemy URL.

    Returns:
        URL safe for ``sqlalchemy.create_engine`` against the deps in
        ``pyproject.toml``.
    """
    if database_url.startswith("postgresql+asyncpg://"):
        return "postgresql+psycopg://" + database_url[len("postgresql+asyncpg://") :]
    if database_url.startswith("postgresql://"):
        return "postgresql+psycopg://" + database_url[len("postgresql://") :]
    return database_url.replace("+aiosqlite", "")


def _seed_elo_from_db(elo: FootballELO, settings: Settings) -> int:
    """Seed the ELO rating store with the latest rating per team from the DB.

    Reads from ``elo_ratings`` joined to ``teams.name``, taking the most
    recent ``computed_at`` row per team. Uses a synchronous engine that is
    disposed before returning. Failures are logged and treated as "no rows".

    Args:
        elo: Target rating store; mutated in-place via ``_ratings``.
        settings: Application settings (database URL is used).

    Returns:
        Count of teams that were seeded.
    """
    sync_url = _sync_database_url(settings.database_url)
    query = text(
        """
        SELECT t.name AS team_name, r.elo AS rating
        FROM elo_ratings r
        JOIN teams t ON t.id = r.team_id
        WHERE t.name IS NOT NULL
          AND r.computed_at = (
              SELECT MAX(r2.computed_at)
              FROM elo_ratings r2
              WHERE r2.team_id = r.team_id
          )
        """
    )
    seeded = 0
    sync_engine = create_engine(sync_url, pool_pre_ping=True)
    try:
        with sync_engine.connect() as conn:
            for row in conn.execute(query):
                name = row.team_name
                if name is None:
                    continue
                elo._ratings[str(name)] = float(row.rating)
                seeded += 1
    except Exception as exc:
        logger.warning("warmup.elo.db_query_failed", error=str(exc))
        return 0
    finally:
        sync_engine.dispose()

    if seeded == 0:
        logger.warning("warmup.elo.no_rows")
    return seeded


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

        # ML models — constructed empty, then warmed up from disk + DB.
        self._elo = FootballELO()
        self._dixon_coles = DixonColesModel()

        # Warm-up: load Dixon-Coles params from artifact dir + seed ELO from DB.
        # Both helpers degrade gracefully (log + continue) so a missing artifact
        # or DB outage cannot block app startup.
        params_dir = Path(os.environ.get("SCOUTEDGE_PARAMS_DIR", _DEFAULT_PARAMS_DIR))
        dc_params = _load_dc_params_from_disk(params_dir)
        if dc_params is not None:
            self._dixon_coles.params = dc_params

        try:
            elo_seeded = _seed_elo_from_db(self._elo, settings)
        except Exception as exc:  # pragma: no cover — defence in depth
            logger.warning("warmup.elo.unexpected_failure", error=str(exc))
            elo_seeded = 0

        logger.info(
            "engine_factory.warmup",
            dc_loaded=dc_params is not None,
            elo_teams_seeded=elo_seeded,
            params_dir=str(params_dir),
        )

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
