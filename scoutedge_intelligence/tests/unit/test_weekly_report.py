"""Unit tests for scoutedge_intelligence.scripts.weekly_report.

Coverage targets (≥ 6 tests):
  1.  parse_args defaults
  2.  render_markdown produces non-empty string with the date window
  3.  write_report writes a file with the expected filename pattern
  4.  post_to_webhook with mocked httpx succeeds
  5.  post_to_webhook on HTTP error logs + does NOT raise
  6.  post_to_webhook on unexpected error logs + does NOT raise
  7.  run --dry-run skips both write_report and post_to_webhook
  8.  run happy path calls write_report and (optionally) post_to_webhook
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scoutedge_intelligence.audit.aggregate import AggregateReport
from scoutedge_intelligence.audit.attribution import AttributionReport
from scoutedge_intelligence.scripts.weekly_report import (
    DEFAULT_DAYS_BACK,
    DEFAULT_OUTPUT_DIR,
    _row_to_attribution_report,
    fetch_audits,
    parse_args,
    post_to_webhook,
    render_markdown,
    run,
    write_report,
)

# ---------------------------------------------------------------------------
# Shared factories
# ---------------------------------------------------------------------------

_NOW = datetime(2026, 6, 22, 23, 0, tzinfo=UTC)
_SINCE = _NOW - timedelta(days=7)


def _make_attribution_report(
    match_id: str = "m-001",
    final_correct: bool = True,
    final_brier: float = 0.25,
    with_risk: bool = True,
    with_diagnosis: bool = True,
) -> AttributionReport:
    """Build a minimal :class:`AttributionReport`."""
    return AttributionReport(
        match_id=match_id,
        actual_outcome="home_win",
        final_predicted_winner="home_win" if final_correct else "draw",
        final_brier=final_brier,
        layer_brier={"ml": 0.30, "sb": 0.28},
        layer_log_loss={"ml": 0.80, "sb": 0.75},
        final_correct=final_correct,
        risk_factor_text="Key player injured" if with_risk else None,
        risk_factor_hit=True if with_risk else None,
        diagnosis_directional_correct=True if with_diagnosis else None,
        diagnosis_edge_realized=True if with_diagnosis else None,
        diagnosis_quality_score=0.9 if with_diagnosis else None,
        audit_completed_at=_NOW,
    )


def _make_aggregate(n: int = 3) -> AggregateReport:
    """Build an :class:`AggregateReport` from *n* dummy attribution reports."""
    from scoutedge_intelligence.audit.aggregate import build_aggregate_report

    reports = [_make_attribution_report(match_id=f"m-{i:03d}") for i in range(n)]
    return build_aggregate_report(reports, period_start=_SINCE, period_end=_NOW)


# ---------------------------------------------------------------------------
# 1. parse_args defaults
# ---------------------------------------------------------------------------


class TestParseArgs:
    def test_defaults(self) -> None:
        """parse_args() with no argv returns the documented defaults."""
        args = parse_args([])
        assert args.days_back == DEFAULT_DAYS_BACK
        assert args.output_dir == DEFAULT_OUTPUT_DIR
        assert args.webhook_url is None
        assert args.dry_run is False

    def test_custom_values(self) -> None:
        """parse_args honours custom CLI flags."""
        args = parse_args(
            [
                "--days-back",
                "14",
                "--output-dir",
                "/tmp/reports",
                "--webhook-url",
                "https://hooks.example.com/abc",
                "--dry-run",
            ]
        )
        assert args.days_back == 14
        assert args.output_dir == Path("/tmp/reports")
        assert args.webhook_url == "https://hooks.example.com/abc"
        assert args.dry_run is True


# ---------------------------------------------------------------------------
# 2. render_markdown
# ---------------------------------------------------------------------------


class TestRenderMarkdown:
    def test_non_empty_with_date_window(self) -> None:
        """render_markdown returns a non-empty string containing the date window."""
        aggregate = _make_aggregate(3)
        md = render_markdown(aggregate, since=_SINCE, until=_NOW)

        assert isinstance(md, str)
        assert len(md) > 0
        # The date window must appear in the output
        assert _SINCE.strftime("%Y-%m-%d") in md
        assert _NOW.strftime("%Y-%m-%d") in md

    def test_contains_summary_metrics(self) -> None:
        """render_markdown includes match count and accuracy."""
        aggregate = _make_aggregate(5)
        md = render_markdown(aggregate, since=_SINCE, until=_NOW)
        assert "5" in md  # n_matches
        # accuracy should be formatted as a percentage
        assert "%" in md

    def test_layer_table_present(self) -> None:
        """Layer comparison table is rendered when layer data is available."""
        aggregate = _make_aggregate(2)
        md = render_markdown(aggregate, since=_SINCE, until=_NOW)
        assert "ML" in md
        assert "SB" in md

    def test_empty_report(self) -> None:
        """render_markdown handles an empty (zero-match) report gracefully."""
        from scoutedge_intelligence.audit.aggregate import build_aggregate_report

        empty = build_aggregate_report([], period_start=_SINCE, period_end=_NOW)
        md = render_markdown(empty, since=_SINCE, until=_NOW)
        assert len(md) > 0
        assert "0" in md


# ---------------------------------------------------------------------------
# 3. write_report
# ---------------------------------------------------------------------------


class TestWriteReport:
    def test_file_created_with_expected_name(self, tmp_path: Path) -> None:
        """write_report creates wYYYYMMDD.md in the output directory."""
        week_start = datetime(2026, 6, 15, tzinfo=UTC)
        path = write_report("# Hello", tmp_path, week_start)

        assert path.exists()
        assert path.name == "w20260615.md"
        assert path.read_text(encoding="utf-8") == "# Hello"

    def test_creates_parent_dirs(self, tmp_path: Path) -> None:
        """write_report creates nested directories if they do not exist."""
        nested = tmp_path / "a" / "b" / "c"
        week_start = datetime(2026, 6, 15, tzinfo=UTC)
        path = write_report("text", nested, week_start)
        assert path.exists()

    def test_returns_path(self, tmp_path: Path) -> None:
        """write_report returns the Path of the written file."""
        week_start = datetime(2026, 7, 6, tzinfo=UTC)
        path = write_report("data", tmp_path, week_start)
        assert isinstance(path, Path)
        assert path.name == "w20260706.md"


# ---------------------------------------------------------------------------
# 4-6. post_to_webhook
# ---------------------------------------------------------------------------


class TestPostToWebhook:
    def test_success(self) -> None:
        """post_to_webhook POSTs JSON and does not raise on 200."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.raise_for_status = MagicMock()

        with patch("httpx.post", return_value=mock_response) as mock_post:
            post_to_webhook("report text", "https://hooks.example.com/x")

        mock_post.assert_called_once_with(
            "https://hooks.example.com/x",
            json={"text": "report text"},
            timeout=15.0,
        )
        mock_response.raise_for_status.assert_called_once()

    def test_http_error_does_not_raise(self) -> None:
        """post_to_webhook logs HTTP errors and does NOT raise."""
        import httpx as _httpx

        error_response = MagicMock()
        error_response.status_code = 500

        http_err = _httpx.HTTPStatusError(
            "Server error", request=MagicMock(), response=error_response
        )

        with patch("httpx.post") as mock_post:
            mock_post.return_value.raise_for_status.side_effect = http_err
            # Must not raise
            post_to_webhook("report", "https://hooks.example.com/fail")

    def test_unexpected_error_does_not_raise(self) -> None:
        """post_to_webhook logs unexpected errors and does NOT raise."""
        with patch("httpx.post", side_effect=ConnectionError("refused")):
            # Must not raise
            post_to_webhook("report", "https://hooks.example.com/broken")


