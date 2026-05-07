"""Middleware for the ScoutEdge FastAPI service.

Registers:
1. CORS middleware (starlette CORSMiddleware via add_middleware).
2. Request-ID middleware: reads ``x-request-id`` header or generates a uuid4;
   attaches to ``request.state.request_id`` and echoes in the response.
3. Structured logging middleware: logs request start/end with duration_ms.
4. API-key middleware: when ``settings.api_key`` is set, every non-exempt
   path must present a matching ``x-api-key`` header; returns 401 otherwise.
   Exempt paths: ``/healthz``.
5. Rate-limit middleware: token-bucket style per-IP-per-path limiter backed
   by an in-process dict.

NOTE: The InMemoryRateLimiter is intentionally single-process only.
A Redis-backed rate limiter (e.g. using `redis-py` and a sliding-window
Lua script) is a planned follow-up for multi-instance deployments.
"""

from __future__ import annotations

import time
import uuid
from collections import deque

import structlog
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse
from starlette.types import ASGIApp

from api.deps import Settings

logger: structlog.BoundLogger = structlog.get_logger(__name__)

# Paths that bypass API-key enforcement
_API_KEY_EXEMPT_PATHS: frozenset[str] = frozenset({"/healthz"})


# ---------------------------------------------------------------------------
# In-memory rate limiter
# ---------------------------------------------------------------------------


class InMemoryRateLimiter:
    """Token-bucket style rate limiter keyed by an arbitrary string (e.g. IP+path).

    Each key gets its own sliding window deque of request timestamps (seconds).
    Requests are allowed if fewer than ``per_minute`` timestamps fall within
    the last 60 seconds.

    This is a simple in-process implementation suitable for single-instance
    deployments. A Redis-backed implementation is planned for scale-out.

    Args:
        per_minute: Maximum allowed requests per 60-second window per key.
    """

    def __init__(self, per_minute: int) -> None:
        self._per_minute = per_minute
        self._windows: dict[str, deque[float]] = {}

    def allow(self, key: str) -> bool:
        """Check whether the given key is within the rate limit.

        Advances the sliding window to the current time, evicts stale
        entries older than 60 s, then either records this request (returns
        True) or denies it (returns False).

        Args:
            key: Arbitrary string identifying the caller (e.g. ``"ip:path"``).

        Returns:
            True if the request is allowed; False if the limit is exceeded.
        """
        now = time.monotonic()
        cutoff = now - 60.0

        window: deque[float] = self._windows.setdefault(key, deque())
        # Evict timestamps older than 60 s
        while window and window[0] < cutoff:
            window.popleft()

        if len(window) >= self._per_minute:
            return False

        window.append(now)
        return True


# ---------------------------------------------------------------------------
# Request-ID middleware
# ---------------------------------------------------------------------------


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Reads or generates a unique request-id and propagates it through the response.

    - Reads ``x-request-id`` from the incoming request headers.
    - If absent, generates a ``uuid4`` string.
    - Attaches the id to ``request.state.request_id``.
    - Sets ``x-request-id`` on the response.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Process request: attach request-id and echo in response.

        Args:
            request: Incoming Starlette request.
            call_next: Next ASGI handler.

        Returns:
            Response with ``x-request-id`` header set.
        """
        request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response


# ---------------------------------------------------------------------------
# Structured logging middleware
# ---------------------------------------------------------------------------


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """Emits structlog events at request start and end with duration.

    Binds ``request_id``, ``method``, and ``path`` to the log context so
    all downstream log lines within a request share these fields.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Log request lifecycle events.

        Args:
            request: Incoming Starlette request.
            call_next: Next ASGI handler.

        Returns:
            The downstream response, unmodified.
        """
        request_id = getattr(request.state, "request_id", "-")
        bound_logger: structlog.BoundLogger = logger.bind(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        start = time.perf_counter()
        bound_logger.info("http.request.start")
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        bound_logger.info(
            "http.request.end",
            status_code=response.status_code,
            duration_ms=round(duration_ms, 2),
        )
        return response


# ---------------------------------------------------------------------------
# API-key middleware
# ---------------------------------------------------------------------------


class APIKeyMiddleware(BaseHTTPMiddleware):
    """Enforces presence of a matching ``x-api-key`` header.

    When ``api_key`` is ``None`` this middleware is a transparent pass-through.
    The ``/healthz`` path is always exempt so liveness probes do not need keys.

    Args:
        app: The ASGI application to wrap.
        api_key: The expected key value, or None to disable enforcement.
    """

    def __init__(self, app: ASGIApp, *, api_key: str | None) -> None:
        super().__init__(app)
        self._api_key = api_key

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Validate x-api-key header for non-exempt paths.

        Args:
            request: Incoming Starlette request.
            call_next: Next ASGI handler.

        Returns:
            401 JSON response when the key is missing or wrong; otherwise
            delegates to the next handler.
        """
        if self._api_key is None or request.url.path in _API_KEY_EXEMPT_PATHS:
            return await call_next(request)

        provided = request.headers.get("x-api-key")
        if provided != self._api_key:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid x-api-key header."},
            )
        return await call_next(request)


# ---------------------------------------------------------------------------
# Rate-limit middleware
# ---------------------------------------------------------------------------


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Applies the InMemoryRateLimiter keyed by client IP + path.

    Returns 429 when a client exceeds the configured per-minute limit.

    Args:
        app: The ASGI application to wrap.
        limiter: A configured InMemoryRateLimiter instance.
    """

    def __init__(self, app: ASGIApp, *, limiter: InMemoryRateLimiter) -> None:
        super().__init__(app)
        self._limiter = limiter

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Check rate limit and reject excess requests.

        Args:
            request: Incoming Starlette request.
            call_next: Next ASGI handler.

        Returns:
            429 JSON response on rate limit; otherwise delegates downstream.
        """
        client_ip = request.client.host if request.client else "unknown"
        key = f"{client_ip}:{request.url.path}"
        if not self._limiter.allow(key):
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Retry after a minute."},
            )
        return await call_next(request)


# ---------------------------------------------------------------------------
# install_middleware
# ---------------------------------------------------------------------------


def install_middleware(app: FastAPI, settings: Settings) -> None:
    """Mount all middleware onto the FastAPI application.

    Order of registration (outermost → innermost request processing):
    1. CORS (starlette built-in, handled by add_middleware)
    2. Rate-limit
    3. API-key
    4. Structured logging
    5. Request-ID (innermost — must run first so logging can read the id)

    Args:
        app: The FastAPI application instance.
        settings: Application settings (cors_origins, api_key, rate_limit_per_minute).
    """
    # CORS — registered via add_middleware so starlette inserts it at the edge
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Rate limiting
    limiter = InMemoryRateLimiter(per_minute=settings.rate_limit_per_minute)
    app.add_middleware(RateLimitMiddleware, limiter=limiter)

    # API-key enforcement
    app.add_middleware(APIKeyMiddleware, api_key=settings.api_key)

    # Structured request logging
    app.add_middleware(StructuredLoggingMiddleware)

    # Request-ID (innermost — runs first on the way in)
    app.add_middleware(RequestIDMiddleware)
