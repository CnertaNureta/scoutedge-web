"""Unit tests for scoutedge_intelligence.claude.feature_generator."""

from __future__ import annotations

import json
import os
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from anthropic.types import TextBlock
from pydantic import ValidationError

from scoutedge_intelligence.claude.feature_generator import (
    FeatureGenerator,
    FeatureGenInput,
    FeatureGenOutput,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_VALID_PAYLOAD = {
    "home_team": "Brazil",
    "away_team": "Portugal",
    "intel_text": "Both teams fully fit.",
    "venue_city": "Doha",
    "kickoff_iso": "2026-07-14T20:00:00Z",
}

_VALID_FEATURES: dict[str, float] = {
    "home_key_player_availability": 0.9,
    "away_key_player_availability": 0.8,
    "home_lineup_certainty": 0.7,
    "away_lineup_certainty": 0.6,
    "weather_adversity": 0.3,
    "home_travel_fatigue": 0.1,
    "away_travel_fatigue": 0.2,
    "crowd_advantage": 0.5,
    "intel_confidence": 0.75,
}


def _make_mock_client(response_text: str) -> MagicMock:
    """Return a mock AsyncAnthropic whose messages.create returns *response_text*.

    Uses a real ``TextBlock`` instance so that ``isinstance(block, TextBlock)``
    passes inside ``FeatureGenerator.generate``.
    """
    content_block = TextBlock(type="text", text=response_text)

    message_obj = MagicMock()
    message_obj.content = [content_block]

    client = MagicMock()
    client.messages = MagicMock()
    client.messages.create = AsyncMock(return_value=message_obj)
    return client


def _make_generator(response_text: str, **kwargs: Any) -> FeatureGenerator:
    client = _make_mock_client(response_text)
    return FeatureGenerator(client=client, **kwargs)


# ---------------------------------------------------------------------------
# Test 1: Happy path — clean JSON → correct FeatureGenOutput
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_happy_path() -> None:
    gen = _make_generator(json.dumps(_VALID_FEATURES))
    result = await gen.generate(FeatureGenInput(**_VALID_PAYLOAD))

    assert isinstance(result, FeatureGenOutput)
    assert result.home_key_player_availability == pytest.approx(0.9)
    assert result.away_key_player_availability == pytest.approx(0.8)
    assert result.intel_confidence == pytest.approx(0.75)


# ---------------------------------------------------------------------------
# Test 2: Out-of-range value (1.2) is clipped to 1.0
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_out_of_range_value_clipped() -> None:
    features = {**_VALID_FEATURES, "home_key_player_availability": 1.2}
    gen = _make_generator(json.dumps(features))
    result = await gen.generate(FeatureGenInput(**_VALID_PAYLOAD))

    assert result.home_key_player_availability == pytest.approx(1.0)


# ---------------------------------------------------------------------------
# Test 3: SDK returns prose around JSON — first JSON block is extracted
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_prose_around_json_extracted() -> None:
    prose = f"Sure! Here is the analysis:\n\n{json.dumps(_VALID_FEATURES)}\n\nI hope that helps."
    gen = _make_generator(prose)
    result = await gen.generate(FeatureGenInput(**_VALID_PAYLOAD))

    assert isinstance(result, FeatureGenOutput)
    assert result.weather_adversity == pytest.approx(0.3)


# ---------------------------------------------------------------------------
# Test 4: SDK returns invalid JSON → raises ValueError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_invalid_json_raises_value_error() -> None:
    gen = _make_generator("this is not json at all")
    with pytest.raises(ValueError, match="No JSON object found"):
        await gen.generate(FeatureGenInput(**_VALID_PAYLOAD))


# ---------------------------------------------------------------------------
# Test 5: Missing required field → raises pydantic.ValidationError
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_required_field_raises_validation_error() -> None:
    incomplete = {k: v for k, v in _VALID_FEATURES.items() if k != "intel_confidence"}
    gen = _make_generator(json.dumps(incomplete))
    with pytest.raises(ValidationError):
        await gen.generate(FeatureGenInput(**_VALID_PAYLOAD))


# ---------------------------------------------------------------------------
# Test 6: Custom model arg overrides default
# ---------------------------------------------------------------------------


def test_custom_model_arg_overrides_default() -> None:
    custom_model = "claude-haiku-4-5-custom"
    # Ensure env var is not set so constructor arg wins
    env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_MODEL_FEATURE_GEN"}
    with patch.dict(os.environ, env, clear=True):
        gen = FeatureGenerator(client=_make_mock_client("{}"), model=custom_model)
    assert gen._model == custom_model


# ---------------------------------------------------------------------------
# Test 7: Env var ANTHROPIC_MODEL_FEATURE_GEN overrides constructor arg
# ---------------------------------------------------------------------------


def test_env_var_overrides_constructor_arg() -> None:
    env_model = "claude-haiku-from-env"
    with patch.dict(os.environ, {"ANTHROPIC_MODEL_FEATURE_GEN": env_model}):
        gen = FeatureGenerator(client=_make_mock_client("{}"), model="claude-haiku-arg-model")
    assert gen._model == env_model


# ---------------------------------------------------------------------------
# Test 8: Missing ANTHROPIC_API_KEY → generate() propagates SDK exception
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_missing_api_key_raises_on_generate() -> None:
    """When the SDK rejects the request (no/invalid key), generate() propagates the error."""
    # Use a generic RuntimeError to simulate what the SDK raises when auth fails,
    # without needing to instantiate the internal Anthropic exception hierarchy.
    auth_exc = RuntimeError("401 AuthenticationError: No API key provided")

    client = MagicMock()
    client.messages = MagicMock()
    client.messages.create = AsyncMock(side_effect=auth_exc)

    gen = FeatureGenerator(client=client)  # type: ignore[arg-type]
    with pytest.raises(RuntimeError, match="401"):
        await gen.generate(FeatureGenInput(**_VALID_PAYLOAD))


# ---------------------------------------------------------------------------
# Test 9: Negative value (-0.1) is clipped to 0.0
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_negative_value_clipped_to_zero() -> None:
    features = {**_VALID_FEATURES, "away_travel_fatigue": -0.1}
    gen = _make_generator(json.dumps(features))
    result = await gen.generate(FeatureGenInput(**_VALID_PAYLOAD))

    assert result.away_travel_fatigue == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# Test 10: JSON embedded in markdown code fence is extracted
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_json_in_markdown_fence_extracted() -> None:
    fenced = f"```json\n{json.dumps(_VALID_FEATURES)}\n```"
    gen = _make_generator(fenced)
    result = await gen.generate(FeatureGenInput(**_VALID_PAYLOAD))

    assert isinstance(result, FeatureGenOutput)
    assert result.crowd_advantage == pytest.approx(0.5)
