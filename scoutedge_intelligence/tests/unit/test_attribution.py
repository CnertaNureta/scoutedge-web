"""Unit tests for scoutedge_intelligence.audit.attribution and .aggregate.

Coverage targets (≥ 9 tests):
  1.  generate_attribution happy path — perfect final probs → Brier ≈ 0
  2.  poly_probs=None → "poly" absent from layer_brier dict
  3.  risk_factor_hit True when actual is the ML underdog
  4.  risk_factor_hit None when risk_factor_text is None
  5.  diagnosis=None → all three diagnosis_* fields are None
  6.  diagnosis present, directional correct + edge realised → quality_score = 1.0
  7.  diagnosis present, directional wrong + no edge → quality_score = 0.0
  8.  build_aggregate_report on 3 reports computes layer mean correctly
  9.  build_aggregate_report on empty list → n_matches=0, n_finished=0, safe defaults
  10. final_correct reflects whether final_predicted_winner == actual_outcome
  11. risk_factor_hit False when risk factor present but ML favourite wins
  12. partial quality score (directional None branch) stays in [0, 1]
"""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from scoutedge_intelligence.audit.aggregate import (
    AggregateReport,
    build_aggregate_report,
)
from scoutedge_intelligence.audit.attribution import (
    AttributionInput,
    AttributionReport,
    generate_attribution,
)
from scoutedge_intelligence.audit.metrics import OUTCOMES, ProbDict

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _perfect(outcome: str) -> ProbDict:
    """Return a 1X2 prob dict with all mass on *outcome*."""
    return {o: 1.0 if o == outcome else 0.0 for o in OUTCOMES}


def _uniform() -> ProbDict:
    return dict.fromkeys(OUTCOMES, 1 / 3)


def _home_heavy() -> ProbDict:
    """Home win favourite: p(home)=0.60, p(draw)=0.25, p(away)=0.15."""
    return {"home_win": 0.60, "draw": 0.25, "away_win": 0.15}


def _period() -> tuple[datetime, datetime]:
    start = datetime(2026, 6, 11, tzinfo=UTC)
    end = datetime(2026, 6, 17, tzinfo=UTC)
    return start, end


def _make_input(**overrides) -> AttributionInput:
    """Construct a minimal valid AttributionInput.

    Defaults: home_win match, all layers agree, no poly, no risk factor, no
    diagnosis.  Pass keyword overrides for targeted tests.
    """
    base: dict = {
        "match_id": "match-001",
        "actual_outcome": "home_win",
        "actual_home_score": 2,
        "actual_away_score": 0,
        "final_probs": _home_heavy(),
        "ml_probs": _home_heavy(),
        "sb_probs": _home_heavy(),
        "poly_probs": None,
        "risk_factor_text": None,
        "diagnosis": None,
    }
    base.update(overrides)
    return AttributionInput(**base)


# ---------------------------------------------------------------------------
# 1. Happy path — perfect final probs → final_brier ≈ 0
# ---------------------------------------------------------------------------


class TestHappyPath:
    def test_perfect_final_probs_gives_zero_final_brier(self) -> None:
        payload = _make_input(
            final_probs=_perfect("home_win"),
            actual_outcome="home_win",
        )
        report = generate_attribution(payload)
        assert report.final_brier == pytest.approx(0.0)

    def test_report_is_attribution_report_instance(self) -> None:
        report = generate_attribution(_make_input())
        assert isinstance(report, AttributionReport)

    def test_audit_completed_at_is_utc(self) -> None:
        report = generate_attribution(_make_input())
        assert report.audit_completed_at.tzinfo is not None

    def test_match_id_preserved(self) -> None:
        report = generate_attribution(_make_input(match_id="wc2026-gf"))
        assert report.match_id == "wc2026-gf"

    def test_final_predicted_winner_is_argmax_of_final_probs(self) -> None:
        # final_probs has away_win as favourite
        final: ProbDict = {"home_win": 0.20, "draw": 0.25, "away_win": 0.55}
        report = generate_attribution(_make_input(final_probs=final))
        assert report.final_predicted_winner == "away_win"

    def test_layer_brier_contains_ml_and_sb_without_poly(self) -> None:
        report = generate_attribution(_make_input())
        assert set(report.layer_brier.keys()) == {"ml", "sb"}

    def test_layer_log_loss_contains_ml_and_sb(self) -> None:
        report = generate_attribution(_make_input())
        assert "ml" in report.layer_log_loss
        assert "sb" in report.layer_log_loss

    def test_brier_values_are_non_negative(self) -> None:
        report = generate_attribution(_make_input())
        assert report.final_brier >= 0.0
        for v in report.layer_brier.values():
            assert v >= 0.0


