"""Unit tests for scoutedge_intelligence.sources.fifa_rankings.FIFARankingsClient."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from scoutedge_intelligence.sources import fifa_rankings as fifa_module
from scoutedge_intelligence.sources.fifa_rankings import FIFARankingsClient

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_RANKINGS_PAYLOAD: dict[str, Any] = {
    "rankings": [
        {
            "id": "BRA",
            "name": "Brazil",
            "rank": 1,
            "totalPoints": 1837.61,
            "previousPoints": 1825.0,
            "confederation": "CONMEBOL",
            "publishedAt": "2026-04-04",
        },
        {
            "id": "ARG",
            "name": "Argentina",
            "rank": 2,
            "totalPoints": 1820.10,
            "previousPoints": 1815.5,
            "confederation": "CONMEBOL",
            "publishedAt": "2026-04-04",
        },
        {
            "id": "FRA",
            "name": "France",
            "rank": 3,
            "totalPoints": 1810.50,
            "previousPoints": 1808.0,
            "confederation": "UEFA",
            "publishedAt": "2026-04-04",
        },
    ]
}


def _make_response(payload: dict[str, Any], status_code: int = 200) -> MagicMock:
    """Build a mock httpx.Response."""
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = status_code
    mock_resp.json.return_value = payload
    mock_resp.text = str(payload)
    mock_resp.request = MagicMock(spec=httpx.Request)
    if status_code >= 400:
        mock_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            f"HTTP {status_code}",
            request=mock_resp.request,
            response=mock_resp,
        )
    else:
        mock_resp.raise_for_status.return_value = None
    return mock_resp


def _make_client(
    payload: dict[str, Any],
    status_code: int = 200,
) -> tuple[FIFARankingsClient, AsyncMock]:
    """Return a FIFARankingsClient with a mocked AsyncClient.get."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=_make_response(payload, status_code))
    mock_http.aclose = AsyncMock()
    client = FIFARankingsClient(http_client=mock_http)
    return client, mock_http


# ---------------------------------------------------------------------------
# 1. fetch_rankings happy path
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_rankings_returns_normalised_list() -> None:
    """fetch_rankings returns a list of dicts with the documented schema."""
    client, _ = _make_client(_RANKINGS_PAYLOAD)
    result = await client.fetch_rankings()

    assert isinstance(result, list)
    assert len(result) == 3
    expected_keys = {
        "team_id",
        "team_name",
        "rank",
        "points",
        "previous_points",
        "confederation",
        "published_at",
    }
    assert set(result[0].keys()) == expected_keys
    assert result[0]["team_id"] == "BRA"
    assert result[0]["team_name"] == "Brazil"
    assert result[0]["rank"] == 1
    assert result[0]["points"] == pytest.approx(1837.61)
    assert result[0]["previous_points"] == pytest.approx(1825.0)
    assert result[0]["confederation"] == "CONMEBOL"
    assert result[0]["published_at"] == "2026-04-04"


@pytest.mark.asyncio
async def test_fetch_rankings_handles_null_api_fields() -> None:
    payload: dict[str, Any] = {
        "rankings": [
            {
                "id": None,
                "name": None,
                "rank": None,
                "totalPoints": None,
                "previousPoints": None,
                "confederation": None,
                "publishedAt": None,
            }
        ]
    }
    client, _ = _make_client(payload)

    result = await client.fetch_rankings()

    assert result == [
        {
            "team_id": "",
            "team_name": "",
            "rank": 0,
            "points": 0.0,
            "previous_points": 0.0,
            "confederation": "",
            "published_at": "",
        }
    ]


