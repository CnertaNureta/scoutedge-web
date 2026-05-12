"""Unit tests for scoutedge_intelligence.analyst.triggers (task P3.3).

Covers all decision branches, priority arithmetic, env-var reading,
signal classification, and edge cases.
"""

from __future__ import annotations

import pytest

from scoutedge_intelligence.analyst.triggers import (
    TriggerConfig,
    TriggerDecision,
    should_invoke_analyst,
)

# ---------------------------------------------------------------------------
# Fixtures / helpers
# ---------------------------------------------------------------------------

_BASE_FEATURES: dict[str, object] = {
    "three_way_agreement_score": 0.70,
    "max_pairwise_kl": 0.04,
    "max_pairwise_gap": 0.08,
    "triggered_signals": [],
}


def _features(**overrides: object) -> dict[str, object]:
    """Return a copy of base features with selective overrides."""
    return {**_BASE_FEATURES, **overrides}


# ---------------------------------------------------------------------------
# 1. Feature flag — ANALYST_ENABLED=False
# ---------------------------------------------------------------------------


def test_disabled_flag_returns_no_invoke() -> None:
    """ANALYST_ENABLED=False must suppress invocation regardless of divergence."""
    cfg = TriggerConfig(ANALYST_ENABLED=False)
    result = should_invoke_analyst(_features(), config=cfg)

    assert result.invoke is False
    assert "feature_flag_disabled" in result.reasons
    assert result.estimated_priority == 0.0


def test_disabled_flag_ignores_high_divergence() -> None:
    """Even extreme divergence must not override the disabled flag."""
    cfg = TriggerConfig(ANALYST_ENABLED=False)
    high_div = _features(
        three_way_agreement_score=0.10,
        max_pairwise_kl=0.99,
        max_pairwise_gap=0.90,
        triggered_signals=["ML_SB_HOME_GAP"],
    )
    result = should_invoke_analyst(high_div, config=cfg)

    assert result.invoke is False
    assert result.reasons == ["feature_flag_disabled"]


# ---------------------------------------------------------------------------
# 2. High agreement → consensus_skip
# ---------------------------------------------------------------------------


def test_high_agreement_skips_analyst() -> None:
    """three_way_agreement_score >= 0.92 must return consensus_skip."""
    cfg = TriggerConfig()
    result = should_invoke_analyst(_features(three_way_agreement_score=0.95), config=cfg)

    assert result.invoke is False
    assert "consensus_skip" in result.reasons


def test_agreement_at_threshold_boundary_skips() -> None:
    """Agreement exactly at AGREEMENT_SKIP_THRESHOLD (0.92) should skip."""
    cfg = TriggerConfig()
    result = should_invoke_analyst(_features(three_way_agreement_score=0.92), config=cfg)

    assert result.invoke is False
    assert "consensus_skip" in result.reasons


def test_agreement_just_below_threshold_does_not_skip() -> None:
    """Agreement just below 0.92 should NOT trigger consensus_skip."""
    cfg = TriggerConfig()
    result = should_invoke_analyst(_features(three_way_agreement_score=0.919), config=cfg)

    assert result.invoke is True
    assert "consensus_skip" not in result.reasons


# ---------------------------------------------------------------------------
# 3. HIGH_DIVERGENCE_ONLY + low priority → invoke=False
# ---------------------------------------------------------------------------


def test_high_divergence_only_low_priority_skips() -> None:
    """HIGH_DIVERGENCE_ONLY with priority < 0.5 must return invoke=False."""
    cfg = TriggerConfig(HIGH_DIVERGENCE_ONLY=True)
    # max_pairwise_kl=0.03 → p_kl = (0.03-0.02)/(0.06-0.02) = 0.25
    # max_pairwise_gap=0.06 → p_gap = (0.06-0.05)/(0.12-0.05) ≈ 0.143
    # no signals → p_signal = 0.0  ⟹  priority ≈ 0.25 < 0.5
    result = should_invoke_analyst(
        _features(
            three_way_agreement_score=0.50,
            max_pairwise_kl=0.03,
            max_pairwise_gap=0.06,
            triggered_signals=[],
        ),
        config=cfg,
    )

    assert result.invoke is False
    assert "feature_flag_high_only" in result.reasons
    assert 0.0 <= result.estimated_priority < 0.5


# ---------------------------------------------------------------------------
# 4. HIGH_DIVERGENCE_ONLY + high priority → invoke=True
# ---------------------------------------------------------------------------


def test_high_divergence_only_high_priority_invokes() -> None:
    """HIGH_DIVERGENCE_ONLY with priority >= 0.5 must still invoke."""
    cfg = TriggerConfig(HIGH_DIVERGENCE_ONLY=True)
    # max_pairwise_kl=0.06 → p_kl = (0.06-0.02)/(0.06-0.02) = 1.0
    result = should_invoke_analyst(
        _features(
            three_way_agreement_score=0.50,
            max_pairwise_kl=0.06,
            max_pairwise_gap=0.06,
            triggered_signals=[],
        ),
        config=cfg,
    )

    assert result.invoke is True
    assert "feature_flag_high_only" not in result.reasons


