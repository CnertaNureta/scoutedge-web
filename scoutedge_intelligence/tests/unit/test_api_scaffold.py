"""Unit tests for the P5.1 FastAPI scaffold (api/main, api/deps, api/middleware).

All tests use fastapi.testclient.TestClient (sync) and mock/patch away any
real DB, Anthropic, or external HTTP calls so the suite is fully self-contained.

Test inventory (≥ 8 tests):
 1. create_app returns a FastAPI instance with /healthz registered
 2. /healthz returns 200 and {"status":"ok","version":...}
 3. CORS preflight OPTIONS to /healthz with allowed origin → 200 + ACAO header
 4. x-request-id is echoed in response header when sent by client
 5. x-request-id is generated (uuid4 format) when not sent by client
 6. With settings.api_key set: non-healthz path without x-api-key → 401
 7. With settings.api_key set: /healthz is exempt (no x-api-key needed)
 8. InMemoryRateLimiter.allow returns True for first N, then False
 9. InMemoryRateLimiter sliding window: old entries are evicted after 60 s
10. lifespan runs EngineFactory.aclose() on shutdown
"""

from __future__ import annotations

import re
import time
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.deps import EngineFactory, Settings
from api.main import __version__, create_app
from api.middleware import InMemoryRateLimiter

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------


def _stub_settings(**overrides: Any) -> Settings:
    """Return a Settings instance with test-safe defaults.

    Bypasses any real .env file by overriding database_url to a local sqlite
    stub and disabling the api_key by default.
    """
    defaults = {
        "database_url": "sqlite+aiosqlite:///./test_scaffold.db",
        "redis_url": "redis://localhost:6379",
        "cors_origins": ["http://localhost:3000", "https://allowed.example.com"],
        "api_key": None,
        "rate_limit_per_minute": 120,
        "log_level": "DEBUG",
    }
    defaults.update(overrides)
    return Settings.model_construct(**defaults)


def _make_test_client(settings: Settings | None = None) -> TestClient:
    """Build a TestClient that patches away heavy singletons.

    Patches EngineFactory so that no real ML models, Anthropic clients, or
    HTTP clients are instantiated during tests.
    """
    if settings is None:
        settings = _stub_settings()

    with (
        patch("api.deps.FootballELO", return_value=MagicMock()),
        patch("api.deps.DixonColesModel", return_value=MagicMock()),
        patch("api.deps.PolymarketClient", return_value=MagicMock()),
        patch("api.deps.SportsbookClient", return_value=MagicMock()),
        patch("api.deps.FeatureGenerator", return_value=MagicMock()),
        patch("api.deps.DivergenceAnalyst", return_value=MagicMock()),
        patch("api.deps.JSONSynthesizer", return_value=MagicMock()),
        patch("api.deps.Translator", return_value=MagicMock()),
        patch("api.deps.create_async_engine", return_value=MagicMock()),
        patch("api.main.async_sessionmaker", return_value=MagicMock()),
    ):
        app = create_app(settings=settings)
        # Patch aclose on the factory stored in state after startup
        client = TestClient(app, raise_server_exceptions=True)
    return client


# ---------------------------------------------------------------------------
# Test 1: create_app returns a FastAPI instance with /healthz registered
# ---------------------------------------------------------------------------


def test_create_app_returns_fastapi_with_healthz() -> None:
    """create_app() must return a FastAPI instance that has /healthz."""
    with (
        patch("api.deps.FootballELO", return_value=MagicMock()),
        patch("api.deps.DixonColesModel", return_value=MagicMock()),
        patch("api.deps.PolymarketClient", return_value=MagicMock()),
        patch("api.deps.SportsbookClient", return_value=MagicMock()),
        patch("api.deps.FeatureGenerator", return_value=MagicMock()),
        patch("api.deps.DivergenceAnalyst", return_value=MagicMock()),
        patch("api.deps.JSONSynthesizer", return_value=MagicMock()),
        patch("api.deps.Translator", return_value=MagicMock()),
        patch("api.deps.create_async_engine", return_value=MagicMock()),
        patch("api.main.async_sessionmaker", return_value=MagicMock()),
    ):
        app = create_app(settings=_stub_settings())

    assert isinstance(app, FastAPI)
    # Verify /healthz is in the route list
    paths = {route.path for route in app.routes}  # type: ignore[attr-defined]
    assert "/healthz" in paths


# ---------------------------------------------------------------------------
# Test 2: /healthz returns 200 and correct JSON body
# ---------------------------------------------------------------------------


def test_healthz_returns_200_and_body() -> None:
    """/healthz returns HTTP 200 with status='ok' and the current version string."""
    client = _make_test_client()
    response = client.get("/healthz")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"] == __version__


# ---------------------------------------------------------------------------
# Test 3: CORS preflight on /healthz with allowed origin
# ---------------------------------------------------------------------------


