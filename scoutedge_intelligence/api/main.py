"""ScoutEdge Intelligence FastAPI application factory.

This module exposes a single public function, :func:`create_app`, which
constructs and returns a configured FastAPI instance. It is the entry point
for both production (uvicorn) and test (TestClient) consumption.

Registered endpoints in this task (P5.1):
- GET /healthz — liveness probe; exempt from API-key enforcement.

Domain routes (predictions, matches, markets, etc.) are attached in separate
api.routes.* modules as part of tasks P5.2-P5.5.

Usage::

    # production
    uvicorn api.main:app --host 0.0.0.0 --port 8000

    # programmatic (tests, CLI)
    from api.main import create_app
    app = create_app()
"""

from __future__ import annotations

from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager, asynccontextmanager
from typing import Any

import structlog
from fastapi import FastAPI
from sqlalchemy.ext.asyncio import async_sessionmaker

from api.deps import EngineFactory, Settings, _make_async_engine
from api.middleware import install_middleware
from api.routes.bracket import router as bracket_router
from api.routes.divergence_feedback import router as divergence_router
from api.routes.duel import router as duel_router
from api.routes.og import router as og_router
from api.routes.predict import router as predict_router
from api.routes.remix import router as remix_router
from api.routes.ws_live import router as ws_live_router

logger: structlog.BoundLogger = structlog.get_logger(__name__)

__version__: str = "0.1.0"


# ---------------------------------------------------------------------------
# Lifespan
# ---------------------------------------------------------------------------


def _make_lifespan(
    settings: Settings,
) -> Callable[[FastAPI], AbstractAsyncContextManager[None]]:
    """Build an async context manager that manages application-level resources.

    On startup:
    - Constructs the SQLAlchemy async engine and a sessionmaker.
    - Constructs the EngineFactory (warms up ML models, HTTP clients).
    Both are stored on ``app.state`` for retrieval by dependency functions.

    On shutdown:
    - Calls ``EngineFactory.aclose()`` to drain HTTP connections.
    - Disposes the SQLAlchemy engine.

    Args:
        settings: Application settings used to configure engine and factory.

    Returns:
        An async context manager compatible with FastAPI's ``lifespan`` parameter.
    """

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        logger.info("app.startup", version=__version__)

        # DB engine + sessionmaker
        db_engine = _make_async_engine(settings)
        app.state.db_engine = db_engine
        app.state.session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

        # Prediction engine factory
        engine_factory = EngineFactory(settings)
        app.state.engine_factory = engine_factory

        logger.info("app.startup.complete")
        yield

        # Shutdown
        logger.info("app.shutdown")
        await engine_factory.aclose()
        await db_engine.dispose()
        logger.info("app.shutdown.complete")

    return lifespan


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------


def create_app(settings: Settings | None = None) -> FastAPI:
    """Application factory.

    Wires routes, middleware, and lifespan. Currently registers only
    ``/healthz``; domain routes are attached in ``api.routes.*`` in tasks
    P5.2-P5.5.

    Args:
        settings: Optional Settings override. When None, settings are loaded
            from environment / .env file (standard behaviour for production).

    Returns:
        A fully configured FastAPI application instance, ready to serve.
    """
    if settings is None:
        settings = Settings()

    app = FastAPI(
        title="ScoutEdge Intelligence API",
        description=(
            "WC2026 triple-layer prediction engine: ML + Polymarket + Sportsbook + Claude."
        ),
        version=__version__,
        lifespan=_make_lifespan(settings),
        # Disable default /docs and /redoc in production via env; keep for dev
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Store settings on app state so middleware / deps can access them
    app.state.settings = settings

    # Middleware (order matters — see middleware.py docstring)
    install_middleware(app, settings)

    # ---------------------------------------------------------------------------
    # Domain routers (P5.2)
    # ---------------------------------------------------------------------------

    app.include_router(predict_router)
    app.include_router(divergence_router)
    app.include_router(duel_router)
    app.include_router(bracket_router)
    app.include_router(remix_router)
    app.include_router(og_router)
    app.include_router(ws_live_router)

    # ---------------------------------------------------------------------------
    # Health endpoint
    # ---------------------------------------------------------------------------

    @app.get("/healthz", tags=["ops"], include_in_schema=True)
    async def healthz() -> dict[str, Any]:
        """Liveness probe. Returns 200 with service version when the app is up.

        This endpoint is exempt from API-key enforcement and rate limiting
        so that orchestration and load-balancer probes always succeed.

        Returns:
            JSON object with ``status`` and ``version`` keys.
        """
        return {"status": "ok", "version": __version__}

    return app


# ---------------------------------------------------------------------------
# Module-level app instance (for uvicorn / gunicorn entrypoints)
# ---------------------------------------------------------------------------

app: FastAPI = create_app()
