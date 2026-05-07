"""Polymarket Gamma API client for WC2026 match market data.

Fetches 3-way (home / draw / away) outcome probabilities and liquidity
metrics for a given World Cup match from the Polymarket Gamma REST API.
"""

from __future__ import annotations

import os
from typing import Any

import httpx
import structlog
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

_DEFAULT_BASE_URL = "https://gamma-api.polymarket.com"

logger: structlog.BoundLogger = structlog.get_logger(__name__)


class PolymarketClient:
    """Async client for the Polymarket Gamma API.

    Fetches raw market metadata and aggregates outcome token prices into
    normalised 3-way (home / draw / away) probabilities for WC2026 matches.

    Parameters
    ----------
    base_url:
        Root URL for the Gamma REST API.  Falls back to the
        ``POLYMARKET_GAMMA_BASE`` environment variable, then to
        ``https://gamma-api.polymarket.com``.
    http_client:
        Optional pre-constructed :class:`httpx.AsyncClient`.  When *None*
        the client creates its own instance with a 10-second timeout.
    """

    def __init__(
        self,
        base_url: str | None = None,
        *,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self._base_url: str = (
            base_url or os.environ.get("POLYMARKET_GAMMA_BASE", _DEFAULT_BASE_URL)
        ).rstrip("/")

        self._owns_client: bool = http_client is None
        self._http: httpx.AsyncClient = http_client or httpx.AsyncClient(
            timeout=httpx.Timeout(10.0),
        )

        logger.debug("polymarket_client_init", base_url=self._base_url)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def fetch_market(self, match_id: str) -> dict[str, Any]:
        """Fetch raw market metadata and aggregated 3-way probabilities.

        Queries ``GET /markets/{match_id}`` on the Gamma API and derives
        normalised home / draw / away outcome probabilities from the
        ``outcomePrices`` token-price array contained in the response.

        The Gamma API represents each CLOB market as a *market* object.
        Each *market* exposes:

        * ``outcomes``        - JSON-encoded list of outcome labels, e.g.
                               ``'["Home", "Draw", "Away"]'``
        * ``outcomePrices``   - JSON-encoded list of last-traded prices (as
                               decimal strings) aligned with ``outcomes``, e.g.
                               ``'["0.48", "0.22", "0.30"]'``
        * ``liquidity``       - total USDC liquidity (float or string)
        * ``volume24hr``      - 24-hour trading volume (float or string)
        * ``bestBid``         - best bid across all outcome tokens (optional)
        * ``bestAsk``         - best ask across all outcome tokens (optional)

        Parameters
        ----------
        match_id:
            Polymarket market identifier for the WC2026 match.

        Returns
        -------
        dict with keys:
            ``prob_home``      - normalised home-win probability [0, 1]
            ``prob_draw``      - normalised draw probability [0, 1]
            ``prob_away``      - normalised away-win probability [0, 1]
            ``liquidity``      - total market liquidity in USDC
            ``volume_24h``     - 24-hour volume in USDC
            ``bid_ask_spread`` - best-ask minus best-bid (0.0 when unavailable)
            ``raw``            - unmodified JSON response from the Gamma API

        Raises
        ------
        ValueError
            If the API response is missing one or more of the three required
            outcome legs (home, draw, away).
        httpx.HTTPError
            If the HTTP request fails after all retry attempts.
        """
        raw = await self._get_market(match_id)
        log = logger.bind(match_id=match_id)

        # ----------------------------------------------------------------
        # Parse outcome prices
        # ----------------------------------------------------------------
        import json as _json

        raw_outcomes: list[str] = _json.loads(raw.get("outcomes", "[]"))
        raw_prices: list[str] = _json.loads(raw.get("outcomePrices", "[]"))

        label_map: dict[str, float] = {
            label.lower(): float(price)
            for label, price in zip(raw_outcomes, raw_prices, strict=False)
        }

        log.debug("polymarket_raw_prices", label_map=label_map)

        # Resolve the three legs; accept common label variants.
        prob_home = _resolve_leg(label_map, ["home", "home win", "1"])
        prob_draw = _resolve_leg(label_map, ["draw", "x", "tie"])
        prob_away = _resolve_leg(label_map, ["away", "away win", "2"])

        if prob_home is None or prob_draw is None or prob_away is None:
            missing = [
                name
                for name, val in [("home", prob_home), ("draw", prob_draw), ("away", prob_away)]
                if val is None
            ]
            raise ValueError(
                f"Polymarket market {match_id!r} is missing outcome legs: {missing}. "
                f"Available labels: {list(label_map.keys())}"
            )

        # ----------------------------------------------------------------
        # Normalise so probabilities sum to exactly 1.0
        # ----------------------------------------------------------------
        total = prob_home + prob_draw + prob_away
        if total <= 0:
            raise ValueError(
                f"Polymarket market {match_id!r}: outcome prices sum to zero or negative ({total})."
            )

        prob_home /= total
        prob_draw /= total
        prob_away /= total

        # ----------------------------------------------------------------
        # Ancillary metrics
        # ----------------------------------------------------------------
        liquidity = float(raw.get("liquidity") or 0.0)
        volume_24h = float(raw.get("volume24hr") or 0.0)

        best_bid = raw.get("bestBid")
        best_ask = raw.get("bestAsk")
        bid_ask_spread = (
            float(best_ask) - float(best_bid)
            if best_bid is not None and best_ask is not None
            else 0.0
        )

        result: dict[str, Any] = {
            "prob_home": prob_home,
            "prob_draw": prob_draw,
            "prob_away": prob_away,
            "liquidity": liquidity,
            "volume_24h": volume_24h,
            "bid_ask_spread": bid_ask_spread,
            "raw": raw,
        }

        log.info(
            "polymarket_market_fetched",
            prob_home=round(prob_home, 4),
            prob_draw=round(prob_draw, 4),
            prob_away=round(prob_away, 4),
            liquidity=liquidity,
        )
        return result

    async def aclose(self) -> None:
        """Close the underlying HTTP client if it was created internally."""
        if self._owns_client:
            await self._http.aclose()
            logger.debug("polymarket_client_closed")

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @retry(
        retry=retry_if_exception_type(httpx.HTTPError),
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=4.0),
        reraise=True,
    )
    async def _get_market(self, match_id: str) -> dict[str, Any]:
        """Perform ``GET /markets/{match_id}`` with tenacity-backed retries.

        Parameters
        ----------
        match_id:
            Polymarket market identifier.

        Returns
        -------
        Parsed JSON response body as a dict.

        Raises
        ------
        httpx.HTTPError
            Propagated after all retry attempts are exhausted.
        """
        url = f"{self._base_url}/markets/{match_id}"
        logger.debug("polymarket_request", url=url)

        response = await self._http.get(url)
        response.raise_for_status()
        data: dict[str, Any] = response.json()
        return data


# ---------------------------------------------------------------------------
# Module-level helpers
# ---------------------------------------------------------------------------


def _resolve_leg(label_map: dict[str, float], candidates: list[str]) -> float | None:
    """Return the price for the first matching candidate label, or None.

    Parameters
    ----------
    label_map:
        Mapping of lowercased outcome label to raw price.
    candidates:
        Ordered list of label strings to attempt (all compared lower-cased).

    Returns
    -------
    The raw price as a float, or *None* if no candidate matched.
    """
    for candidate in candidates:
        if candidate in label_map:
            return label_map[candidate]
    return None