def test_cors_preflight_allowed_origin() -> None:
    """OPTIONS /healthz with an allowed origin returns 200 + ACAO header."""
    settings = _stub_settings(cors_origins=["https://allowed.example.com"])
    client = _make_test_client(settings=settings)
    response = client.options(
        "/healthz",
        headers={
            "Origin": "https://allowed.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # CORS preflight → 200 (starlette returns 200 for simple preflight)
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers


# ---------------------------------------------------------------------------
# Test 4: x-request-id echoed when client sends it
# ---------------------------------------------------------------------------


def test_request_id_echoed_when_sent() -> None:
    """The request-id sent by the client is echoed back in the response header."""
    client = _make_test_client()
    my_id = "test-request-id-12345"
    response = client.get("/healthz", headers={"x-request-id": my_id})
    assert response.headers.get("x-request-id") == my_id


# ---------------------------------------------------------------------------
# Test 5: x-request-id generated when not sent
# ---------------------------------------------------------------------------

_UUID4_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


def test_request_id_generated_when_absent() -> None:
    """When x-request-id is not sent, a uuid4 is generated and returned."""
    client = _make_test_client()
    response = client.get("/healthz")
    generated_id = response.headers.get("x-request-id", "")
    assert _UUID4_PATTERN.match(generated_id), f"Expected uuid4 format, got: {generated_id!r}"


# ---------------------------------------------------------------------------
# Test 6: API-key enforcement on non-exempt paths
# ---------------------------------------------------------------------------


def test_api_key_missing_returns_401_on_non_exempt_path() -> None:
    """With settings.api_key set, a non-healthz path without x-api-key returns 401."""
    settings = _stub_settings(api_key="secret-key-for-test")

    # We need a stub route so we have a non-healthz path to hit
    with (
        patch("api.deps.FootballELO", return_value=MagicMock()),
        patch("api.deps.DixonColesModel", return_value=MagicMock()),
        patch("api.deps.PolymarketClient", return_value=MagicMock()),
        patch("api.deps.SportsbookClient", return_value=MagicMock()),
        patch("api.deps.FeatureGenerator", return_value=MagicMock()),
        patch("api.deps.DivergenceAnalyst", return_value=MagicMock()),
        patch("api.deps.JSONSynthesizer", return_value=MagicMock()),
        patch("api.deps.Translator", return_value=MagicMock()),
        patch("api.deps.create_async_engine", return_value=MagicMock()),
        patch("api.main.async_sessionmaker", return_value=MagicMock()),
    ):
        app = create_app(settings=settings)

        # Attach a stub route AFTER create_app so it's registered on the real app
        @app.get("/stub-protected")
        async def _stub() -> dict[str, str]:
            return {"ok": "true"}

        client = TestClient(app, raise_server_exceptions=True)

    response = client.get("/stub-protected")  # no x-api-key
    assert response.status_code == 401


# ---------------------------------------------------------------------------
# Test 7: /healthz is exempt from API-key enforcement
# ---------------------------------------------------------------------------


def test_healthz_exempt_from_api_key() -> None:
    """/healthz succeeds without x-api-key even when settings.api_key is set."""
    settings = _stub_settings(api_key="secret-key-for-test")
    client = _make_test_client(settings=settings)
    response = client.get("/healthz")
    assert response.status_code == 200


# ---------------------------------------------------------------------------
# Test 8: InMemoryRateLimiter — allow for first N, deny after
# ---------------------------------------------------------------------------


def test_rate_limiter_allows_up_to_limit_then_denies() -> None:
    """InMemoryRateLimiter.allow returns True for the first N calls, then False."""
    limit = 5
    limiter = InMemoryRateLimiter(per_minute=limit)
    key = "192.168.1.1:/test"

    results = [limiter.allow(key) for _ in range(limit + 2)]

    assert all(results[:limit]), "First N requests should be allowed"
    assert not results[limit], "Request N+1 should be denied"
    assert not results[limit + 1], "Request N+2 should also be denied"


# ---------------------------------------------------------------------------
# Test 9: InMemoryRateLimiter — old entries evicted after 60 s
# ---------------------------------------------------------------------------


def test_rate_limiter_evicts_old_entries() -> None:
    """Timestamps older than 60 s are evicted, freeing capacity for new requests."""
    limiter = InMemoryRateLimiter(per_minute=2)
    key = "10.0.0.1:/eviction"

    # Exhaust the limit
    assert limiter.allow(key) is True
    assert limiter.allow(key) is True
    assert limiter.allow(key) is False  # limit hit

    # Manually back-date the timestamps so they look >60 s old
    window = limiter._windows[key]
    old_time = time.monotonic() - 61.0
    for i in range(len(window)):
        window[i] = old_time

    # Now a new request should be allowed (old entries will be evicted)
    assert limiter.allow(key) is True


# ---------------------------------------------------------------------------
# Test 10: lifespan calls EngineFactory.aclose() on shutdown
# ---------------------------------------------------------------------------


def test_lifespan_calls_aclose_on_shutdown() -> None:
    """The lifespan context manager must call EngineFactory.aclose() on shutdown."""
    aclose_mock = AsyncMock()
    mock_factory = MagicMock(spec=EngineFactory)
    mock_factory.aclose = aclose_mock

    mock_db_engine = MagicMock()
    mock_db_engine.dispose = AsyncMock()

    with (
        patch("api.deps.FootballELO", return_value=MagicMock()),
        patch("api.deps.DixonColesModel", return_value=MagicMock()),
        patch("api.deps.PolymarketClient", return_value=MagicMock()),
        patch("api.deps.SportsbookClient", return_value=MagicMock()),
        patch("api.deps.FeatureGenerator", return_value=MagicMock()),
        patch("api.deps.DivergenceAnalyst", return_value=MagicMock()),
        patch("api.deps.JSONSynthesizer", return_value=MagicMock()),
        patch("api.deps.Translator", return_value=MagicMock()),
        patch("api.deps.create_async_engine", return_value=mock_db_engine),
        patch("api.main.async_sessionmaker", return_value=MagicMock()),
        patch("api.main.EngineFactory", return_value=mock_factory),
    ):
        app = create_app(settings=_stub_settings())
        with TestClient(app):
            # Inside the block: lifespan startup has run
            pass
        # Outside the block: lifespan shutdown has run

    aclose_mock.assert_awaited_once()
