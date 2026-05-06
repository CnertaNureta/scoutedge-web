"""Unit tests for scoutedge_intelligence.sources.api_football.APIFootballClient."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from scoutedge_intelligence.sources.api_football import APIFootballClient

# ---------------------------------------------------------------------------
# Fixture payload helpers
# ---------------------------------------------------------------------------

_LEAGUE_ID = 1
_SEASON = 2026
_TEAM_ID = 33

_FIXTURE_ENTRY: dict[str, Any] = {
    "fixture": {
        "id": 999_001,
        "date": "2026-06-11T18:00:00+00:00",
        "status": {"short": "NS", "long": "Not Started", "elapsed": None},
    },
    "league": {"id": _LEAGUE_ID, "season": _SEASON, "name": "FIFA WC"},
    "teams": {
        "home": {"id": 10, "name": "Argentina"},
        "away": {"id": 20, "name": "Brazil"},
    },
    "goals": {"home": None, "away": None},
}

_FIXTURE_LIVE_ENTRY: dict[str, Any] = {
    "fixture": {
        "id": 999_002,
        "date": "2026-06-12T18:00:00+00:00",
        "status": {"short": "1H"},
    },
    "league": {"id": _LEAGUE_ID, "season": _SEASON},
    "teams": {
        "home": {"id": 11, "name": "Spain"},
        "away": {"id": 21, "name": "Germany"},
    },
    "goals": {"home": 1, "away": 0},
}

_FIXTURE_FT_ENTRY: dict[str, Any] = {
    "fixture": {
        "id": 999_003,
        "date": "2026-06-13T18:00:00+00:00",
        "status": {"short": "FT"},
    },
    "league": {"id": _LEAGUE_ID, "season": _SEASON},
    "teams": {
        "home": {"id": 12, "name": "France"},
        "away": {"id": 22, "name": "Italy"},
    },
    "goals": {"home": 2, "away": 1},
}

_FIXTURES_PAYLOAD: dict[str, Any] = {
    "response": [_FIXTURE_ENTRY, _FIXTURE_LIVE_ENTRY, _FIXTURE_FT_ENTRY],
}

_TEAM_STATS_PAYLOAD: dict[str, Any] = {
    "response": {
        "fixtures": {
            "played": {"home": 5, "away": 5, "total": 10},
            "wins": {"home": 4, "away": 3, "total": 7},
        },
        "goals": {
            "for": {"total": {"home": 12, "away": 8, "total": 20}},
            "against": {"total": {"home": 3, "away": 5, "total": 8}},
        },
        "clean_sheet": {"home": 3, "away": 2, "total": 5},
        "failed_to_score": {"home": 0, "away": 1, "total": 1},
        "form": "WWDLW",
    },
}


def _make_response(payload: dict[str, Any], status_code: int = 200) -> MagicMock:
    """Build a MagicMock that quacks like an httpx.Response."""
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = status_code
    mock_resp.json.return_value = payload
    mock_resp.request = MagicMock()
    return mock_resp


def _make_client(
    payload: dict[str, Any] | list[dict[str, Any]],
    status_code: int | list[int] = 200,
    *,
    api_key: str | None = "test-key",
) -> tuple[APIFootballClient, AsyncMock]:
    """Return a client whose mocked ``get`` returns the given payload(s)."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)

    if isinstance(payload, list) and isinstance(status_code, list):
        responses = [_make_response(p, s) for p, s in zip(payload, status_code, strict=True)]
        mock_http.get = AsyncMock(side_effect=responses)
    elif isinstance(status_code, list):
        assert isinstance(payload, dict)
        responses = [_make_response(payload, s) for s in status_code]
        mock_http.get = AsyncMock(side_effect=responses)
    else:
        assert isinstance(payload, dict)
        mock_http.get = AsyncMock(return_value=_make_response(payload, status_code))

    mock_http.aclose = AsyncMock()

    client = APIFootballClient(
        api_key=api_key,
        # Use a very high RPM so throttling never sleeps in tests by default.
        requests_per_minute=600,
        http_client=mock_http,
    )
    return client, mock_http


