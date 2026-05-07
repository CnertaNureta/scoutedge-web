"""SportsbookClient — wraps The Odds API (https://the-odds-api.com).

Fetches h2h market odds for WC2026 matches, removes vig via the
proportional method, and returns consensus probabilities.

Environment variables
---------------------
ODDS_API_KEY        : required - API key for The Odds API
ODDS_API_REGIONS    : optional - comma-separated regions (default: "eu")
ODDS_API_BOOKMAKERS : optional - comma-separated bookmaker slugs
"""

from __future__ import annotations

import os
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

_BASE_URL = "https://api.the-odds-api.com/v4"
_SPORT = "soccer_fifa_world_cup"
_DEFAULT_REGIONS = "eu"
_OUTCOME_KEYS = {"home", "draw", "away"}


class OddsAPIError(RuntimeError):
    """Raised when The Odds API returns an unexpected HTTP status."""


class SportsbookClient:
    """Async client for The Odds API (WC2026 h2h markets).

    Parameters
    ----------
    api_key:
        API key for The Odds API. Falls back to the ``ODDS_API_KEY``
        environment variable when *None*.
    regions:
        Comma-separated region string passed to the API (e.g. ``"eu,us"``).
        Falls back to ``ODDS_API_REGIONS`` env var, then ``"eu"``.
    bookmakers:
        Explicit list of bookmaker slugs. Falls back to the
        ``ODDS_API_BOOKMAKERS`` env var (comma-separated). When provided
        via env var, the value is split on commas and stripped.
    http_client:
        Optional pre-configured :class:`httpx.AsyncClient`. One is created
        internally when *None*; it is closed by :meth:`aclose`.
    """

    def __init__(
        self,
        api_key: str | None = None,
        *,
        regions: str | None = None,
        bookmakers: list[str] | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._api_key: str = api_key or os.environ.get("ODDS_API_KEY", "")
        self._regions: str = regions or os.environ.get("ODDS_API_REGIONS", "") or _DEFAULT_REGIONS

        env_books = os.environ.get("ODDS_API_BOOKMAKERS", "")
        self._bookmakers: list[str] = bookmakers or (
            [b.strip() for b in env_books.split(",") if b.strip()] if env_books else []
        )

        self._owns_client: bool = http_client is None
        self._http: httpx.AsyncClient = http_client or httpx.AsyncClient(
            timeout=httpx.Timeout(15.0)
        )

        logger.debug(
            "SportsbookClient initialised",
            regions=self._regions,
            bookmakers=self._bookmakers or "<all>",
        )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def fetch_consensus(self, match_id: str) -> dict[str, Any]:
        """Return vig-removed consensus probabilities for *match_id*.

        Parameters
        ----------
        match_id:
            The Odds API event id for the match.
            TODO: If callers hold a different id (e.g. internal DB id),
            a resolution step must map it to an Odds API event id before
            calling this method. No id-resolution logic is included here
            because the spec does not define the mapping algorithm.

        Returns
        -------
        dict with keys:
            ``prob_home`` / ``prob_draw`` / ``prob_away`` - floats summing
            to 1.0 after vig removal.
            ``books_used`` - list of bookmaker slugs that contributed data.
            ``vig_removed`` - always ``True``.

        Raises
        ------
        ValueError
            If the API response is missing one of home/draw/away outcomes.
        OddsAPIError
            On non-2xx HTTP responses (after retries for 429).
        """
        raw = await self._get_odds(match_id)
        implied, books_used = self._parse_implied(raw, match_id)
        consensus = self.remove_vig_proportional(implied)

        return {
            "prob_home": consensus["home"],
            "prob_draw": consensus["draw"],
            "prob_away": consensus["away"],
            "books_used": books_used,
            "vig_removed": True,
        }

    @staticmethod
    def remove_vig_proportional(implied: dict[str, float]) -> dict[str, float]:
        """Remove vig from implied probabilities via the proportional method.

        Each implied probability is divided by the sum so that the output
        probabilities sum to exactly 1.0.

        Parameters
        ----------
        implied:
            A mapping with exactly the keys ``home``, ``draw``, and
            ``away`` mapping to implied probability floats derived from
            decimal odds (``1 / decimal_odds``).

        Returns
        -------
        dict[str, float]
            Vig-removed probabilities for ``home``, ``draw``, ``away``.

        Raises
        ------
        ValueError
            If any value is non-positive (zero or negative odds are
            meaningless and indicate bad input).
        """
        for key, val in implied.items():
            if val <= 0.0:
                raise ValueError(f"Implied probability for '{key}' must be positive, got {val!r}")

        total = sum(implied.values())
        return {k: v / total for k, v in implied.items()}

    async def aclose(self) -> None:
        """Close the underlying HTTP client if owned by this instance."""
        if self._owns_client:
            await self._http.aclose()
            logger.debug("SportsbookClient HTTP client closed")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @retry(
        retry=retry_if_exception_type(OddsAPIError),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    async def _get_odds(self, match_id: str) -> list[dict[str, Any]]:
        """Fetch raw odds data from The Odds API, retrying on 429."""
        params: dict[str, str] = {
            "apiKey": self._api_key,
            "regions": self._regions,
            "markets": "h2h",
            "oddsFormat": "decimal",
        }
        if self._bookmakers:
            params["bookmakers"] = ",".join(self._bookmakers)

        url = f"{_BASE_URL}/sports/{_SPORT}/odds"

        log = logger.bind(match_id=match_id, url=url)
        log.debug("Fetching odds from The Odds API")

        response = await self._http.get(url, params=params)

        if response.status_code == 401:
            raise OddsAPIError("The Odds API returned 401 Unauthorized — check ODDS_API_KEY")
        if response.status_code == 429:
            raise OddsAPIError("The Odds API returned 429 Too Many Requests — rate limit exceeded")
        if response.status_code != 200:
            raise OddsAPIError(f"The Odds API returned unexpected status {response.status_code}")

        events: list[dict[str, Any]] = response.json()

        # Filter to the requested event id
        # TODO: The Odds API returns all upcoming events; we select by id.
        # If match_id represents something other than an Odds API event id
        # (e.g. an internal fixture id), add a resolution step here.
        matching = [e for e in events if e.get("id") == match_id]
        if not matching:
            log.warning(
                "No event found for match_id in Odds API response", total_events=len(events)
            )
        return matching

    @staticmethod
    def _parse_implied(
        events: list[dict[str, Any]], match_id: str
    ) -> tuple[dict[str, float], list[str]]:
        """Average implied probabilities across all bookmakers in *events*.

        Returns
        -------
        tuple of (implied_probs dict, books_used list)
        """
        accumulator: dict[str, list[float]] = {"home": [], "draw": [], "away": []}
        books_used: list[str] = []

        for event in events:
            for bookmaker in event.get("bookmakers", []):
                book_key: str = bookmaker.get("key", "unknown")
                for market in bookmaker.get("markets", []):
                    if market.get("key") != "h2h":
                        continue
                    outcomes = market.get("outcomes", [])
                    book_implied = _extract_h2h_implied(outcomes, match_id, book_key)
                    if book_implied is None:
                        continue
                    for side in ("home", "draw", "away"):
                        accumulator[side].append(book_implied[side])
                    if book_key not in books_used:
                        books_used.append(book_key)

        missing = [k for k, v in accumulator.items() if not v]
        if missing:
            raise ValueError(
                f"Sportsbook response for match '{match_id}' is missing "
                f"outcome(s): {missing}. Cannot compute consensus."
            )

        averaged: dict[str, float] = {
            side: sum(vals) / len(vals) for side, vals in accumulator.items()
        }
        return averaged, books_used


def _extract_h2h_implied(
    outcomes: list[dict[str, Any]],
    match_id: str,
    book_key: str,
) -> dict[str, float] | None:
    """Map h2h outcome list to {home, draw, away} implied probabilities.

    The Odds API uses outcome names like "Team A", "Draw", "Team B" in
    positional order: index 0 = home, index 1 = away, index 2 = draw
    (draw may be absent for two-way markets).  We identify "Draw" by name
    and treat the remaining two outcomes as home/away by position.

    Returns *None* if the outcome list does not contain all three of
    home/draw/away (e.g. two-way markets).
    """
    draw_price: float | None = None
    non_draw: list[float] = []

    for outcome in outcomes:
        name: str = outcome.get("name", "")
        price: float = float(outcome.get("price", 0.0))
        if price <= 0.0:
            logger.warning("Skipping zero/negative price", book=book_key, outcome=name)
            continue
        if name.lower() == "draw":
            draw_price = price
        else:
            non_draw.append(price)

    if draw_price is None or len(non_draw) < 2:
        # Two-way market or malformed — skip
        return None

    home_price, away_price = non_draw[0], non_draw[1]
    return {
        "home": 1.0 / home_price,
        "draw": 1.0 / draw_price,
        "away": 1.0 / away_price,
    }