@pytest.mark.asyncio
async def test_fetch_rankings_handles_malformed_numeric_fields() -> None:
    payload: dict[str, Any] = {
        "rankings": [
            {
                "id": "bad",
                "name": "Bad Data FC",
                "rank": "not-a-rank",
                "totalPoints": {},
                "previousPoints": "nan-ish",
                "confederation": "UEFA",
                "publishedAt": "2026-04-04",
            }
        ]
    }
    client, _ = _make_client(payload)

    result = await client.fetch_rankings()

    assert result[0]["team_id"] == "BAD"
    assert result[0]["rank"] == 0
    assert result[0]["points"] == 0.0
    assert result[0]["previous_points"] == 0.0


# ---------------------------------------------------------------------------
# 2. fetch_team_rank returns single entry
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_team_rank_returns_match() -> None:
    """fetch_team_rank returns the entry for the requested team_id."""
    client, _ = _make_client(_RANKINGS_PAYLOAD)
    result = await client.fetch_team_rank("ARG")

    assert result is not None
    assert result["team_id"] == "ARG"
    assert result["rank"] == 2
    assert result["team_name"] == "Argentina"


@pytest.mark.asyncio
async def test_fetch_team_rank_is_case_insensitive() -> None:
    """fetch_team_rank should accept lowercase team_id input."""
    client, _ = _make_client(_RANKINGS_PAYLOAD)
    result = await client.fetch_team_rank("fra")

    assert result is not None
    assert result["team_id"] == "FRA"


# ---------------------------------------------------------------------------
# 3. fetch_team_rank returns None when absent
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_team_rank_returns_none_when_missing() -> None:
    """fetch_team_rank returns None when the team is absent from the payload."""
    client, _ = _make_client(_RANKINGS_PAYLOAD)
    result = await client.fetch_team_rank("ZZZ")
    assert result is None


# ---------------------------------------------------------------------------
# 4. Cache hit avoids second HTTP call
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cache_hit_avoids_second_http_call() -> None:
    """Calling fetch_rankings twice with the same date hits the cache once."""
    client, mock_http = _make_client(_RANKINGS_PAYLOAD)

    first = await client.fetch_rankings()
    second = await client.fetch_rankings()

    assert first == second
    assert mock_http.get.call_count == 1


# ---------------------------------------------------------------------------
# 5. Cache TTL: refetches after 24h
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cache_expires_after_ttl(monkeypatch: pytest.MonkeyPatch) -> None:
    """After the 24h TTL elapses the client must refetch."""
    client, mock_http = _make_client(_RANKINGS_PAYLOAD)

    fake_time = {"value": 1000.0}

    def fake_monotonic() -> float:
        return fake_time["value"]

    monkeypatch.setattr(fifa_module.time, "monotonic", fake_monotonic)

    await client.fetch_rankings()
    assert mock_http.get.call_count == 1

    # Advance just under TTL: still cached
    fake_time["value"] = 1000.0 + (24 * 60 * 60) - 1
    await client.fetch_rankings()
    assert mock_http.get.call_count == 1

    # Advance past TTL: must refetch
    fake_time["value"] = 1000.0 + (24 * 60 * 60) + 1
    await client.fetch_rankings()
    assert mock_http.get.call_count == 2


# ---------------------------------------------------------------------------
# 6. 5xx retried then raises
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_http_500_retried_then_raises() -> None:
    """HTTP 500 must be retried 3 times then raise httpx.HTTPStatusError."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=_make_response({}, status_code=500))
    mock_http.aclose = AsyncMock()
    client = FIFARankingsClient(http_client=mock_http)

    with pytest.raises(httpx.HTTPStatusError):
        await client.fetch_rankings()

    assert mock_http.get.call_count == 3


# ---------------------------------------------------------------------------
# 7. 4xx not retried, raises immediately
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_http_404_not_retried() -> None:
    """4xx responses must surface immediately without retrying."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=_make_response({}, status_code=404))
    mock_http.aclose = AsyncMock()
    client = FIFARankingsClient(http_client=mock_http)

    with pytest.raises(httpx.HTTPError):
        await client.fetch_rankings()

    assert mock_http.get.call_count == 1


