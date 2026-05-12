"""Unit tests for scoutedge_intelligence.sources.polymarket.PolymarketClient."""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from scoutedge_intelligence.sources.polymarket import PolymarketClient

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_MATCH_ID = "wc2026-arg-bra"

_MARKET_PAYLOAD: dict[str, Any] = {
    "id": _MATCH_ID,
    "question": "Who wins Argentina vs Brazil?",
    "outcomes": json.dumps(["Home", "Draw", "Away"]),
    "outcomePrices": json.dumps(["0.48", "0.22", "0.30"]),
    "liquidity": "125000.50",
    "volume24hr": "43200.00",
    "bestBid": "0.47",
    "bestAsk": "0.49",
}


def _make_response(payload: dict[str, Any], status_code: int = 200) -> MagicMock:
    """Build a mock httpx.Response."""
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = status_code
    mock_resp.json.return_value = payload
    if status_code >= 400:
        mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            f"HTTP {status_code}",
            request=MagicMock(),
            response=mock_resp,
        )
    else:
        mock_resp.raise_for_status.return_value = None
    return mock_resp


def _make_client(payload: dict[str, Any], status_code: int = 200) -> PolymarketClient:
    """Return a PolymarketClient whose internal AsyncClient.get is mocked."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=_make_response(payload, status_code))
    mock_http.aclose = AsyncMock()
    return PolymarketClient(http_client=mock_http)


# ---------------------------------------------------------------------------
# 1. Successful fetch returns all 7 keys and probabilities sum to 1.0
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_market_returns_all_keys() -> None:
    """fetch_market must return a dict with exactly the 7 documented keys."""
    client = _make_client(_MARKET_PAYLOAD)
    result = await client.fetch_market(_MATCH_ID)

    expected_keys = {
        "prob_home",
        "prob_draw",
        "prob_away",
        "liquidity",
        "volume_24h",
        "bid_ask_spread",
        "raw",
    }
    assert set(result.keys()) == expected_keys


@pytest.mark.asyncio
async def test_fetch_market_probs_sum_to_one() -> None:
    """Normalised probabilities must sum to exactly 1.0 (within float tolerance)."""
    client = _make_client(_MARKET_PAYLOAD)
    result = await client.fetch_market(_MATCH_ID)

    total = result["prob_home"] + result["prob_draw"] + result["prob_away"]
    assert abs(total - 1.0) < 1e-9


@pytest.mark.asyncio
async def test_fetch_market_prob_values_are_sensible() -> None:
    """Each probability must be in [0, 1] and reflect raw-price ranking."""
    client = _make_client(_MARKET_PAYLOAD)
    result = await client.fetch_market(_MATCH_ID)

    # Home (0.48) > Away (0.30) > Draw (0.22) before normalisation
    assert result["prob_home"] > result["prob_away"] > result["prob_draw"]
    for key in ("prob_home", "prob_draw", "prob_away"):
        assert 0.0 <= result[key] <= 1.0


# ---------------------------------------------------------------------------
# 2. Missing leg raises ValueError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_market_missing_draw_leg_raises() -> None:
    """fetch_market must raise ValueError when the draw outcome is absent."""
    bad_payload = dict(_MARKET_PAYLOAD)
    bad_payload["outcomes"] = json.dumps(["Home", "Away"])
    bad_payload["outcomePrices"] = json.dumps(["0.55", "0.45"])

    client = _make_client(bad_payload)
    with pytest.raises(ValueError, match="missing outcome legs"):
        await client.fetch_market(_MATCH_ID)


@pytest.mark.asyncio
async def test_fetch_market_empty_outcomes_raises() -> None:
    """fetch_market must raise ValueError when all outcome legs are absent."""
    bad_payload = dict(_MARKET_PAYLOAD)
    bad_payload["outcomes"] = json.dumps([])
    bad_payload["outcomePrices"] = json.dumps([])

    client = _make_client(bad_payload)
    with pytest.raises(ValueError):
        await client.fetch_market(_MATCH_ID)


# ---------------------------------------------------------------------------
# 3. HTTP 500 retried then surfaces httpx.HTTPError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_http_500_retried_and_raises() -> None:
    """HTTP 500 responses should be retried and ultimately raise HTTPStatusError."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=_make_response({}, status_code=500))
    mock_http.aclose = AsyncMock()

    client = PolymarketClient(http_client=mock_http)

    with pytest.raises(httpx.HTTPStatusError):
        await client.fetch_market(_MATCH_ID)

    # tenacity retries 3 times total (1 attempt + 2 retries)
    assert mock_http.get.call_count == 3