# ---------------------------------------------------------------------------
# 7. run --dry-run
# ---------------------------------------------------------------------------


class TestRunDryRun:
    @pytest.mark.asyncio
    async def test_dry_run_skips_write_and_webhook(self, tmp_path: Path) -> None:
        """--dry-run must not call write_report or post_to_webhook."""
        args = parse_args(
            [
                "--dry-run",
                "--output-dir",
                str(tmp_path),
                "--webhook-url",
                "https://hooks.example.com/w",
            ]
        )

        mock_reports: list[AttributionReport] = [_make_attribution_report()]

        with (
            patch.dict("os.environ", {"DATABASE_URL": "postgresql+asyncpg://fake/db"}),
            patch("scoutedge_intelligence.scripts.weekly_report.create_async_engine"),
            patch("scoutedge_intelligence.scripts.weekly_report.async_sessionmaker") as mock_sm_cls,
            patch(
                "scoutedge_intelligence.scripts.weekly_report.fetch_audits",
                new=AsyncMock(return_value=mock_reports),
            ),
            patch("scoutedge_intelligence.scripts.weekly_report.write_report") as mock_write,
            patch("scoutedge_intelligence.scripts.weekly_report.post_to_webhook") as mock_post,
        ):
            # Provide a minimal async context manager for the session factory
            mock_session = AsyncMock()
            mock_sm_cls.return_value.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_sm_cls.return_value.return_value.__aexit__ = AsyncMock(return_value=False)

            exit_code = await run(args)

        assert exit_code == 0
        mock_write.assert_not_called()
        mock_post.assert_not_called()