# ---------------------------------------------------------------------------
# 2. poly_probs=None → "poly" absent from layer_brier / layer_log_loss
# ---------------------------------------------------------------------------


class TestNoPolyLayer:
    def test_poly_key_absent_from_layer_brier(self) -> None:
        report = generate_attribution(_make_input(poly_probs=None))
        assert "poly" not in report.layer_brier

    def test_poly_key_absent_from_layer_log_loss(self) -> None:
        report = generate_attribution(_make_input(poly_probs=None))
        assert "poly" not in report.layer_log_loss

    def test_poly_probs_present_adds_poly_key(self) -> None:
        poly: ProbDict = {"home_win": 0.40, "draw": 0.35, "away_win": 0.25}
        report = generate_attribution(_make_input(poly_probs=poly))
        assert "poly" in report.layer_brier
        assert "poly" in report.layer_log_loss


# ---------------------------------------------------------------------------
# 3. risk_factor_hit True when actual is the ML underdog
# ---------------------------------------------------------------------------


class TestRiskFactorHitTrue:
    def test_hit_true_when_actual_is_ml_underdog(self) -> None:
        # ML strongly favours home_win; actual is away_win (underdog)
        ml: ProbDict = {"home_win": 0.70, "draw": 0.20, "away_win": 0.10}
        payload = _make_input(
            ml_probs=ml,
            actual_outcome="away_win",
            actual_home_score=0,
            actual_away_score=1,
            risk_factor_text="Injury to key striker affects home attack",
        )
        report = generate_attribution(payload)
        assert report.risk_factor_hit is True

    def test_hit_true_persists_risk_factor_text(self) -> None:
        ml: ProbDict = {"home_win": 0.65, "draw": 0.25, "away_win": 0.10}
        text = "High-altitude venue disadvantages the home side"
        payload = _make_input(
            ml_probs=ml,
            actual_outcome="draw",
            actual_home_score=1,
            actual_away_score=1,
            risk_factor_text=text,
        )
        report = generate_attribution(payload)
        assert report.risk_factor_text == text
        assert report.risk_factor_hit is True


# ---------------------------------------------------------------------------
# 4. risk_factor_hit None when risk_factor_text is None
# ---------------------------------------------------------------------------


class TestRiskFactorHitNone:
    def test_hit_is_none_when_no_risk_factor(self) -> None:
        report = generate_attribution(_make_input(risk_factor_text=None))
        assert report.risk_factor_hit is None

    def test_risk_factor_text_is_none_on_report(self) -> None:
        report = generate_attribution(_make_input(risk_factor_text=None))
        assert report.risk_factor_text is None


# ---------------------------------------------------------------------------
# 5. diagnosis=None → all three diagnosis_* fields are None
# ---------------------------------------------------------------------------


class TestDiagnosisNone:
    def test_all_diagnosis_fields_none_when_diagnosis_absent(self) -> None:
        report = generate_attribution(_make_input(diagnosis=None))
        assert report.diagnosis_directional_correct is None
        assert report.diagnosis_edge_realized is None
        assert report.diagnosis_quality_score is None


# ---------------------------------------------------------------------------
# 6. Diagnosis present, directional correct + edge realised → quality_score=1.0
# ---------------------------------------------------------------------------


class TestDiagnosisQualityPerfect:
    def test_quality_score_one_when_both_flags_true(self) -> None:
        # Setup: ml performs worst, sb performs best → most_trustworthy=sb is
        # directionally correct.  final_brier < ml_brier → edge realised.
        actual = "away_win"
        ml: ProbDict = {"home_win": 0.70, "draw": 0.20, "away_win": 0.10}  # bad
        sb: ProbDict = {"home_win": 0.20, "draw": 0.25, "away_win": 0.55}  # good
        final: ProbDict = {"home_win": 0.25, "draw": 0.25, "away_win": 0.50}
        diag = {"most_trustworthy_source": "sb"}

        payload = _make_input(
            actual_outcome=actual,
            actual_home_score=0,
            actual_away_score=2,
            ml_probs=ml,
            sb_probs=sb,
            final_probs=final,
            diagnosis=diag,
        )
        report = generate_attribution(payload)

        assert report.diagnosis_directional_correct is True
        assert report.diagnosis_edge_realized is True
        assert report.diagnosis_quality_score == pytest.approx(1.0)

    def test_quality_score_in_unit_interval(self) -> None:
        actual = "draw"
        ml: ProbDict = {"home_win": 0.50, "draw": 0.30, "away_win": 0.20}
        sb: ProbDict = {"home_win": 0.30, "draw": 0.45, "away_win": 0.25}
        final: ProbDict = {"home_win": 0.30, "draw": 0.50, "away_win": 0.20}
        diag = {"most_trustworthy_source": "sb"}

        report = generate_attribution(
            _make_input(
                actual_outcome=actual,
                actual_home_score=1,
                actual_away_score=1,
                ml_probs=ml,
                sb_probs=sb,
                final_probs=final,
                diagnosis=diag,
            )
        )
        assert report.diagnosis_quality_score is not None
        assert 0.0 <= report.diagnosis_quality_score <= 1.0