@pytest.mark.asyncio
async def test_non_json_response_raises_decoding_error() -> None:
    """Successful HTTP responses with invalid JSON surface with body context."""
    mock_resp = _make_response({}, status_code=200)
    mock_resp.json.side_effect = ValueError("not json")
    mock_resp.text = "<html>maintenance</html>"

    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=mock_resp)
    mock_http.aclose = AsyncMock()
    client = FIFARankingsClient(http_client=mock_http)

    with pytest.raises(httpx.DecodingError, match="non-JSON body"):
        await client.fetch_rankings()

    assert mock_http.get.call_count == 1


# ---------------------------------------------------------------------------
# 8. FIFA_RANKINGS_BASE env var override
# ---------------------------------------------------------------------------


def test_base_url_uses_env_variable(monkeypatch: pytest.MonkeyPatch) -> None:
    """FIFARankingsClient must read base_url from FIFA_RANKINGS_BASE env var."""
    custom_url = "https://staging-fifa.example.com/api"
    monkeypatch.setenv("FIFA_RANKINGS_BASE", custom_url)

    client = FIFARankingsClient()
    assert client._base_url == custom_url


def test_base_url_explicit_arg_takes_priority(monkeypatch: pytest.MonkeyPatch) -> None:
    """Explicit base_url argument must override the environment variable."""
    monkeypatch.setenv("FIFA_RANKINGS_BASE", "https://env-override.example.com")
    explicit = "https://explicit.example.com"
    client = FIFARankingsClient(base_url=explicit)
    assert client._base_url == explicit


def test_base_url_falls_back_to_default(monkeypatch: pytest.MonkeyPatch) -> None:
    """base_url must fall back to the hardcoded default when env var is absent."""
    monkeypatch.delenv("FIFA_RANKINGS_BASE", raising=False)
    client = FIFARankingsClient()
    assert client._base_url == "https://inside.fifa.com/api/ranking-overview"


# ---------------------------------------------------------------------------
# 9. Specific-date query passes date param
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_specific_date_passed_as_query_param(monkeypatch: pytest.MonkeyPatch) -> None:
    """A non-None date must be forwarded as a query parameter."""
    monkeypatch.delenv("FIFA_RANKINGS_BASE", raising=False)
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=_make_response(_RANKINGS_PAYLOAD))
    mock_http.aclose = AsyncMock()

    client = FIFARankingsClient(http_client=mock_http)
    await client.fetch_rankings(date="2026-03-07")

    mock_http.get.assert_called_once_with(
        "https://inside.fifa.com/api/ranking-overview",
        params={"date": "2026-03-07"},
    )


@pytest.mark.asyncio
async def test_no_date_omits_query_param(monkeypatch: pytest.MonkeyPatch) -> None:
    """Calling without a date must not send any query params."""
    monkeypatch.delenv("FIFA_RANKINGS_BASE", raising=False)
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=_make_response(_RANKINGS_PAYLOAD))
    mock_http.aclose = AsyncMock()

    client = FIFARankingsClient(http_client=mock_http)
    await client.fetch_rankings()

    mock_http.get.assert_called_once_with(
        "https://inside.fifa.com/api/ranking-overview",
        params={},
    )


# ---------------------------------------------------------------------------
# 10. aclose semantics
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_aclose_does_not_close_injected_client() -> None:
    """aclose must NOT call aclose() when the client was injected externally."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.aclose = AsyncMock()

    client = FIFARankingsClient(http_client=mock_http)
    await client.aclose()
    mock_http.aclose.assert_not_awaited()


@pytest.mark.asyncio
async def test_cache_keys_separate_for_dates() -> None:
    """Different date arguments must use distinct cache keys."""
    client, mock_http = _make_client(_RANKINGS_PAYLOAD)

    await client.fetch_rankings()
    await client.fetch_rankings(date="2026-03-07")

    # Two separate keys -> two HTTP calls.
    assert mock_http.get.call_count == 2