# ---------------------------------------------------------------------------
# 8. run happy path
# ---------------------------------------------------------------------------


class TestRunHappyPath:
    @pytest.mark.asyncio
    async def test_happy_path_writes_file(self, tmp_path: Path) -> None:
        """run() with valid DB returns 0 and calls write_report."""
        args = parse_args(["--output-dir", str(tmp_path)])

        mock_reports: list[AttributionReport] = [_make_attribution_report()]

        captured_path: list[Path] = []

        def _fake_write(text: str, output_dir: Path, week_start: datetime) -> Path:
            p = output_dir / f"w{week_start.strftime('%Y%m%d')}.md"
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(text, encoding="utf-8")
            captured_path.append(p)
            return p

        with (
            patch.dict("os.environ", {"DATABASE_URL": "postgresql+asyncpg://fake/db"}),
            patch("scoutedge_intelligence.scripts.weekly_report.create_async_engine"),
            patch("scoutedge_intelligence.scripts.weekly_report.async_sessionmaker") as mock_sm_cls,
            patch(
                "scoutedge_intelligence.scripts.weekly_report.fetch_audits",
                new=AsyncMock(return_value=mock_reports),
            ),
            patch(
                "scoutedge_intelligence.scripts.weekly_report.write_report",
                side_effect=_fake_write,
            ),
        ):
            mock_session = AsyncMock()
            mock_sm_cls.return_value.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_sm_cls.return_value.return_value.__aexit__ = AsyncMock(return_value=False)

            exit_code = await run(args)

        assert exit_code == 0
        assert len(captured_path) == 1

    @pytest.mark.asyncio
    async def test_missing_database_url_returns_1(self) -> None:
        """run() returns 1 when DATABASE_URL is not set."""
        args = parse_args([])

        with patch.dict("os.environ", {}, clear=True):
            # Remove DATABASE_URL if present
            import os

            os.environ.pop("DATABASE_URL", None)
            exit_code = await run(args)

        assert exit_code == 1

    @pytest.mark.asyncio
    async def test_exception_during_fetch_returns_1(self) -> None:
        """run() returns 1 when fetch_audits raises an unexpected exception."""
        args = parse_args([])

        with (
            patch.dict("os.environ", {"DATABASE_URL": "postgresql+asyncpg://fake/db"}),
            patch("scoutedge_intelligence.scripts.weekly_report.create_async_engine"),
            patch("scoutedge_intelligence.scripts.weekly_report.async_sessionmaker") as mock_sm_cls,
            patch(
                "scoutedge_intelligence.scripts.weekly_report.fetch_audits",
                new=AsyncMock(side_effect=RuntimeError("DB gone")),
            ),
        ):
            mock_session = AsyncMock()
            mock_sm_cls.return_value.return_value.__aenter__ = AsyncMock(return_value=mock_session)
            mock_sm_cls.return_value.return_value.__aexit__ = AsyncMock(return_value=False)

            exit_code = await run(args)

        assert exit_code == 1


# ---------------------------------------------------------------------------
# 9. _row_to_attribution_report (unit-level coverage of the DB helper)
# ---------------------------------------------------------------------------


