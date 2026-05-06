"""FIFA Men's World Ranking data source.

Fetches the official FIFA Men's World Ranking from the public
``inside.fifa.com`` API and normalises the response into a stable
internal schema for downstream prediction features.
"""

from __future__ import annotations

import os
import time
from typing import Any

import httpx
import structlog
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

_DEFAULT_BASE_URL = "https://inside.fifa.com/api/ranking-overview"
_CACHE_TTL_SECONDS = 24 * 60 * 60  # 24 hours

logger: structlog.BoundLogger = structlog.get_logger(__name__)


class FIFARankingsClient:
    """Async client for the FIFA Men's World Ranking API.

    Returns the latest published ranking, or the snapshot for a given
    ISO date (``YYYY-MM-DD``) when supplied. Responses are cached
    in-memory for 24 hours, keyed by date (``"latest"`` for the
    default request).

    Parameters
    ----------
    base_url:
        Root URL for the FIFA ranking endpoint. Falls back to the
        ``FIFA_RANKINGS_BASE`` environment variable, then to
        ``https://inside.fifa.com/api/ranking-overview``.
    http_client:
        Optional pre-constructed :class:`httpx.AsyncClient`. When *None*
        the client creates its own instance with a 10-second timeout.
    """

    def __init__(
        self,
        base_url: str | None = None,
        *,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._base_url: str = (
            base_url or os.environ.get("FIFA_RANKINGS_BASE", _DEFAULT_BASE_URL)
        ).rstrip("/")

        self._owns_client: bool = http_client is None
        self._http: httpx.AsyncClient = http_client or httpx.AsyncClient(
            timeout=httpx.Timeout(10.0),
        )

        # Cache: key -> (cached_at_monotonic, payload)
        self._cache: dict[str, tuple[float, list[dict[str, Any]]]] = {}

        logger.debug("fifa_rankings_client_init", base_url=self._base_url)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def fetch_rankings(self, date: str | None = None) -> list[dict[str, Any]]:
        """Fetch the FIFA Men's World Ranking, optionally for a specific date.

        Parameters
        ----------
        date:
            Optional ISO date (``YYYY-MM-DD``) selecting a specific published
            snapshot. When *None*, the latest published ranking is returned.

        Returns
        -------
        List of normalised ranking entries. Each entry contains:

        * ``team_id`` - FIFA-issued 3-letter code (e.g. ``"BRA"``)
        * ``team_name`` - team display name
        * ``rank`` - integer position in the ranking
        * ``points`` - current ranking points
        * ``previous_points`` - previous publication's points
        * ``confederation`` - one of ``UEFA``, ``CONMEBOL``, ``AFC``,
          ``CAF``, ``CONCACAF``, ``OFC``
        * ``published_at`` - ISO publication date

        Raises
        ------
        httpx.HTTPError
            Propagated after retries are exhausted (5xx / network only;
            4xx surfaces immediately).
        """
        cache_key = date or "latest"

        cached = self._cache.get(cache_key)
        if cached is not None:
            cached_at, payload = cached
            if time.monotonic() - cached_at < _CACHE_TTL_SECONDS:
                logger.debug("fifa_rankings_cache_hit", key=cache_key)
                return payload

        raw = await self._get_rankings(date)
        rankings = _normalise_rankings(raw.get("rankings", []))

        self._cache[cache_key] = (time.monotonic(), rankings)

        logger.info(
            "fifa_rankings_fetched",
            key=cache_key,
            count=len(rankings),
        )
        return rankings

    async def fetch_team_rank(
        self,
        team_id: str,
        date: str | None = None,
    ) -> dict[str, Any] | None:
        """Return the ranking row for a single team, or *None* if absent.

        Parameters
        ----------
        team_id:
            FIFA 3-letter team code (case-insensitive).
        date:
            Optional ISO date (``YYYY-MM-DD``). Forwarded to
            :meth:`fetch_rankings`.
        """
        rankings = await self.fetch_rankings(date)
        target = team_id.upper()
        for entry in rankings:
            if entry["team_id"].upper() == target:
                return entry
        return None

    async def aclose(self) -> None:
        """Close the underlying HTTP client if it was created internally."""
        if self._owns_client:
            await self._http.aclose()
            logger.debug("fifa_rankings_client_closed")

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @retry(
        retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4.0),
        reraise=True,
    )
    async def _get_rankings(self, date: str | None) -> dict[str, Any]:
        """Perform ``GET`` against the FIFA ranking endpoint.

        Retries on transport errors and 5xx responses; 4xx surfaces
        immediately by re-raising without retry.
        """
        params: dict[str, str] = {}
        if date is not None:
            params["date"] = date

        logger.debug("fifa_rankings_request", url=self._base_url, params=params)

        response = await self._http.get(self._base_url, params=params)

        # Distinguish 4xx (no retry) from 5xx (retry).
        if 400 <= response.status_code < 500:
            # Raise without wrapping in a retryable type.
            raise _NonRetryableHTTPError(
                f"FIFA rankings API returned {response.status_code}",
                request=response.request,
                response=response,
            )

        response.raise_for_status()
        data: dict[str, Any] = response.json()
        return data


# ---------------------------------------------------------------------------
# Internal exceptions
# ---------------------------------------------------------------------------


class _NonRetryableHTTPError(httpx.HTTPError):
    """4xx error that must not be retried by tenacity.

    Inherits from :class:`httpx.HTTPError` so callers can catch it via
    the standard :class:`httpx.HTTPError` umbrella, but does *not*
    inherit from :class:`httpx.HTTPStatusError` or
    :class:`httpx.TransportError`, so the tenacity ``retry_if_exception_type``
    predicate will not match it.
    """

    def __init__(
        self,
        message: str,
        *,
        request: httpx.Request,
        response: httpx.Response,
    ) -> None:
        super().__init__(message)
        self.request = request
        self.response = response


# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------


def _normalise_rankings(raw_rankings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalise raw FIFA ranking entries into the internal schema."""
    return [
        {
            "team_id": str(entry.get("id", "")).upper(),
            "team_name": entry.get("name", ""),
            "rank": int(entry.get("rank", 0)),
            "points": float(entry.get("totalPoints", 0.0)),
            "previous_points": float(entry.get("previousPoints", 0.0)),
            "confederation": entry.get("confederation", ""),
            "published_at": entry.get("publishedAt", ""),
        }
        for entry in raw_rankings
    ]
