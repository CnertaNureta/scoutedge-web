"""Extra coverage for claude.feature_generator: paths missed by test_feature_generator.

Targets:
- _clip raises ValueError on unconvertible value
- generate(): non-TextBlock first response content raises ValueError
- _extract_json: fallback brace-match yields invalid JSON → ValueError
- _extract_json: parsed JSON is a list (not dict) → ValueError
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scoutedge_intelligence.claude import feature_generator as fg


def _build_generator() -> fg.FeatureGenerator:
    """Build a FeatureGenerator with a stubbed Anthropic client."""
    with patch("scoutedge_intelligence.claude.feature_generator.AsyncAnthropic"):
        return fg.FeatureGenerator(client=MagicMock())


# ---------------------------------------------------------------------------
# _clip
# ---------------------------------------------------------------------------


def test_clip_raises_on_unconvertible_value() -> None:
    with pytest.raises(ValueError, match="Cannot convert"):
        fg._clip("not a number")


# ---------------------------------------------------------------------------
# _extract_json error branches
# ---------------------------------------------------------------------------


def test_extract_json_invalid_brace_block_raises_value_error() -> None:
    # Direct parse fails AND brace-extracted text is invalid JSON
    bad = "preamble {bad: json,} trailing"
    with pytest.raises(ValueError, match="not valid JSON"):
        fg.FeatureGenerator._extract_json(bad)


def test_extract_json_non_dict_raises_value_error() -> None:
    # The regex matches `{}` so the brace-extracted text parses, but to a
    # non-dict requires a JSON list pretending to be inside braces. The regex
    # is `\{.*?\}` which only matches `{...}` so we patch it.
    text = "wrapper [1, 2, 3] more"
    with patch.object(fg, "_JSON_BLOCK_RE") as mock_re:
        match = MagicMock()
        match.group.return_value = "[1, 2, 3]"
        mock_re.search.return_value = match
        with pytest.raises(ValueError, match="not an object"):
            fg.FeatureGenerator._extract_json(text)


# ---------------------------------------------------------------------------
# generate() non-TextBlock raise
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_generate_non_text_block_raises_value_error() -> None:
    gen = _build_generator()
    fake_block = MagicMock()  # not a TextBlock instance
    fake_response = MagicMock()
    fake_response.content = [fake_block]
    gen._client.messages.create = AsyncMock(return_value=fake_response)

    payload = fg.FeatureGenInput(
        home_team="A",
        away_team="B",
        intel_text="some intel",
    )

    with pytest.raises(ValueError, match="Expected TextBlock"):
        await gen.generate(payload)
