"""Direct unit tests for api.routes.divergence_feedback internals.

Covers the inline ``_insert_feedback`` helper and the 500 error path of
``post_feedback`` — both bypassed by the route-level patches in
``test_routes_predict.py``.
"""

from __future__ import annotations

import contextlib
from collections.abc import Iterator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.deps import EngineFactory, Settings, get_db_session
from api.main import create_app
from api.routes import divergence_feedback as df_route


def _stub_settings() -> Settings:
    return Settings.model_construct(
        database_url="sqlite+aiosqlite:///./test_df.db",
        redis_url="redis://localhost:6379",
        cors_origins=["http://localhost:3000"],
        api_key=None,
        rate_limit_per_minute=120,
        log_level="DEBUG",
    )


@pytest.mark.asyncio
async def test_insert_feedback_executes_and_commits() -> None:
    """`_insert_feedback` must execute exactly one insert and commit."""
    session = MagicMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()

    new_id = await df_route._insert_feedback(
        session,
        user_id="u-1",
        match_id="m-1",
        user_action="agreed",
        expanded=True,
        diagnosis_id=42,
        challenge_reason=None,
        challenge_alternative_probs=None,
    )

    assert isinstance(new_id, str) and len(new_id) == 36  # uuid4 string
    session.execute.assert_awaited_once()
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_insert_feedback_dismissed_sets_flag() -> None:
    """`was_dismissed` must reflect the ``dismissed`` user_action.

    Verifies the values payload by inspecting the SQLAlchemy Insert built.
    """
    captured: dict[str, object] = {}

    async def _capture_execute(stmt: object) -> MagicMock:
        # The compiled values dict on the Insert is exposed via ``.compile().params``
        # but for tests we inspect the bound values via ``stmt.compile().params``.
        captured["stmt"] = stmt
        return MagicMock()

    session = MagicMock()
    session.execute = AsyncMock(side_effect=_capture_execute)
    session.commit = AsyncMock()

    await df_route._insert_feedback(
        session,
        user_id="u-2",
        match_id="m-2",
        user_action="dismissed",
        expanded=False,
        diagnosis_id=None,
        challenge_reason=None,
        challenge_alternative_probs=None,
    )

    stmt = captured["stmt"]
    params = stmt.compile().params  # type: ignore[attr-defined]
    assert params["was_dismissed"] is True
    assert params["was_clicked"] is False
    # When omitted by caller, ``divergence_type`` falls back to the safe
    # default that satisfies the DB CHECK constraint.
    assert params["divergence_type"] == "other"
    assert params["diagnosis_payload"]["user_action"] == "dismissed"


@pytest.mark.asyncio
async def test_insert_feedback_uses_other_when_divergence_type_omitted() -> None:
    """When the caller omits ``divergence_type``, the insert payload uses ``'other'``.

    ``'other'`` is one of the values allowed by the DB CHECK constraint
    ``divergence_diagnoses_type_valid``, so this prevents the production 500
    that originally surfaced this bug.
    """
    captured: dict[str, object] = {}

    async def _capture_execute(stmt: object) -> MagicMock:
        captured["stmt"] = stmt
        return MagicMock()

    session = MagicMock()
    session.execute = AsyncMock(side_effect=_capture_execute)
    session.commit = AsyncMock()

    await df_route._insert_feedback(
        session,
        user_id="u-omit",
        match_id="m-omit",
        user_action="agreed",
        expanded=True,
        diagnosis_id=None,
        challenge_reason=None,
        challenge_alternative_probs=None,
        # divergence_type intentionally omitted
    )

    stmt = captured["stmt"]
    params = stmt.compile().params  # type: ignore[attr-defined]
    assert params["divergence_type"] == "other"
    assert params["divergence_type"] in df_route.ALLOWED_DIVERGENCE_TYPES


@pytest.mark.asyncio
async def test_insert_feedback_propagates_supplied_divergence_type() -> None:
    """A supplied ``divergence_type`` must reach the insert payload verbatim."""
    captured: dict[str, object] = {}

    async def _capture_execute(stmt: object) -> MagicMock:
        captured["stmt"] = stmt
        return MagicMock()

    session = MagicMock()
    session.execute = AsyncMock(side_effect=_capture_execute)
    session.commit = AsyncMock()

    await df_route._insert_feedback(
        session,
        user_id="u-supply",
        match_id="m-supply",
        user_action="agreed",
        expanded=False,
        diagnosis_id=None,
        challenge_reason=None,
        challenge_alternative_probs=None,
        divergence_type="ml_vs_poly",
    )

    stmt = captured["stmt"]
    params = stmt.compile().params  # type: ignore[attr-defined]
    assert params["divergence_type"] == "ml_vs_poly"


@contextlib.contextmanager
def _make_client() -> Iterator[TestClient]:
    """TestClient with EngineFactory and DB engine patched away."""
    mock_session = AsyncMock()
    mock_session.__aenter__ = AsyncMock(return_value=mock_session)
    mock_session.__aexit__ = AsyncMock(return_value=False)

    async def _override_get_db_session():  # type: ignore[return]
        yield mock_session

    with contextlib.ExitStack() as stack:
        for target in [
            "api.deps.FootballELO",
            "api.deps.DixonColesModel",
            "api.deps.PolymarketClient",
            "api.deps.SportsbookClient",
            "api.deps.FeatureGenerator",
            "api.deps.DivergenceAnalyst",
            "api.deps.JSONSynthesizer",
            "api.deps.Translator",
        ]:
            stack.enter_context(patch(target, return_value=MagicMock()))

        mock_db_engine = MagicMock()
        mock_db_engine.dispose = AsyncMock()
        stack.enter_context(patch("api.deps.create_async_engine", return_value=mock_db_engine))

        mock_factory = MagicMock(spec=EngineFactory)
        mock_factory.aclose = AsyncMock()
        stack.enter_context(patch("api.main.EngineFactory", return_value=mock_factory))
        stack.enter_context(patch("api.main.async_sessionmaker", return_value=MagicMock()))

        app = create_app(settings=_stub_settings())
        app.dependency_overrides[get_db_session] = _override_get_db_session
        yield TestClient(app, raise_server_exceptions=True)


def test_post_feedback_returns_500_when_insert_raises() -> None:
    """When ``_insert_feedback`` raises, the route returns HTTP 500."""
    payload = {
        "user_id": "u-err",
        "match_id": "m-err",
        "expanded": False,
        "user_action": "agreed",
    }

    with (
        _make_client() as client,
        patch(
            "api.routes.divergence_feedback._insert_feedback",
            new=AsyncMock(side_effect=RuntimeError("db down")),
        ),
    ):
        resp = client.post("/api/divergence/feedback", json=payload)

    assert resp.status_code == 500
    assert "Failed to persist feedback" in resp.json()["detail"]
