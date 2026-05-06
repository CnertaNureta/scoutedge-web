"""Unit tests for scoutedge_intelligence.sources.fbref.FBrefClient."""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from scoutedge_intelligence.sources import fbref as fbref_mod
from scoutedge_intelligence.sources.fbref import FBrefClient

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_TEAM_ID = "f9fee9b1"
_SEASON = "2026"

# Hand-crafted HTML snippet that includes the data-stat cells the parser
# is looking for, with the season-total row appearing first (as on real
# FBref squad pages). Includes some unrelated cells to ensure they're
# correctly ignored.
_FBREF_HTML_SAMPLE = """
<html><body>
<table id="stats_squads_standard">
  <tr>
    <th data-stat="team" class="left">Argentina</th>
    <td data-stat="games" class="right">12</td>
    <td data-stat="possession" class="right">61.4</td>
    <td data-stat="passes_pct" class="right">90.7</td>
    <td data-stat="xg_for" class="right">21.8</td>
    <td data-stat="xg_against" class="right">7.9</td>
    <td data-stat="shots_on_target" class="right">48</td>
    <td data-stat="fouls" class="right">142</td>
    <td data-stat="unrelated_field" class="right">99</td>
  </tr>
  <tr>
    <!-- a per-opponent row that should NOT override the aggregate above -->
    <td data-stat="games" class="right">99</td>
    <td data-stat="xg_for" class="right">100.0</td>
  </tr>
</table>
</body></html>
""".strip()


def _ok_response(body: str) -> MagicMock:
    """Build a mock httpx.Response wrapping the given HTML body."""
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = 200
    resp.text = body
    resp.raise_for_status.return_value = None
    return resp


def _err_response(status_code: int) -> MagicMock:
    """Build a mock httpx.Response that raises HTTPStatusError on raise_for_status."""
    resp = MagicMock(spec=httpx.Response)
    resp.status_code = status_code
    resp.text = ""
    resp.raise_for_status.side_effect = httpx.HTTPStatusError(
        f"HTTP {status_code}",
        request=MagicMock(),
        response=resp,
    )
    return resp


def _make_client(get_mock: AsyncMock) -> FBrefClient:
    """Return an FBrefClient with the given .get() mock injected."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.get = get_mock
    mock_http.aclose = AsyncMock()
    return FBrefClient(http_client=mock_http)


# ---------------------------------------------------------------------------
# 1. Happy path - all expected fields parsed
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_fetch_team_season_stats_happy_path(monkeypatch: pytest.MonkeyPatch) -> None:
    """All ten documented fields must be present and correctly parsed."""
    monkeypatch.delenv("FBREF_BASE_URL", raising=False)
    # No real sleeping during tests.
    monkeypatch.setattr(fbref_mod.asyncio, "sleep", AsyncMock())

    get_mock = AsyncMock(return_value=_ok_response(_FBREF_HTML_SAMPLE))
    client = _make_client(get_mock)

    result = await client.fetch_team_season_stats(_TEAM_ID, _SEASON)

    expected_keys = {
        "team_id",
        "season",
        "matches_played",
        "xg_for",
        "xg_against",
        "possession_pct",
        "passes_completed_pct",
        "fouls",
        "shots_on_target",
        "season_url",
    }
    assert set(result.keys()) == expected_keys

    assert result["team_id"] == _TEAM_ID
    assert result["season"] == _SEASON
    assert result["season_url"] == f"https://fbref.com/en/squads/{_TEAM_ID}/{_SEASON}-stats"
    assert result["matches_played"] == 12
    assert result["xg_for"] == pytest.approx(21.8)
    assert result["xg_against"] == pytest.approx(7.9)
    assert result["possession_pct"] == pytest.approx(61.4)
    assert result["passes_completed_pct"] == pytest.approx(90.7)
    assert result["fouls"] == 142
    assert result["shots_on_target"] == 48


# ---------------------------------------------------------------------------
# 2. Throttle: back-to-back fetches sleep between them
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_throttle_sleeps_between_consecutive_fetches(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Two back-to-back fetches must invoke asyncio.sleep with a positive delay."""
    sleep_mock = AsyncMock()
    monkeypatch.setattr(fbref_mod.asyncio, "sleep", sleep_mock)

    get_mock = AsyncMock(return_value=_ok_response(_FBREF_HTML_SAMPLE))
    client = _make_client(get_mock)

    await client.fetch_team_season_stats(_TEAM_ID, "2025")
    await client.fetch_team_season_stats(_TEAM_ID, "2026")

    # First call: no sleep needed (no previous request). Second call: sleep
    # must have been awaited at least once with a positive delay.
    assert sleep_mock.await_count >= 1
    delay = sleep_mock.await_args_list[-1].args[0]
    assert delay > 0.0


# ---------------------------------------------------------------------------
# 3. Cache hit: same key does not call httpx
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cache_hit_skips_http(monkeypatch: pytest.MonkeyPatch) -> None:
    """A second fetch with the same (team_id, season) must not hit httpx."""
    monkeypatch.setattr(fbref_mod.asyncio, "sleep", AsyncMock())

    get_mock = AsyncMock(return_value=_ok_response(_FBREF_HTML_SAMPLE))
    client = _make_client(get_mock)

    first = await client.fetch_team_season_stats(_TEAM_ID, _SEASON)
    second = await client.fetch_team_season_stats(_TEAM_ID, _SEASON)

    assert first == second
    assert get_mock.await_count == 1