# ---------------------------------------------------------------------------
# 1. fetch_fixtures happy path
# ---------------------------------------------------------------------------


async def test_fetch_fixtures_normalises_all_fields(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("API_FOOTBALL_KEY", raising=False)

    client, mock_http = _make_client(_FIXTURES_PAYLOAD)
    fixtures = await client.fetch_fixtures(_LEAGUE_ID, _SEASON)

    assert len(fixtures) == 3
    expected_keys = {
        "fixture_id",
        "kickoff_utc",
        "home_team_id",
        "away_team_id",
        "home_team_name",
        "away_team_name",
        "status",
        "home_goals",
        "away_goals",
        "league_id",
        "season",
    }
    for fx in fixtures:
        assert set(fx.keys()) == expected_keys

    scheduled, live, ft = fixtures
    assert scheduled["status"] == "SCHEDULED"
    assert scheduled["fixture_id"] == 999_001
    assert scheduled["home_team_id"] == 10
    assert scheduled["away_team_name"] == "Brazil"
    assert scheduled["home_goals"] is None
    assert scheduled["league_id"] == _LEAGUE_ID
    assert scheduled["season"] == _SEASON

    assert live["status"] == "LIVE"
    assert live["home_goals"] == 1

    assert ft["status"] == "FT"
    assert ft["away_goals"] == 1

    # Auth header was sent.
    _, kwargs = mock_http.get.call_args
    assert kwargs["headers"]["x-apisports-key"] == "test-key"
    assert kwargs["params"] == {"league": _LEAGUE_ID, "season": _SEASON}


# ---------------------------------------------------------------------------
# 2. fetch_team_stats happy path
# ---------------------------------------------------------------------------


async def test_fetch_team_stats_normalises_all_fields() -> None:
    client, _ = _make_client(_TEAM_STATS_PAYLOAD)
    stats = await client.fetch_team_stats(_TEAM_ID, _LEAGUE_ID, _SEASON)

    assert stats == {
        "team_id": _TEAM_ID,
        "fixtures_played": 10,
        "fixtures_won": 7,
        "goals_for": 20,
        "goals_against": 8,
        "clean_sheets": 5,
        "failed_to_score": 1,
        "form": "WWDLW",
    }


# ---------------------------------------------------------------------------
# 3. Missing API key raises ValueError on first call (not at construction)
# ---------------------------------------------------------------------------


async def test_missing_api_key_raises_on_first_call(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("API_FOOTBALL_KEY", raising=False)

    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=_make_response(_FIXTURES_PAYLOAD))
    mock_http.aclose = AsyncMock()

    # Construction must NOT raise.
    client = APIFootballClient(api_key=None, http_client=mock_http)

    with pytest.raises(ValueError, match="API_FOOTBALL_KEY"):
        await client.fetch_fixtures(_LEAGUE_ID, _SEASON)

    mock_http.get.assert_not_called()


# ---------------------------------------------------------------------------
# 4. Constructor api_key takes precedence over env
# ---------------------------------------------------------------------------


async def test_constructor_api_key_overrides_env(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("API_FOOTBALL_KEY", "env-key")

    client, mock_http = _make_client(_FIXTURES_PAYLOAD, api_key="constructor-key")
    await client.fetch_fixtures(_LEAGUE_ID, _SEASON)

    _, kwargs = mock_http.get.call_args
    assert kwargs["headers"]["x-apisports-key"] == "constructor-key"


# ---------------------------------------------------------------------------
# 5. Env api_key used when constructor is None
# ---------------------------------------------------------------------------


async def test_env_api_key_used_when_no_constructor(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("API_FOOTBALL_KEY", "env-key")

    client, mock_http = _make_client(_FIXTURES_PAYLOAD, api_key=None)
    await client.fetch_fixtures(_LEAGUE_ID, _SEASON)

    _, kwargs = mock_http.get.call_args
    assert kwargs["headers"]["x-apisports-key"] == "env-key"


# ---------------------------------------------------------------------------
# 6. 5xx retried up to 3 times, then raises
# ---------------------------------------------------------------------------


async def test_5xx_retried_three_times_then_raises() -> None:
    client, mock_http = _make_client(
        {},
        status_code=[500, 502, 503],
    )

    with pytest.raises(httpx.HTTPError):
        await client.fetch_fixtures(_LEAGUE_ID, _SEASON)

    assert mock_http.get.call_count == 3


# ---------------------------------------------------------------------------
# 7. 401 propagates immediately and is NOT retried
# ---------------------------------------------------------------------------


async def test_401_not_retried() -> None:
    client, mock_http = _make_client({}, status_code=401)

    with pytest.raises(httpx.HTTPStatusError):
        await client.fetch_fixtures(_LEAGUE_ID, _SEASON)

    assert mock_http.get.call_count == 1


# ---------------------------------------------------------------------------
# 8. Rate limit: back-to-back calls trigger asyncio.sleep
# ---------------------------------------------------------------------------


async def test_rate_limit_enforces_sleep_between_calls() -> None:
    """Two back-to-back calls must hit asyncio.sleep at least once."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=_make_response(_FIXTURES_PAYLOAD))
    mock_http.aclose = AsyncMock()

    # 60 RPM -> min interval = 1.0s.
    client = APIFootballClient(
        api_key="test-key",
        requests_per_minute=60,
        http_client=mock_http,
    )

    with patch(
        "scoutedge_intelligence.sources.api_football.asyncio.sleep",
        new=AsyncMock(),
    ) as mock_sleep:
        await client.fetch_fixtures(_LEAGUE_ID, _SEASON)
        await client.fetch_fixtures(_LEAGUE_ID, _SEASON)

        # The second call should sleep to honour the 1s minimum interval.
        assert mock_sleep.await_count >= 1
        # Sleep argument is positive.
        first_arg = mock_sleep.await_args_list[0].args[0]
        assert first_arg > 0.0


# ---------------------------------------------------------------------------
# 9. API_FOOTBALL_BASE env var overrides default
# ---------------------------------------------------------------------------


async def test_base_url_env_var_overrides_default(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("API_FOOTBALL_BASE", "https://staging.api-sports.io")

    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = AsyncMock(return_value=_make_response(_FIXTURES_PAYLOAD))
    mock_http.aclose = AsyncMock()

    client = APIFootballClient(
        api_key="test-key",
        requests_per_minute=600,
        http_client=mock_http,
    )
    assert client._base_url == "https://staging.api-sports.io"

    await client.fetch_fixtures(_LEAGUE_ID, _SEASON)
    args, _ = mock_http.get.call_args
    assert args[0].startswith("https://staging.api-sports.io/")


def test_explicit_base_url_arg_overrides_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("API_FOOTBALL_BASE", "https://env.example.com")

    client = APIFootballClient(
        api_key="test-key",
        base_url="https://explicit.example.com",
        requests_per_minute=600,
    )
    assert client._base_url == "https://explicit.example.com"


# ---------------------------------------------------------------------------
# 10. aclose lifecycle mirrors polymarket
# ---------------------------------------------------------------------------


async def test_aclose_does_not_close_injected_client() -> None:
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.aclose = AsyncMock()

    client = APIFootballClient(api_key="x", http_client=mock_http)
    await client.aclose()

    mock_http.aclose.assert_not_awaited()


async def test_aclose_closes_owned_client() -> None:
    with patch("httpx.AsyncClient", autospec=True) as mock_cls:
        mock_instance = AsyncMock()
        mock_cls.return_value = mock_instance
        mock_instance.aclose = AsyncMock()

        client = APIFootballClient(api_key="x")
        await client.aclose()

        mock_instance.aclose.assert_awaited_once()