# ---------------------------------------------------------------------------
# 7. Diagnosis present but directional wrong + no edge → quality_score=0.0
# ---------------------------------------------------------------------------


class TestDiagnosisQualityZero:
    def test_quality_score_zero_when_both_flags_false(self) -> None:
        # ML is the best layer; diagnosis claims sb is most trustworthy (wrong).
        # final_brier >= ml_brier → no edge.
        actual = "home_win"
        ml: ProbDict = {"home_win": 0.80, "draw": 0.15, "away_win": 0.05}  # best
        sb: ProbDict = {"home_win": 0.40, "draw": 0.35, "away_win": 0.25}  # worse
        # Final is just ML → final_brier == ml_brier → not strictly better
        final = dict(ml)
        diag = {"most_trustworthy_source": "sb"}

        report = generate_attribution(
            _make_input(
                actual_outcome=actual,
                ml_probs=ml,
                sb_probs=sb,
                final_probs=final,
                diagnosis=diag,
            )
        )
        assert report.diagnosis_directional_correct is False
        assert report.diagnosis_edge_realized is False
        assert report.diagnosis_quality_score == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# 8. build_aggregate_report on 3 reports computes layer mean correctly
# ---------------------------------------------------------------------------


class TestBuildAggregateReport:
    @staticmethod
    def _three_reports() -> list[AttributionReport]:
        """Produce three deterministic attribution reports."""
        payloads = [
            _make_input(
                match_id="m1",
                actual_outcome="home_win",
                actual_home_score=2,
                actual_away_score=0,
                final_probs=_perfect("home_win"),
                ml_probs=_home_heavy(),
                sb_probs=_home_heavy(),
            ),
            _make_input(
                match_id="m2",
                actual_outcome="draw",
                actual_home_score=1,
                actual_away_score=1,
                final_probs=_uniform(),
                ml_probs=_uniform(),
                sb_probs=_uniform(),
            ),
            _make_input(
                match_id="m3",
                actual_outcome="away_win",
                actual_home_score=0,
                actual_away_score=3,
                final_probs={"home_win": 0.20, "draw": 0.25, "away_win": 0.55},
                ml_probs={"home_win": 0.20, "draw": 0.25, "away_win": 0.55},
                sb_probs={"home_win": 0.20, "draw": 0.25, "away_win": 0.55},
            ),
        ]
        return [generate_attribution(p) for p in payloads]

    def test_n_matches_equals_input_length(self) -> None:
        reports = self._three_reports()
        start, end = _period()
        agg = build_aggregate_report(reports, start, end)
        assert agg.n_matches == 3

    def test_n_finished_equals_n_matches(self) -> None:
        reports = self._three_reports()
        start, end = _period()
        agg = build_aggregate_report(reports, start, end)
        assert agg.n_finished == 3

    def test_layer_mean_brier_ml_computed_correctly(self) -> None:
        reports = self._three_reports()
        start, end = _period()
        agg = build_aggregate_report(reports, start, end)

        expected_ml_mean = sum(r.layer_brier["ml"] for r in reports) / 3
        assert agg.layer_mean_brier["ml"] == pytest.approx(expected_ml_mean, rel=1e-9)

    def test_layer_mean_brier_sb_computed_correctly(self) -> None:
        reports = self._three_reports()
        start, end = _period()
        agg = build_aggregate_report(reports, start, end)

        expected_sb_mean = sum(r.layer_brier["sb"] for r in reports) / 3
        assert agg.layer_mean_brier["sb"] == pytest.approx(expected_sb_mean, rel=1e-9)

    def test_final_accuracy_is_fraction_correct(self) -> None:
        reports = self._three_reports()
        start, end = _period()
        agg = build_aggregate_report(reports, start, end)

        expected_acc = sum(1 for r in reports if r.final_correct) / 3
        assert agg.final_accuracy == pytest.approx(expected_acc, rel=1e-9)

    def test_final_top1_count_is_int(self) -> None:
        reports = self._three_reports()
        start, end = _period()
        agg = build_aggregate_report(reports, start, end)
        assert isinstance(agg.final_top1_count, int)

    def test_period_stamps_preserved(self) -> None:
        reports = self._three_reports()
        start, end = _period()
        agg = build_aggregate_report(reports, start, end)
        assert agg.period_start == start
        assert agg.period_end == end

    def test_no_risk_factors_yields_none_hit_rate(self) -> None:
        reports = self._three_reports()  # all have risk_factor_text=None
        start, end = _period()
        agg = build_aggregate_report(reports, start, end)
        assert agg.risk_factor_hit_rate is None

    def test_no_diagnosis_yields_none_quality_avg(self) -> None:
        reports = self._three_reports()  # all have diagnosis=None
        start, end = _period()
        agg = build_aggregate_report(reports, start, end)
        assert agg.diagnosis_quality_avg is None
        assert agg.diagnosis_invocation_rate is None


