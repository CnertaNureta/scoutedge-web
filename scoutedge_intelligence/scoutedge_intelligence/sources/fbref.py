"""FBref squad-season stats client for WC2026 team-level features.

Fetches the public ``/en/squads/{team_id}/{season}-stats`` HTML page from
FBref.com and parses team-level statistics (xG, possession, passing,
fouls, shots-on-target) using a deterministic ``data-stat`` regex.

The class mirrors the structural conventions of
:class:`scoutedge_intelligence.sources.polymarket.PolymarketClient`:

* async ``httpx.AsyncClient`` with ``base_url`` / ``http_client`` injection
* ``FBREF_BASE_URL`` env-var override
* tenacity retry on network errors and 5xx responses only (4xx is **not** retried)
* internally-owned client closed via :meth:`aclose`

Two extras specific to FBref:

* a global **3-second** throttle between requests (FBref rate-limits
  aggressively) using an ``asyncio.Lock`` and ``asyncio.sleep``
* an in-memory cache keyed by ``(team_id, season)`` with a 6-hour TTL
"""

from __future__ import annotations

import asyncio
import os
import re
import time
from typing import Any

import httpx
import structlog
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

_DEFAULT_BASE_URL = "https://fbref.com"
_THROTTLE_SECONDS = 3.0
_CACHE_TTL_SECONDS = 6 * 60 * 60  # 6 hours

# Mapping of FBref ``data-stat`` attribute names to our normalised dict keys.
# These are the stable column identifiers FBref ships in their HTML tables;
# they survive UI re-skins and are vastly more reliable than column-header
# scraping.
_STAT_FIELD_MAP: dict[str, str] = {
    "games": "matches_played",
    "xg_for": "xg_for",
    "xg_against": "xg_against",
    "possession": "possession_pct",
    "passes_pct": "passes_completed_pct",
    "fouls": "fouls",
    "shots_on_target": "shots_on_target",
}

# Regex that pulls out ``<td data-stat="games">12.0</td>`` style cells.
# Matches ``td`` and ``th`` because FBref uses both for primary-key cells.
_DATA_STAT_RE = re.compile(
    r'<t[hd][^>]*?data-stat="(?P<stat>[a-z0-9_]+)"[^>]*?>(?P<value>.*?)</t[hd]>',
    re.IGNORECASE | re.DOTALL,
)
_TAG_STRIP_RE = re.compile(r"<[^>]+>")

logger: structlog.BoundLogger = structlog.get_logger(__name__)


class _RetryableStatusError(httpx.HTTPStatusError):
    """HTTP status marker for FBref 5xx responses that should be retried."""