# ---------------------------------------------------------------------------
# 4. Cache TTL expiry refetches
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_cache_expires_after_ttl(monkeypatch: pytest.MonkeyPatch) -> None:
    """After 6h+ of monotonic time has passed, the next fetch must hit httpx again."""
    monkeypatch.setattr(fbref_mod.asyncio, "sleep", AsyncMock())

    # Clock starts at 1000.0; advance > 6h on demand.
    clock = {"now": 1000.0}
    monkeypatch.setattr(fbref_mod.time, "monotonic", lambda: clock["now"])

    get_mock = AsyncMock(return_value=_ok_response(_FBREF_HTML_SAMPLE))
    client = _make_client(get_mock)

    await client.fetch_team_season_stats(_TEAM_ID, _SEASON)
    assert get_mock.await_count == 1

    # Advance past 6 hours (21600s).
    clock["now"] = 1000.0 + (6 * 60 * 60) + 1.0

    await client.fetch_team_season_stats(_TEAM_ID, _SEASON)
    assert get_mock.await_count == 2


# ---------------------------------------------------------------------------
# 5. Network errors are retried up to 3 attempts then raise
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_network_error_retried_three_times(monkeypatch: pytest.MonkeyPatch) -> None:
    """A persistent transport error must be retried up to 3 times in total."""
    monkeypatch.setattr(fbref_mod.asyncio, "sleep", AsyncMock())

    # Also stub tenacity's internal sleep so we don't actually wait.
    get_mock = AsyncMock(side_effect=httpx.ConnectError("dns fail"))
    client = _make_client(get_mock)

    with pytest.raises(httpx.ConnectError):
        await client.fetch_team_season_stats(_TEAM_ID, _SEASON)

    assert get_mock.await_count == 3


# ---------------------------------------------------------------------------
# 6. 4xx is NOT retried, raises immediately
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_4xx_not_retried(monkeypatch: pytest.MonkeyPatch) -> None:
    """A 404 must surface on the first attempt (not retried)."""
    monkeypatch.setattr(fbref_mod.asyncio, "sleep", AsyncMock())

    get_mock = AsyncMock(return_value=_err_response(404))
    client = _make_client(get_mock)

    with pytest.raises(httpx.HTTPStatusError):
        await client.fetch_team_season_stats(_TEAM_ID, _SEASON)

    # Exactly one call - no retry on 4xx.
    assert get_mock.await_count == 1


# ---------------------------------------------------------------------------
# 7. FBREF_BASE_URL env override
# ---------------------------------------------------------------------------


def test_base_url_uses_env_variable(monkeypatch: pytest.MonkeyPatch) -> None:
    """FBrefClient must read base_url from FBREF_BASE_URL env var."""
    custom = "https://staging-fbref.example.com"
    monkeypatch.setenv("FBREF_BASE_URL", custom)

    client = FBrefClient()
    assert client._base_url == custom


def test_base_url_explicit_arg_overrides_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Explicit base_url argument takes priority over the env var."""
    monkeypatch.setenv("FBREF_BASE_URL", "https://env.example.com")
    explicit = "https://explicit.example.com"
    client = FBrefClient(base_url=explicit)
    assert client._base_url == explicit


def test_base_url_falls_back_to_default(monkeypatch: pytest.MonkeyPatch) -> None:
    """base_url falls back to https://fbref.com when env var is absent."""
    monkeypatch.delenv("FBREF_BASE_URL", raising=False)
    client = FBrefClient()
    assert client._base_url == "https://fbref.com"


# ---------------------------------------------------------------------------
# 8. aclose only closes self-owned client
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_aclose_closes_owned_client() -> None:
    """aclose must close the internally-created AsyncClient."""
    with patch("httpx.AsyncClient", autospec=True) as mock_cls:
        instance = AsyncMock()
        instance.aclose = AsyncMock()
        mock_cls.return_value = instance

        client = FBrefClient()
        assert client._owns_client is True

        await client.aclose()
        instance.aclose.assert_awaited_once()


@pytest.mark.asyncio
async def test_aclose_does_not_close_injected_client() -> None:
    """aclose must NOT close an externally-injected AsyncClient."""
    mock_http = AsyncMock(spec=httpx.AsyncClient)
    mock_http.aclose = AsyncMock()

    client = FBrefClient(http_client=mock_http)
    assert client._owns_client is False

    await client.aclose()
    mock_http.aclose.assert_not_awaited()


# ---------------------------------------------------------------------------
# 9. Missing fields are returned as None (nullability contract)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_fields_return_none(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stat fields absent from the HTML must come back as None (not raise)."""
    monkeypatch.setattr(fbref_mod.asyncio, "sleep", AsyncMock())

    sparse_html = """
    <table>
      <tr>
        <td data-stat="games">9</td>
        <td data-stat="xg_for">14.2</td>
      </tr>
    </table>
    """
    get_mock = AsyncMock(return_value=_ok_response(sparse_html))
    client = _make_client(get_mock)

    result: dict[str, Any] = await client.fetch_team_season_stats(_TEAM_ID, _SEASON)

    assert result["matches_played"] == 9
    assert result["xg_for"] == pytest.approx(14.2)
    assert result["xg_against"] is None
    assert result["possession_pct"] is None
    assert result["passes_completed_pct"] is None
    assert result["fouls"] is None
    assert result["shots_on_target"] is None