# ---------------------------------------------------------------------------
# 9. Empty report list → safe defaults
# ---------------------------------------------------------------------------


class TestEmptyReports:
    def test_n_matches_zero(self) -> None:
        start, end = _period()
        agg = build_aggregate_report([], start, end)
        assert agg.n_matches == 0

    def test_n_finished_zero(self) -> None:
        start, end = _period()
        agg = build_aggregate_report([], start, end)
        assert agg.n_finished == 0

    def test_layer_mean_brier_empty(self) -> None:
        start, end = _period()
        agg = build_aggregate_report([], start, end)
        assert agg.layer_mean_brier == {}

    def test_final_accuracy_is_zero(self) -> None:
        start, end = _period()
        agg = build_aggregate_report([], start, end)
        assert agg.final_accuracy == 0.0

    def test_risk_factor_hit_rate_is_none(self) -> None:
        start, end = _period()
        agg = build_aggregate_report([], start, end)
        assert agg.risk_factor_hit_rate is None

    def test_diagnosis_fields_are_none(self) -> None:
        start, end = _period()
        agg = build_aggregate_report([], start, end)
        assert agg.diagnosis_invocation_rate is None
        assert agg.diagnosis_quality_avg is None

    def test_returns_aggregate_report_instance(self) -> None:
        start, end = _period()
        agg = build_aggregate_report([], start, end)
        assert isinstance(agg, AggregateReport)


# ---------------------------------------------------------------------------
# 10. final_correct reflects whether final_predicted_winner == actual_outcome
# ---------------------------------------------------------------------------


class TestFinalCorrect:
    def test_correct_when_winner_matches_actual(self) -> None:
        report = generate_attribution(
            _make_input(
                final_probs=_perfect("home_win"),
                actual_outcome="home_win",
            )
        )
        assert report.final_correct is True

    def test_incorrect_when_winner_differs_from_actual(self) -> None:
        report = generate_attribution(
            _make_input(
                final_probs=_perfect("home_win"),
                actual_outcome="away_win",
                actual_home_score=0,
                actual_away_score=1,
            )
        )
        assert report.final_correct is False


# ---------------------------------------------------------------------------
# 11. risk_factor_hit False when risk factor present but ML favourite wins
# ---------------------------------------------------------------------------


class TestRiskFactorHitFalse:
    def test_hit_false_when_ml_favourite_wins(self) -> None:
        ml: ProbDict = {"home_win": 0.70, "draw": 0.20, "away_win": 0.10}
        payload = _make_input(
            ml_probs=ml,
            actual_outcome="home_win",  # ML favourite wins
            actual_home_score=2,
            actual_away_score=0,
            risk_factor_text="Home fans expected to produce hostile atmosphere",
        )
        report = generate_attribution(payload)
        assert report.risk_factor_hit is False


# ---------------------------------------------------------------------------
# 12. Partial quality score (most_trustworthy_source not in layer_brier)
# ---------------------------------------------------------------------------


class TestPartialDiagnosisQuality:
    def test_quality_score_in_unit_interval_when_source_unknown(self) -> None:
        # Diagnosis names "claude" which is not a tracked layer key → directional
        # correctness cannot be evaluated, partial formula used.
        actual = "draw"
        ml: ProbDict = {"home_win": 0.35, "draw": 0.40, "away_win": 0.25}
        sb: ProbDict = {"home_win": 0.40, "draw": 0.35, "away_win": 0.25}
        final: ProbDict = {"home_win": 0.30, "draw": 0.50, "away_win": 0.20}
        diag = {"most_trustworthy_source": "claude"}

        report = generate_attribution(
            _make_input(
                actual_outcome=actual,
                actual_home_score=1,
                actual_away_score=1,
                ml_probs=ml,
                sb_probs=sb,
                final_probs=final,
                diagnosis=diag,
            )
        )
        # directional_correct is None (unknown source), quality_score still computed
        assert report.diagnosis_directional_correct is None
        assert report.diagnosis_quality_score is not None
        assert 0.0 <= report.diagnosis_quality_score <= 1.0