# ---------------------------------------------------------------------------
# 4. bid_ask_spread is positive when bids/asks are present
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_bid_ask_spread_positive() -> None:
    """bid_ask_spread must equal bestAsk - bestBid when both are present."""
    client = _make_client(_MARKET_PAYLOAD)
    result = await client.fetch_market(_MATCH_ID)

    expected_spread = float(_MARKET_PAYLOAD["bestAsk"]) - float(_MARKET_PAYLOAD["bestBid"])
    assert result["bid_ask_spread"] == pytest.approx(expected_spread)
    assert result["bid_ask_spread"] > 0.0


@pytest.mark.asyncio
async def test_bid_ask_spread_zero_when_absent() -> None:
    """bid_ask_spread must be 0.0 when bestBid/bestAsk are missing from the payload."""
    payload = dict(_MARKET_PAYLOAD)
    payload.pop("bestBid", None)
    payload.pop("bestAsk", None)

    client = _make_client(payload)
    result = await client.fetch_market(_MATCH_ID)
    assert result["bid_ask_spread"] == 0.0


# ---------------------------------------------------------------------------
# 5. aclose closes the underlying client
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_aclose_calls_underlying_close() -> None:
    """aclose must call aclose() on the internally-created AsyncClient."""
    with patch("httpx.AsyncClient", autospec=True) as mock_client_cls:
        mock_instance = AsyncMock()
        mock_client_cls.return_value = mock_instance
        mock_instance.aclose = AsyncMock()

        client = PolymarketClient()  # creates its own internal client
        await client.aclose()

        mock_instance.aclose.assert_awaited_once()


@pytest.mark.asyncio
async def test_aclose_does_not_close_injected_client() -> None:
    """aclose must NOT call aclose() when the client was injected externally."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.aclose = AsyncMock()

    client = PolymarketClient(http_client=mock_http)
    await client.aclose()

    mock_http.aclose.assert_not_awaited()


# ---------------------------------------------------------------------------
# 6. base_url honours POLYMARKET_GAMMA_BASE env override
# ---------------------------------------------------------------------------


def test_base_url_uses_env_variable(monkeypatch: pytest.MonkeyPatch) -> None:
    """PolymarketClient must read base_url from POLYMARKET_GAMMA_BASE env var."""
    custom_url = "https://staging-gamma.example.com"
    monkeypatch.setenv("POLYMARKET_GAMMA_BASE", custom_url)

    client = PolymarketClient()
    assert client._base_url == custom_url


def test_base_url_explicit_arg_takes_priority(monkeypatch: pytest.MonkeyPatch) -> None:
    """Explicit base_url argument must override the environment variable."""
    monkeypatch.setenv("POLYMARKET_GAMMA_BASE", "https://env-override.example.com")

    explicit = "https://explicit.example.com"
    client = PolymarketClient(base_url=explicit)
    assert client._base_url == explicit


def test_base_url_falls_back_to_default(monkeypatch: pytest.MonkeyPatch) -> None:
    """base_url must fall back to the hardcoded default when env var is absent."""
    monkeypatch.delenv("POLYMARKET_GAMMA_BASE", raising=False)

    client = PolymarketClient()
    assert client._base_url == "https://gamma-api.polymarket.com"


# ---------------------------------------------------------------------------
# 7. Raw payload is passed through unchanged
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_raw_field_contains_api_response() -> None:
    """The ``raw`` key must be the unmodified JSON dict from the Gamma API."""
    client = _make_client(_MARKET_PAYLOAD)
    result = await client.fetch_market(_MATCH_ID)

    assert result["raw"] is _MARKET_PAYLOAD or result["raw"] == _MARKET_PAYLOAD


# ---------------------------------------------------------------------------
# 8. Correct API URL is constructed from match_id
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_correct_url_constructed(monkeypatch: pytest.MonkeyPatch) -> None:
    """fetch_market must call GET /markets/{match_id} on the configured base URL."""
    monkeypatch.delenv("POLYMARKET_GAMMA_BASE", raising=False)
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=_make_response(_MARKET_PAYLOAD))
    mock_http.aclose = AsyncMock()

    client = PolymarketClient(http_client=mock_http)
    await client.fetch_market("abc-123")

    mock_http.get.assert_called_once_with("https://gamma-api.polymarket.com/markets/abc-123")