class FBrefClient:
    """Async client for FBref squad-season stats pages.

    Parameters
    ----------
    base_url:
        Root URL for FBref. Falls back to the ``FBREF_BASE_URL`` env var,
        then to ``https://fbref.com``.
    http_client:
        Optional pre-constructed :class:`httpx.AsyncClient`. When *None*
        the client creates its own instance with a 15-second timeout and
        a desktop User-Agent header (FBref blocks default httpx UA).
    """

    def __init__(
        self,
        base_url: str | None = None,
        *,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._base_url: str = (
            base_url or os.environ.get("FBREF_BASE_URL", _DEFAULT_BASE_URL)
        ).rstrip("/")

        self._owns_client: bool = http_client is None
        self._http: httpx.AsyncClient = http_client or httpx.AsyncClient(
            timeout=httpx.Timeout(15.0),
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; ScoutEdgeIntelligence/0.1; "
                    "+https://scoutedge.app)"
                )
            },
        )

        # Throttle state (FBref rate-limits aggressively).
        self._throttle_lock: asyncio.Lock = asyncio.Lock()
        self._last_request_at: float = 0.0  # monotonic timestamp

        # In-memory (team_id, season) -> (cached_at_monotonic, payload) cache.
        self._cache: dict[tuple[str, str], tuple[float, dict[str, Any]]] = {}

        logger.debug("fbref_client_init", base_url=self._base_url)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def fetch_team_season_stats(self, team_id: str, season: str) -> dict[str, Any]:
        """Fetch and parse a single squad-season stats page.

        Parameters
        ----------
        team_id:
            FBref squad identifier (e.g. ``"f9fee9b1"`` for Argentina).
        season:
            Season slug, e.g. ``"2026"`` or ``"2025-2026"``.

        Returns
        -------
        dict with keys:
            ``team_id``, ``season``, ``matches_played``, ``xg_for``,
            ``xg_against``, ``possession_pct``, ``passes_completed_pct``,
            ``fouls``, ``shots_on_target``, ``season_url``.
            Any stat field is ``None`` when not present on the page.

        Raises
        ------
        httpx.HTTPStatusError
            On 4xx/5xx responses (4xx not retried; 5xx retried up to 3x).
        httpx.HTTPError
            On network errors after all retry attempts are exhausted.
        """
        cache_key = (team_id, season)
        log = logger.bind(team_id=team_id, season=season)

        # ---- cache lookup ----
        cached = self._cache.get(cache_key)
        if cached is not None:
            cached_at, payload = cached
            if (time.monotonic() - cached_at) < _CACHE_TTL_SECONDS:
                log.debug("fbref_cache_hit")
                return payload
            # Expired - fall through to refetch.
            log.debug("fbref_cache_expired")

        # ---- throttled fetch ----
        url = f"{self._base_url}/en/squads/{team_id}/{season}-stats"
        html = await self._get_html(url)

        # ---- parse ----
        stats = _parse_team_stats(html)
        result: dict[str, Any] = {
            "team_id": team_id,
            "season": season,
            "season_url": url,
            "matches_played": stats.get("matches_played"),
            "xg_for": stats.get("xg_for"),
            "xg_against": stats.get("xg_against"),
            "possession_pct": stats.get("possession_pct"),
            "passes_completed_pct": stats.get("passes_completed_pct"),
            "fouls": stats.get("fouls"),
            "shots_on_target": stats.get("shots_on_target"),
        }

        self._cache[cache_key] = (time.monotonic(), result)
        log.info("fbref_team_stats_fetched", url=url)
        return result

    async def aclose(self) -> None:
        """Close the underlying HTTP client if it was created internally."""
        if self._owns_client:
            await self._http.aclose()
            logger.debug("fbref_client_closed")

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    async def _throttle(self) -> None:
        """Sleep until the next FBref request is allowed."""
        now = time.monotonic()
        elapsed = now - self._last_request_at
        if self._last_request_at > 0.0 and elapsed < _THROTTLE_SECONDS:
            await asyncio.sleep(_THROTTLE_SECONDS - elapsed)

    @retry(
        retry=retry_if_exception_type(
            (httpx.TransportError, httpx.TimeoutException, _RetryableStatusError)
        ),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4.0),
        reraise=True,
    )
    async def _get_html(self, url: str) -> str:
        """Perform a GET and return the response body as text.

        Retries are restricted to *transport* errors (DNS, connection
        reset, timeout). HTTP 4xx/5xx are surfaced via
        :meth:`httpx.Response.raise_for_status`; 4xx is intentionally
        **not** retried.
        """
        async with self._throttle_lock:
            await self._throttle()
            logger.debug("fbref_request", url=url)
            try:
                response = await self._http.get(url)
                if response.status_code >= 500:
                    raise _RetryableStatusError(
                        f"FBref returned HTTP {response.status_code}",
                        request=response.request,
                        response=response,
                    )
                response.raise_for_status()
                text: str = response.text
                return text
            finally:
                self._last_request_at = time.monotonic()


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------


def _parse_team_stats(html: str) -> dict[str, float | int | None]:
    """Extract team-level stats from an FBref squad-season HTML page.

    Strategy: scan all ``<td|th data-stat="...">value</td>`` cells and
    keep the **first** parsable numeric value for each ``data-stat`` we
    care about. The first occurrence on FBref squad pages is the season
    total / aggregate row, which is the value we want.
    """
    found: dict[str, float | int | None] = dict.fromkeys(_STAT_FIELD_MAP.values())

    for match in _DATA_STAT_RE.finditer(html):
        stat = match.group("stat").lower()
        target_key = _STAT_FIELD_MAP.get(stat)
        if target_key is None:
            continue
        if found[target_key] is not None:
            # Already captured the first (aggregate) row's value.
            continue

        raw = _TAG_STRIP_RE.sub("", match.group("value")).strip().replace(",", "")
        if raw == "":
            continue

        parsed = _coerce_number(raw)
        if parsed is None:
            continue
        # Integer-typed counters - keep them as ints when they're whole numbers.
        if target_key in {"matches_played", "fouls", "shots_on_target"} and float(
            parsed
        ).is_integer():
            found[target_key] = int(parsed)
        else:
            found[target_key] = parsed

    return found


def _coerce_number(raw: str) -> float | None:
    """Best-effort string-to-number coercion. Returns *None* on failure."""
    try:
        return float(raw)
    except ValueError:
        return None