def test_high_divergence_only_priority_exactly_half_invokes() -> None:
    """Priority == 0.5 is NOT below 0.5, so it should invoke."""
    cfg = TriggerConfig(HIGH_DIVERGENCE_ONLY=True)
    # Use 3 signals: p_signal = min(1.0, 3/3) = 1.0  → priority = 1.0 ≥ 0.5
    result = should_invoke_analyst(
        _features(
            three_way_agreement_score=0.50,
            max_pairwise_kl=0.00,
            max_pairwise_gap=0.00,
            triggered_signals=["ML_SB_HOME_GAP", "ML_SB_DRAW_GAP", "ML_SB_AWAY_WIN_GAP"],
        ),
        config=cfg,
    )

    assert result.invoke is True


# ---------------------------------------------------------------------------
# 5. ml_outlier reason
# ---------------------------------------------------------------------------


def test_ml_signal_produces_ml_outlier_reason() -> None:
    """A signal containing 'ML' must add 'ml_outlier' to the reasons."""
    result = should_invoke_analyst(
        _features(triggered_signals=["ML_SB_HOME_GAP"]),
    )

    assert result.invoke is True
    assert "ml_outlier" in result.reasons
    assert "ML_SB_HOME_GAP" in result.triggered_signals


# ---------------------------------------------------------------------------
# 6. poly_disagreement AND draw_outlier from one signal
# ---------------------------------------------------------------------------


def test_sb_pm_draw_gap_triggers_both_poly_and_draw() -> None:
    """'SB_PM_DRAW_GAP' contains both 'PM' and 'DRAW' and must set both reasons."""
    result = should_invoke_analyst(
        _features(triggered_signals=["SB_PM_DRAW_GAP"]),
    )

    assert result.invoke is True
    assert "poly_disagreement" in result.reasons
    assert "draw_outlier" in result.reasons
    assert "SB_PM_DRAW_GAP" in result.triggered_signals


# ---------------------------------------------------------------------------
# 7. estimated_priority is always in [0, 1]
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "kl,gap,signals",
    [
        (0.0, 0.0, []),
        (0.06, 0.12, ["ML_SB_HOME_GAP", "SB_PM_DRAW_GAP", "ML_PM_AWAY_WIN_GAP"]),
        (0.99, 0.99, ["X", "Y", "Z", "W"]),
        (0.02, 0.05, []),
    ],
)
def test_estimated_priority_in_unit_interval(kl: float, gap: float, signals: list[str]) -> None:
    """estimated_priority must always be in [0, 1] regardless of inputs."""
    result = should_invoke_analyst(
        _features(
            three_way_agreement_score=0.50,
            max_pairwise_kl=kl,
            max_pairwise_gap=gap,
            triggered_signals=signals,
        )
    )
    assert 0.0 <= result.estimated_priority <= 1.0


# ---------------------------------------------------------------------------
# 8. from_env reads environment correctly
# ---------------------------------------------------------------------------


def test_from_env_disabled_via_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """ANALYST_ENABLED=false in env must set ANALYST_ENABLED=False."""
    monkeypatch.setenv("ANALYST_ENABLED", "false")
    cfg = TriggerConfig.from_env()
    assert cfg.ANALYST_ENABLED is False


def test_from_env_high_divergence_only_via_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """ANALYST_HIGH_DIVERGENCE_ONLY=true in env must set HIGH_DIVERGENCE_ONLY=True."""
    monkeypatch.setenv("ANALYST_HIGH_DIVERGENCE_ONLY", "true")
    cfg = TriggerConfig.from_env()
    assert cfg.HIGH_DIVERGENCE_ONLY is True


def test_from_env_defaults_when_vars_absent(monkeypatch: pytest.MonkeyPatch) -> None:
    """Absent env vars must yield class defaults."""
    monkeypatch.delenv("ANALYST_ENABLED", raising=False)
    monkeypatch.delenv("ANALYST_HIGH_DIVERGENCE_ONLY", raising=False)
    cfg = TriggerConfig.from_env()
    assert cfg.ANALYST_ENABLED is True
    assert cfg.HIGH_DIVERGENCE_ONLY is False


def test_from_env_case_insensitive(monkeypatch: pytest.MonkeyPatch) -> None:
    """Env var parsing must be case-insensitive ('FALSE', 'True', etc.)."""
    monkeypatch.setenv("ANALYST_ENABLED", "FALSE")
    monkeypatch.setenv("ANALYST_HIGH_DIVERGENCE_ONLY", "TRUE")
    cfg = TriggerConfig.from_env()
    assert cfg.ANALYST_ENABLED is False
    assert cfg.HIGH_DIVERGENCE_ONLY is True


# ---------------------------------------------------------------------------
# 9. Missing keys raise KeyError
# ---------------------------------------------------------------------------


def test_missing_required_key_raises_key_error() -> None:
    """Passing a dict without required keys must raise KeyError."""
    with pytest.raises(KeyError):
        should_invoke_analyst({})


