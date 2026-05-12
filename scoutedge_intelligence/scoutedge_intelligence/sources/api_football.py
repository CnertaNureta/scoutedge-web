"""API-Football data source for WC2026 fixtures and team statistics.

Wraps the v3.football.api-sports.io REST API and exposes normalised
fixture and team-statistics shapes that mirror the existing TypeScript
ingestion path under ``scripts/lib/api-football-ingest.mjs``.

Environment variables
---------------------
API_FOOTBALL_KEY  : required - API-Football auth key (header ``x-apisports-key``)
API_FOOTBALL_BASE : optional - base URL (default ``https://v3.football.api-sports.io``)
API_FOOTBALL_RPM  : optional - max requests per minute (default 30)
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from typing import Any

import httpx
import structlog
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

_DEFAULT_BASE_URL = "https://v3.football.api-sports.io"
_DEFAULT_RPM = 30

# API-Football short-status codes.  See
# https://www.api-football.com/documentation-v3#section/Authentication/Status
_STATUS_LIVE: frozenset[str] = frozenset({"1H", "HT", "2H", "ET", "BT", "P", "LIVE"})
_STATUS_FINISHED: frozenset[str] = frozenset({"FT", "AET", "PEN"})
_HTTPX_DECODING_ERROR = getattr(httpx, "DecodingError", None)
_JSON_DECODE_EXCEPTIONS: tuple[type[BaseException], ...] = (
    (json.JSONDecodeError, UnicodeDecodeError, _HTTPX_DECODING_ERROR)
    if _HTTPX_DECODING_ERROR is not None
    else (json.JSONDecodeError, UnicodeDecodeError)
)


def _response_body_snippet(response: httpx.Response, limit: int = 200) -> str:
    """Return a short response-body snippet without trusting text decoding."""
    try:
        return response.text[:limit].replace("\n", " ")
    except UnicodeDecodeError:
        return response.content[:limit].decode("utf-8", errors="replace").replace("\n", " ")


class APIFootballError(RuntimeError):
    """Raised when API-Football returns an unexpected HTTP status or payload."""


class _RetryableHTTPError(httpx.HTTPError):
    """Internal marker so tenacity only retries 5xx and network errors."""


class APIFootballClient:
    """Async client for the API-Football v3 REST API.

    Exposes ``fetch_fixtures`` and ``fetch_team_stats`` with response
    shapes normalised for downstream WC2026 prediction features.

    Parameters
    ----------
    api_key:
        API-Football key.  Falls back to the ``API_FOOTBALL_KEY`` env
        var.  Validation is deferred until the first network call so
        construction never raises.
    base_url:
        Root URL.  Falls back to ``API_FOOTBALL_BASE`` env var, then to
        ``https://v3.football.api-sports.io``.
    requests_per_minute:
        Maximum requests per minute.  Falls back to ``API_FOOTBALL_RPM``
        env var, then to 30.  Enforced via an async lock + monotonic
        clock; the minimum interval between successive requests is
        ``60 / requests_per_minute`` seconds.
    http_client:
        Optional pre-constructed :class:`httpx.AsyncClient`.  When
        *None*, the client owns its own instance with a 15-second timeout.
    """

    def __init__(
        self,
        api_key: str | None = None,
        *,
        base_url: str | None = None,
        requests_per_minute: int | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        # Capture the explicit constructor argument so it takes precedence
        # over the env var at request time (constructor-vs-env precedence
        # is asserted by the unit tests).
        self._explicit_api_key: str | None = api_key

        self._base_url: str = (
            base_url or os.environ.get("API_FOOTBALL_BASE", _DEFAULT_BASE_URL)
        ).rstrip("/")

        rpm = requests_per_minute
        if rpm is None:
            env_rpm = os.environ.get("API_FOOTBALL_RPM")
            rpm = int(env_rpm) if env_rpm else _DEFAULT_RPM
        if rpm <= 0:
            raise ValueError(f"requests_per_minute must be positive, got {rpm}")
        self._min_interval_s: float = 60.0 / float(rpm)

        self._owns_client: bool = http_client is None
        self._http: httpx.AsyncClient = http_client or httpx.AsyncClient(
            timeout=httpx.Timeout(15.0),
        )

        self._rate_lock: asyncio.Lock = asyncio.Lock()
        self._last_request_monotonic: float = 0.0

        logger.debug(
            "api_football_client_init",
            base_url=self._base_url,
            min_interval_s=self._min_interval_s,
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def fetch_fixtures(self, league_id: int, season: int) -> list[dict[str, Any]]:
        """Fetch and normalise fixtures for a league/season.

        Calls ``GET /fixtures?league={league_id}&season={season}`` and
        flattens each entry into a dict with the keys: ``fixture_id``,
        ``kickoff_utc``, ``home_team_id``, ``away_team_id``,
        ``home_team_name``, ``away_team_name``, ``status``,
        ``home_goals``, ``away_goals``, ``league_id``, ``season``.

        ``status`` is one of ``"SCHEDULED"``, ``"LIVE"``, ``"FT"``.
        """
        payload = await self._get(
            "fixtures", params={"league": league_id, "season": season}
        )
        raw_fixtures: list[dict[str, Any]] = payload.get("response", []) or []

        return [_normalise_fixture(entry) for entry in raw_fixtures]

    async def fetch_team_stats(
        self, team_id: int, league_id: int, season: int
    ) -> dict[str, Any]:
        """Fetch and normalise season statistics for a team.

        Calls ``GET /teams/statistics?team={team_id}&league={league_id}&season={season}``
        and returns a dict with the keys: ``team_id``, ``fixtures_played``,
        ``fixtures_won``, ``goals_for``, ``goals_against``,
        ``clean_sheets``, ``failed_to_score``, ``form``.
        """
        payload = await self._get(
            "teams/statistics",
            params={"team": team_id, "league": league_id, "season": season},
        )
        raw: dict[str, Any] = payload.get("response", {}) or {}

        return _normalise_team_stats(raw, team_id=team_id)

    async def aclose(self) -> None:
        """Close the underlying HTTP client if it was created internally."""
        if self._owns_client:
            await self._http.aclose()
            logger.debug("api_football_client_closed")

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _resolve_api_key(self) -> str:
        """Resolve the API key, deferring validation to call time.

        Constructor argument takes precedence over the env var.  Raises
        :class:`ValueError` when neither is supplied.
        """
        key = self._explicit_api_key or os.environ.get("API_FOOTBALL_KEY")
        if not key:
            raise ValueError(
                "API_FOOTBALL_KEY is not set: pass api_key=... to "
                "APIFootballClient or export the API_FOOTBALL_KEY env var."
            )
        return key

    async def _throttle(self) -> None:
        """Enforce the configured minimum interval between requests."""
        async with self._rate_lock:
            now = time.monotonic()
            elapsed = now - self._last_request_monotonic
            wait = self._min_interval_s - elapsed
            if wait > 0 and self._last_request_monotonic > 0.0:
                await asyncio.sleep(wait)
            self._last_request_monotonic = time.monotonic()

    async def _get(self, endpoint: str, *, params: dict[str, Any]) -> dict[str, Any]:
        """Throttle + key-resolve wrapper around the retrying request."""
        api_key = self._resolve_api_key()
        await self._throttle()
        return await self._request(endpoint, params=params, api_key=api_key)

    @retry(
        retry=retry_if_exception_type(_RetryableHTTPError),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4.0),
        reraise=True,
    )
    async def _request(
        self,
        endpoint: str,
        *,
        params: dict[str, Any],
        api_key: str,
    ) -> dict[str, Any]:
        """Perform a single GET request with 5xx-only retry semantics.

        4xx responses propagate immediately; only 5xx responses and
        transport-level :class:`httpx.HTTPError` instances are retried.
        """
        url = f"{self._base_url}/{endpoint.lstrip('/')}"
        log = logger.bind(endpoint=endpoint, params=params)
        log.debug("api_football_request")

        try:
            response = await self._http.get(
                url,
                params=params,
                headers={"x-apisports-key": api_key},
            )
        except httpx.HTTPError as exc:
            # Network / transport errors -> retry.
            raise _RetryableHTTPError(str(exc)) from exc

        status = response.status_code
        if 500 <= status < 600:
            log.warning("api_football_5xx", status=status)
            raise _RetryableHTTPError(
                f"API-Football {status} for {endpoint}"
            )
        if status >= 400:
            log.warning("api_football_4xx", status=status)
            raise httpx.HTTPStatusError(
                f"API-Football {status} for {endpoint}",
                request=response.request,
                response=response,
            )

        try:
            data: dict[str, Any] = response.json()
        except _JSON_DECODE_EXCEPTIONS as exc:
            body_snippet = _response_body_snippet(response)
            raise APIFootballError(
                f"API-Football {status} returned non-JSON body: {body_snippet}"
            ) from exc
        return data


# ---------------------------------------------------------------------------
# Module-level normalisers
# ---------------------------------------------------------------------------


def _normalise_status(short: str | None) -> str:
    """Map an API-Football short status code to SCHEDULED|LIVE|FT."""
    if not short:
        return "SCHEDULED"
    upper = short.upper()
    if upper in _STATUS_FINISHED:
        return "FT"
    if upper in _STATUS_LIVE:
        return "LIVE"
    return "SCHEDULED"


def _normalise_fixture(entry: dict[str, Any]) -> dict[str, Any]:
    """Flatten an API-Football fixture entry into the canonical shape."""
    fixture = entry.get("fixture") or {}
    league = entry.get("league") or {}
    teams = entry.get("teams") or {}
    home = teams.get("home") or {}
    away = teams.get("away") or {}
    goals = entry.get("goals") or {}
    status = (fixture.get("status") or {}).get("short")

    return {
        "fixture_id": fixture.get("id"),
        "kickoff_utc": fixture.get("date"),
        "home_team_id": home.get("id"),
        "away_team_id": away.get("id"),
        "home_team_name": home.get("name"),
        "away_team_name": away.get("name"),
        "status": _normalise_status(status),
        "home_goals": goals.get("home"),
        "away_goals": goals.get("away"),
        "league_id": league.get("id"),
        "season": league.get("season"),
    }


def _normalise_team_stats(raw: dict[str, Any], *, team_id: int) -> dict[str, Any]:
    """Flatten ``GET /teams/statistics`` payload into the canonical shape."""
    fixtures = raw.get("fixtures") or {}
    played = (fixtures.get("played") or {}).get("total")
    wins = (fixtures.get("wins") or {}).get("total")

    goals = raw.get("goals") or {}
    goals_for = ((goals.get("for") or {}).get("total") or {}).get("total")
    goals_against = ((goals.get("against") or {}).get("total") or {}).get("total")

    clean_sheet = raw.get("clean_sheet") or {}
    failed_to_score = raw.get("failed_to_score") or {}

    return {
        "team_id": team_id,
        "fixtures_played": played,
        "fixtures_won": wins,
        "goals_for": goals_for,
        "goals_against": goals_against,
        "clean_sheets": clean_sheet.get("total"),
        "failed_to_score": failed_to_score.get("total"),
        "form": raw.get("form"),
    }
