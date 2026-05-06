"""Unit tests for scoutedge_intelligence.sources.sportsbook.SportsbookClient.

All tests are offline — the HTTP layer is fully mocked via unittest.mock /
pytest-mock.  No real network calls are made.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from scoutedge_intelligence.sources.sportsbook import (
    OddsAPIError,
    SportsbookClient,
)

# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

_MATCH_ID = "test-event-abc123"


def _make_event(
    event_id: str,
    home_price: float = 2.0,
    draw_price: float = 3.5,
    away_price: float = 4.0,
    book_key: str = "betfair",
) -> dict[str, Any]:
    """Build a minimal Odds API event payload."""
    return {
        "id": event_id,
        "bookmakers": [
            {
                "key": book_key,
                "markets": [
                    {
                        "key": "h2h",
                        "outcomes": [
                            {"name": "Home Team", "price": home_price},
                            {"name": "Away Team", "price": away_price},
                            {"name": "Draw", "price": draw_price},
                        ],
                    }
                ],
            }
        ],
    }


def _client_with_mock_response(
    json_body: Any,
    status_code: int = 200,
) -> tuple[SportsbookClient, AsyncMock]:
    """Return a SportsbookClient wired to a mocked AsyncClient."""
    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = status_code
    mock_response.json.return_value = json_body

    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=mock_response)
    mock_http.aclose = AsyncMock()

    client = SportsbookClient(
        api_key="test-key",
        http_client=mock_http,
    )
    return client, mock_http


# ---------------------------------------------------------------------------
# 1. remove_vig_proportional — correct normalisation
# ---------------------------------------------------------------------------


def test_remove_vig_sums_to_one() -> None:
    """Input {0.5, 0.3, 0.25} must produce probabilities that sum to 1.0."""
    raw = {"home": 0.5, "draw": 0.3, "away": 0.25}
    result = SportsbookClient.remove_vig_proportional(raw)
    assert abs(sum(result.values()) - 1.0) < 1e-10, f"Probabilities do not sum to 1.0: {result}"
    # Individual keys must still be present
    assert set(result.keys()) == {"home", "draw", "away"}


def test_remove_vig_correct_proportions() -> None:
    """Each output value equals input / total_input."""
    raw = {"home": 0.5, "draw": 0.3, "away": 0.25}
    total = sum(raw.values())
    result = SportsbookClient.remove_vig_proportional(raw)
    for key, val in raw.items():
        assert abs(result[key] - val / total) < 1e-12


# ---------------------------------------------------------------------------
# 2. remove_vig_proportional — rejects non-positive values
# ---------------------------------------------------------------------------


def test_remove_vig_rejects_zero() -> None:
    """A zero implied probability must raise ValueError."""
    with pytest.raises(ValueError, match="must be positive"):
        SportsbookClient.remove_vig_proportional({"home": 0.5, "draw": 0.0, "away": 0.3})


def test_remove_vig_rejects_negative() -> None:
    """A negative implied probability must raise ValueError."""
    with pytest.raises(ValueError, match="must be positive"):
        SportsbookClient.remove_vig_proportional({"home": -0.1, "draw": 0.3, "away": 0.3})


# ---------------------------------------------------------------------------
# 3. fetch_consensus — happy path, two bookmakers, probs sum to 1.0
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_consensus_probs_sum_to_one() -> None:
    """Consensus probabilities must sum to 1.0 across two bookmakers."""
    event1 = _make_event(
        _MATCH_ID, home_price=2.10, draw_price=3.40, away_price=3.80, book_key="pinnacle"
    )
    event2 = _make_event(
        _MATCH_ID, home_price=2.05, draw_price=3.50, away_price=3.90, book_key="betfair"
    )
    # Both bookmakers share the same event id
    event2_merged: dict[str, Any] = {
        "id": _MATCH_ID,
        "bookmakers": (
            event1["bookmakers"] + event2["bookmakers"]  # type: ignore[operator]
        ),
    }

    client, _ = _client_with_mock_response([event2_merged])
    result = await client.fetch_consensus(_MATCH_ID)

    total = result["prob_home"] + result["prob_draw"] + result["prob_away"]
    assert abs(total - 1.0) < 1e-10, f"Probs don't sum to 1.0: {result}"


# ---------------------------------------------------------------------------
# 4. fetch_consensus — books_used is tracked
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_consensus_tracks_books_used() -> None:
    """Returned dict must list all contributing bookmaker keys."""
    event: dict[str, Any] = {
        "id": _MATCH_ID,
        "bookmakers": [
            {
                "key": "pinnacle",
                "markets": [
                    {
                        "key": "h2h",
                        "outcomes": [
                            {"name": "Home Team", "price": 2.0},
                            {"name": "Away Team", "price": 3.8},
                            {"name": "Draw", "price": 3.4},
                        ],
                    }
                ],
            },
            {
                "key": "bet365",
                "markets": [
                    {
                        "key": "h2h",
                        "outcomes": [
                            {"name": "Home Team", "price": 2.1},
                            {"name": "Away Team", "price": 3.7},
                            {"name": "Draw", "price": 3.5},
                        ],
                    }
                ],
            },
        ],
    }

    client, _ = _client_with_mock_response([event])
    result = await client.fetch_consensus(_MATCH_ID)

    assert "books_used" in result
    assert set(result["books_used"]) == {"pinnacle", "bet365"}
    assert result["vig_removed"] is True


# ---------------------------------------------------------------------------
# 5. HTTP 401 raises a clear OddsAPIError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_consensus_raises_on_401() -> None:
    """An HTTP 401 response must raise OddsAPIError with a clear message."""
    client, _ = _client_with_mock_response(json_body={}, status_code=401)

    with pytest.raises(OddsAPIError, match="401"):
        await client.fetch_consensus(_MATCH_ID)


# ---------------------------------------------------------------------------
# 6. HTTP 429 is retried and then surfaced
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_consensus_retries_on_429_then_raises() -> None:
    """HTTP 429 must trigger retries and ultimately raise OddsAPIError."""
    mock_response_429 = MagicMock(spec=httpx.Response)
    mock_response_429.status_code = 429
    mock_response_429.json.return_value = {}

    mock_http = AsyncMock(spec=httpx.AsyncClient)
    # Always return 429 to exhaust all retries
    mock_http.get = AsyncMock(return_value=mock_response_429)

    client = SportsbookClient(api_key="test-key", http_client=mock_http)

    with pytest.raises(OddsAPIError, match="429"):
        await client.fetch_consensus(_MATCH_ID)

    # tenacity retries 3 attempts total
    assert mock_http.get.call_count == 3


# ---------------------------------------------------------------------------
# 7. aclose closes the underlying HTTP client
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_aclose_closes_owned_client() -> None:
    """aclose() must call aclose on the internally created AsyncClient."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.aclose = AsyncMock()

    client = SportsbookClient(api_key="test-key", http_client=mock_http)
    # http_client was injected, so _owns_client is False; force True for test
    client._owns_client = True

    await client.aclose()
    mock_http.aclose.assert_awaited_once()


@pytest.mark.asyncio
async def test_aclose_skips_external_client() -> None:
    """aclose() must NOT close a client it does not own."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.aclose = AsyncMock()

    client = SportsbookClient(api_key="test-key", http_client=mock_http)
    # _owns_client is False because http_client was provided
    assert client._owns_client is False

    await client.aclose()
    mock_http.aclose.assert_not_awaited()


# ---------------------------------------------------------------------------
# 8. fetch_consensus raises ValueError when an outcome is missing
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_consensus_raises_on_missing_outcome() -> None:
    """Missing 'Draw' outcome (two-way market) must raise ValueError."""
    event: dict[str, Any] = {
        "id": _MATCH_ID,
        "bookmakers": [
            {
                "key": "pinnacle",
                "markets": [
                    {
                        "key": "h2h",
                        "outcomes": [
                            {"name": "Home Team", "price": 1.9},
                            {"name": "Away Team", "price": 1.9},
                            # No "Draw" — two-way market, should be skipped
                        ],
                    }
                ],
            }
        ],
    }

    client, _ = _client_with_mock_response([event])

    with pytest.raises(ValueError, match="missing"):
        await client.fetch_consensus(_MATCH_ID)