def test_partial_features_raises_key_error() -> None:
    """A dict missing 'triggered_signals' must raise KeyError."""
    partial = {
        "three_way_agreement_score": 0.5,
        "max_pairwise_kl": 0.04,
        # "max_pairwise_gap" and "triggered_signals" intentionally absent
    }
    with pytest.raises(KeyError):
        should_invoke_analyst(partial)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# 10. always_on_fallback fires when no specific reason applies
# ---------------------------------------------------------------------------


def test_always_on_fallback_when_no_signal_and_kl_below_threshold() -> None:
    """When neither KL nor signals trigger, 'always_on_fallback' must be included."""
    result = should_invoke_analyst(
        _features(
            three_way_agreement_score=0.50,
            max_pairwise_kl=0.03,  # below KL_HIGH_THRESHOLD (0.06)
            max_pairwise_gap=0.08,
            triggered_signals=[],
        )
    )

    assert result.invoke is True
    assert "always_on_fallback" in result.reasons


# ---------------------------------------------------------------------------
# 11. high_pairwise_kl reason
# ---------------------------------------------------------------------------


def test_kl_above_threshold_produces_high_pairwise_kl_reason() -> None:
    """max_pairwise_kl > KL_HIGH_THRESHOLD must add 'high_pairwise_kl' reason."""
    result = should_invoke_analyst(
        _features(
            three_way_agreement_score=0.50,
            max_pairwise_kl=0.07,  # above 0.06
            max_pairwise_gap=0.08,
            triggered_signals=[],
        )
    )

    assert result.invoke is True
    assert "high_pairwise_kl" in result.reasons


def test_kl_at_threshold_does_not_trigger_high_kl() -> None:
    """max_pairwise_kl exactly at KL_HIGH_THRESHOLD must NOT trigger high_pairwise_kl."""
    result = should_invoke_analyst(
        _features(
            three_way_agreement_score=0.50,
            max_pairwise_kl=0.06,  # == threshold, not strictly greater
            max_pairwise_gap=0.08,
            triggered_signals=[],
        )
    )

    # Should still invoke (via always_on_fallback if no other reason)
    assert result.invoke is True
    assert "high_pairwise_kl" not in result.reasons


# ---------------------------------------------------------------------------
# 12. default config (None) uses class defaults
# ---------------------------------------------------------------------------


def test_default_config_is_used_when_none_passed() -> None:
    """Passing config=None must behave identically to TriggerConfig()."""
    feat = _features(three_way_agreement_score=0.95)
    result_none = should_invoke_analyst(feat, config=None)
    result_default = should_invoke_analyst(feat, config=TriggerConfig())

    assert result_none.invoke == result_default.invoke
    assert result_none.reasons == result_default.reasons


# ---------------------------------------------------------------------------
# 13. TriggerDecision is immutable (frozen dataclass)
# ---------------------------------------------------------------------------


def test_trigger_decision_is_frozen() -> None:
    """TriggerDecision must be immutable; attribute assignment should raise."""
    result = should_invoke_analyst(_features())
    with pytest.raises((AttributeError, TypeError)):
        result.invoke = not result.invoke  # type: ignore[misc]


# ---------------------------------------------------------------------------
# 14. Parametrised — all branches produce valid TriggerDecision
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "overrides,cfg_kwargs,expect_invoke",
    [
        # Disabled flag
        (
            {},
            {"ANALYST_ENABLED": False},
            False,
        ),
        # Consensus skip
        (
            {"three_way_agreement_score": 0.95},
            {},
            False,
        ),
        # High divergence only, low priority
        (
            {"three_way_agreement_score": 0.50, "max_pairwise_kl": 0.02, "max_pairwise_gap": 0.05},
            {"HIGH_DIVERGENCE_ONLY": True},
            False,
        ),
        # High divergence only, high priority
        (
            {"three_way_agreement_score": 0.50, "max_pairwise_kl": 0.06},
            {"HIGH_DIVERGENCE_ONLY": True},
            True,
        ),
        # Normal invoke with no specific signals
        (
            {"three_way_agreement_score": 0.50},
            {},
            True,
        ),
        # Normal invoke with KL above threshold
        (
            {"three_way_agreement_score": 0.50, "max_pairwise_kl": 0.10},
            {},
            True,
        ),
    ],
)
def test_parametrised_branches(
    overrides: dict[str, object],
    cfg_kwargs: dict[str, object],
    expect_invoke: bool,
) -> None:
    """All major decision branches must produce a valid TriggerDecision."""
    feat = _features(**overrides)
    cfg = TriggerConfig(**cfg_kwargs)  # type: ignore[arg-type]
    result = should_invoke_analyst(feat, config=cfg)

    assert isinstance(result, TriggerDecision)
    assert result.invoke is expect_invoke
    assert isinstance(result.reasons, list)
    assert isinstance(result.triggered_signals, list)
    assert 0.0 <= result.estimated_priority <= 1.0
    assert len(result.reasons) >= 1