class TestRowToAttributionReport:
    """Unit tests for the internal _row_to_attribution_report function."""

    def _base_row(self) -> dict:  # type: ignore[type-arg]
        return {
            "match_id": "m-001",
            "actual_outcome": "home_win",
            "audited_at": _NOW,
            "blended_snapshot": {
                "brier": 0.25,
                "final_correct": True,
                "final_predicted_winner": "home_win",
            },
            "ml_snapshot": {"brier": 0.30, "log_loss": 0.80},
            "sb_snapshot": {"brier": 0.28, "log_loss": 0.75},
            "poly_snapshot": None,
            "claude_snapshot": {
                "risk_factor_text": "Injury concern",
                "risk_factor_hit": True,
                "diagnosis_directional_correct": True,
                "diagnosis_edge_realized": True,
                "diagnosis_quality_score": 0.9,
            },
        }

    def test_happy_path_no_poly(self) -> None:
        """_row_to_attribution_report succeeds when poly_snapshot is None."""
        report = _row_to_attribution_report(self._base_row())
        assert report.match_id == "m-001"
        assert report.final_correct is True
        assert "ml" in report.layer_brier
        assert "sb" in report.layer_brier
        assert "poly" not in report.layer_brier

    def test_happy_path_with_poly(self) -> None:
        """_row_to_attribution_report includes poly layer when poly_snapshot present."""
        row = self._base_row()
        row["poly_snapshot"] = {"brier": 0.22, "log_loss": 0.60}
        report = _row_to_attribution_report(row)
        assert "poly" in report.layer_brier
        assert report.layer_brier["poly"] == pytest.approx(0.22)

    def test_missing_blended_raises(self) -> None:
        """_row_to_attribution_report raises ValueError when blended_snapshot is empty."""
        row = self._base_row()
        row["blended_snapshot"] = {}
        with pytest.raises(ValueError, match="blended_snapshot"):
            _row_to_attribution_report(row)

    def test_none_blended_raises(self) -> None:
        """_row_to_attribution_report raises ValueError when blended_snapshot is None."""
        row = self._base_row()
        row["blended_snapshot"] = None
        with pytest.raises(ValueError, match="blended_snapshot"):
            _row_to_attribution_report(row)

    def test_audited_at_as_string(self) -> None:
        """_row_to_attribution_report handles audited_at as an ISO string."""
        row = self._base_row()
        row["audited_at"] = "2026-06-22T23:00:00+00:00"
        report = _row_to_attribution_report(row)
        assert isinstance(report.audit_completed_at, datetime)


# ---------------------------------------------------------------------------
# 10. fetch_audits (async, mocked session)
# ---------------------------------------------------------------------------


class TestFetchAudits:
    """Tests for the async fetch_audits function with a mocked AsyncSession."""

    def _make_row(self) -> dict:  # type: ignore[type-arg]
        return {
            "audit_id": "a-001",
            "match_id": "m-001",
            "actual_outcome": "home_win",
            "audited_at": _NOW,
            "blended_snapshot": {
                "brier": 0.25,
                "final_correct": True,
                "final_predicted_winner": "home_win",
            },
            "ml_snapshot": {"brier": 0.30, "log_loss": 0.80},
            "sb_snapshot": {"brier": 0.28, "log_loss": 0.75},
            "poly_snapshot": None,
            "claude_snapshot": {},
        }

    @pytest.mark.asyncio
    async def test_returns_reports_for_valid_rows(self) -> None:
        """fetch_audits converts DB rows into AttributionReport objects."""
        session = AsyncMock()
        row = self._make_row()
        mock_result = MagicMock()
        mock_result.mappings.return_value.all.return_value = [row]
        session.execute = AsyncMock(return_value=mock_result)

        reports = await fetch_audits(session, since=_SINCE, until=_NOW)
        assert len(reports) == 1
        assert reports[0].match_id == "m-001"

    @pytest.mark.asyncio
    async def test_skips_malformed_rows(self) -> None:
        """fetch_audits silently skips rows that fail reconstruction."""
        session = AsyncMock()
        bad_row = {"match_id": "bad", "audited_at": _NOW, "blended_snapshot": None}
        mock_result = MagicMock()
        mock_result.mappings.return_value.all.return_value = [bad_row]
        session.execute = AsyncMock(return_value=mock_result)

        reports = await fetch_audits(session, since=_SINCE, until=_NOW)
        assert reports == []

    @pytest.mark.asyncio
    async def test_returns_empty_for_no_rows(self) -> None:
        """fetch_audits returns an empty list when the query returns no rows."""
        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value.all.return_value = []
        session.execute = AsyncMock(return_value=mock_result)

        reports = await fetch_audits(session, since=_SINCE, until=_NOW)
        assert reports == []
