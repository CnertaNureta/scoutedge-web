"""Weekly prediction-quality report for ScoutEdge WC2026.

Designed to be run every Sunday at 23:00 UTC by GitHub Actions.  The script:

1. Accepts a configurable lookback window (default 7 days).
2. Fetches :class:`~scoutedge_intelligence.audit.attribution.AttributionReport`-
   equivalent data from the ``prediction_audits`` table via a raw async query.
3. Builds an :class:`~scoutedge_intelligence.audit.aggregate.AggregateReport`
   using :func:`~scoutedge_intelligence.audit.aggregate.build_aggregate_report`.
4. Renders the report as Markdown and writes it to
   ``artifacts/weekly/wYYYYMMDD.md``.
5. Optionally POSTs the Markdown text to a webhook URL.

Usage
-----
    python -m scoutedge_intelligence.scripts.weekly_report
    python -m scoutedge_intelligence.scripts.weekly_report --days-back 14
    python -m scoutedge_intelligence.scripts.weekly_report --dry-run
    python -m scoutedge_intelligence.scripts.weekly_report --webhook-url https://hooks.example.com/...
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from scoutedge_intelligence.audit.aggregate import AggregateReport, build_aggregate_report
from scoutedge_intelligence.audit.attribution import AttributionReport
from scoutedge_intelligence.utils.db_urls import coerce_async_database_url

logger = structlog.get_logger(__name__)

DEFAULT_OUTPUT_DIR: Path = Path("artifacts/weekly")
DEFAULT_DAYS_BACK: int = 7
_TOP_N: int = 5  # matches shown in best/worst tables


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse command-line arguments.

    Parameters
    ----------
    argv:
        Explicit argument list for testing; uses ``sys.argv`` when ``None``.

    Returns
    -------
    argparse.Namespace
        Parsed arguments with fields:
        - ``days_back`` (int)
        - ``output_dir`` (Path)
        - ``webhook_url`` (str | None)
        - ``dry_run`` (bool)
    """
    parser = argparse.ArgumentParser(
        prog="weekly_report",
        description="Generate a weekly prediction-quality Markdown report.",
    )
    parser.add_argument(
        "--days-back",
        type=int,
        default=DEFAULT_DAYS_BACK,
        dest="days_back",
        help=f"Number of days to look back (default: {DEFAULT_DAYS_BACK}).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        dest="output_dir",
        help=f"Directory for output Markdown files (default: {DEFAULT_OUTPUT_DIR}).",
    )
    parser.add_argument(
        "--webhook-url",
        type=str,
        default=None,
        dest="webhook_url",
        help="Optional webhook URL to POST the report to.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        dest="dry_run",
        help="Render the report but skip file write and webhook post.",
    )
    return parser.parse_args(argv)


# ---------------------------------------------------------------------------
# DB fetch
# ---------------------------------------------------------------------------


async def fetch_audits(
    session: AsyncSession,
    *,
    since: datetime,
    until: datetime,
) -> list[AttributionReport]:
    """Fetch attribution-equivalent rows from ``prediction_audits`` for [since, until).

    Joins ``prediction_audits`` with ``matches`` to recover the per-layer
    Brier scores stored in the JSONB snapshot columns.  Rows without a
    ``blended_snapshot`` (i.e. incomplete audits) are silently skipped.

    Parameters
    ----------
    session:
        Active async SQLAlchemy session.
    since:
        Inclusive window start (UTC).
    until:
        Exclusive window end (UTC).

    Returns
    -------
    list[AttributionReport]
        One report per audit row that could be fully reconstructed.
    """
    log = logger.bind(since=since.isoformat(), until=until.isoformat())

    stmt = text(
        """
        SELECT
            pa.id            AS audit_id,
            pa.match_id,
            pa.ml_snapshot,
            pa.sb_snapshot,
            pa.poly_snapshot,
            pa.blended_snapshot,
            pa.claude_snapshot,
            pa.audited_at,
            m.actual_outcome
        FROM prediction_audits pa
        JOIN matches m ON m.id = pa.match_id
        WHERE pa.audited_at >= :since
          AND pa.audited_at <  :until
        ORDER BY pa.audited_at
        """
    )

    result = await session.execute(stmt, {"since": since, "until": until})
    rows = result.mappings().all()
    log.info("fetch_audits: rows fetched", count=len(rows))

    reports: list[AttributionReport] = []
    for row in rows:
        try:
            report = _row_to_attribution_report(dict(row))
            reports.append(report)
        except Exception as exc:
            log.warning(
                "fetch_audits: skipping malformed row",
                match_id=row.get("match_id"),
                error=str(exc),
            )

    log.info("fetch_audits: reports reconstructed", count=len(reports))
    return reports


def _row_to_attribution_report(row: dict[str, Any]) -> AttributionReport:
    """Reconstruct an :class:`AttributionReport` from a flat audit DB row.

    Parameters
    ----------
    row:
        Dict of column values from the ``prediction_audits`` JOIN query.

    Returns
    -------
    AttributionReport

    Raises
    ------
    ValueError
        If required snapshot fields are absent or malformed.
    """
    blended: dict[str, Any] = row.get("blended_snapshot") or {}
    ml: dict[str, Any] = row.get("ml_snapshot") or {}
    sb: dict[str, Any] = row.get("sb_snapshot") or {}
    poly: dict[str, Any] | None = row.get("poly_snapshot") or None
    claude: dict[str, Any] = row.get("claude_snapshot") or {}

    if not blended:
        raise ValueError("blended_snapshot is empty or missing")

    final_brier: float = float(blended["brier"])
    final_correct: bool = bool(blended.get("final_correct", False))
    final_predicted_winner: str = str(blended.get("final_predicted_winner", ""))

    layer_brier: dict[str, float] = {}
    layer_log_loss: dict[str, float] = {}

    if ml.get("brier") is not None:
        layer_brier["ml"] = float(ml["brier"])
        layer_log_loss["ml"] = float(ml.get("log_loss") or 0.0)
    if sb.get("brier") is not None:
        layer_brier["sb"] = float(sb["brier"])
        layer_log_loss["sb"] = float(sb.get("log_loss") or 0.0)
    if poly and poly.get("brier") is not None:
        layer_brier["poly"] = float(poly["brier"])
        layer_log_loss["poly"] = float(poly.get("log_loss") or 0.0)

    actual_outcome: str = str(row.get("actual_outcome") or "")
    raw_audited_at = row["audited_at"]
    audited_at: datetime = (
        raw_audited_at
        if isinstance(raw_audited_at, datetime)
        else datetime.fromisoformat(str(raw_audited_at))
    )

    return AttributionReport(
        match_id=str(row["match_id"]),
        actual_outcome=actual_outcome,
        final_predicted_winner=final_predicted_winner,
        final_brier=final_brier,
        layer_brier=layer_brier,
        layer_log_loss=layer_log_loss,
        final_correct=final_correct,
        risk_factor_text=claude.get("risk_factor_text"),
        risk_factor_hit=claude.get("risk_factor_hit"),
        diagnosis_directional_correct=claude.get("diagnosis_directional_correct"),
        diagnosis_edge_realized=claude.get("diagnosis_edge_realized"),
        diagnosis_quality_score=claude.get("diagnosis_quality_score"),
        audit_completed_at=audited_at,
    )


# ---------------------------------------------------------------------------
# Markdown rendering
# ---------------------------------------------------------------------------


def render_markdown(
    report: AggregateReport,
    *,
    since: datetime,
    until: datetime,
) -> str:
    """Render an :class:`AggregateReport` as a Markdown document.

    The output includes:
    - A date-window header.
    - Summary statistics (match count, accuracy, mean Brier).
    - A layer comparison table (ml / sb / poly mean Brier).
    - Risk-factor hit rate and diagnosis quality, where available.

    Parameters
    ----------
    report:
        Fully populated aggregate report.
    since:
        Inclusive window start (informational).
    until:
        Exclusive window end (informational).

    Returns
    -------
    str
        Markdown-formatted report text.
    """
    since_str = since.strftime("%Y-%m-%d")
    until_str = until.strftime("%Y-%m-%d")

    lines: list[str] = [
        "# ScoutEdge WC2026 — Weekly Prediction Audit",
        "",
        f"**Period:** {since_str} → {until_str} (UTC)",
        f"**Generated:** {datetime.now(UTC).strftime('%Y-%m-%d %H:%M UTC')}",
        "",
        "---",
        "",
        "## Summary",
        "",
        "| Metric | Value |",
        "|--------|-------|",
        f"| Matches audited | {report.n_matches} |",
        f"| Finished | {report.n_finished} |",
        f"| Final accuracy (top-1) | {report.final_accuracy:.1%} |",
        f"| Correct picks | {report.final_top1_count} |",
    ]

    # Mean Brier across layers (blended = average of available layers as proxy)
    if report.layer_mean_brier:
        avg_brier = sum(report.layer_mean_brier.values()) / len(report.layer_mean_brier)
        lines.append(f"| Mean Brier (all layers avg) | {avg_brier:.4f} |")

    lines += ["", "## Layer Comparison", ""]

    if report.layer_mean_brier:
        lines += [
            "| Layer | Mean Brier |",
            "|-------|-----------|",
        ]
        for layer in ("ml", "sb", "poly"):
            if layer in report.layer_mean_brier:
                lines.append(f"| {layer.upper()} | {report.layer_mean_brier[layer]:.4f} |")
    else:
        lines.append("_No layer data available for this period._")

    lines += ["", "## Risk Factors & Diagnosis", ""]

    if report.risk_factor_hit_rate is not None:
        lines.append(f"- **Risk-factor hit rate:** {report.risk_factor_hit_rate:.1%}")
    else:
        lines.append("- **Risk-factor hit rate:** _no risk-factor matches this week_")

    if report.diagnosis_invocation_rate is not None:
        lines.append(f"- **Diagnosis invocation rate:** {report.diagnosis_invocation_rate:.1%}")
        if report.diagnosis_quality_avg is not None:
            lines.append(f"- **Mean diagnosis quality score:** {report.diagnosis_quality_avg:.3f}")
    else:
        lines.append("- **Diagnosis invocation rate:** _no diagnosis data this week_")

    lines += ["", "---", "", "_ScoutEdge Intelligence · automated weekly report_", ""]

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# File output
# ---------------------------------------------------------------------------


def write_report(text: str, output_dir: Path, week_start: datetime) -> Path:
    """Write the report Markdown to ``<output_dir>/wYYYYMMDD.md``.

    Parameters
    ----------
    text:
        Rendered Markdown string.
    output_dir:
        Directory to write into; created if it does not exist.
    week_start:
        ISO week-start datetime used to derive the filename.

    Returns
    -------
    Path
        Absolute path of the written file.
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    filename = f"w{week_start.strftime('%Y%m%d')}.md"
    path = output_dir / filename
    path.write_text(text, encoding="utf-8")
    logger.info("write_report: report written", path=str(path), bytes=len(text.encode()))
    return path


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------


def post_to_webhook(text: str, url: str) -> None:
    """POST the report as JSON ``{"text": <text>}`` to *url*.

    Errors are logged but never re-raised; the caller decides whether to
    treat this as fatal.

    Parameters
    ----------
    text:
        The rendered Markdown string to send.
    url:
        Webhook endpoint URL.
    """
    try:
        response = httpx.post(url, json={"text": text}, timeout=15.0)
        response.raise_for_status()
        logger.info("post_to_webhook: success", status=response.status_code, url=url)
    except httpx.HTTPStatusError as exc:
        logger.error(
            "post_to_webhook: HTTP error",
            status=exc.response.status_code,
            url=url,
            error=str(exc),
        )
    except Exception as exc:
        logger.error("post_to_webhook: unexpected error", url=url, error=str(exc))


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------


async def run(args: argparse.Namespace) -> int:
    """Top-level async orchestrator.

    1. Computes ``since`` / ``until`` from ``--days-back``.
    2. Opens a DB session and calls :func:`fetch_audits`.
    3. Builds an :class:`AggregateReport`.
    4. Renders Markdown via :func:`render_markdown`.
    5. Writes to disk and/or posts to webhook unless ``--dry-run``.

    Parameters
    ----------
    args:
        Parsed CLI namespace.

    Returns
    -------
    int
        ``0`` on success, ``1`` on fatal error.
    """
    log = logger.bind(
        days_back=args.days_back,
        output_dir=str(args.output_dir),
        dry_run=args.dry_run,
        webhook_url=args.webhook_url,
    )
    log.info("weekly_report: starting")

    until = datetime.now(UTC)
    since = until - timedelta(days=args.days_back)
    # week_start is the Monday of the ISO week containing `since`
    week_start = since - timedelta(days=since.weekday())

    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        log.error("weekly_report: DATABASE_URL env var is not set")
        return 1

    try:
        engine = create_async_engine(coerce_async_database_url(database_url), echo=False)
        session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )

        async with session_factory() as session:
            reports = await fetch_audits(session, since=since, until=until)

        aggregate = build_aggregate_report(reports, period_start=since, period_end=until)
        markdown = render_markdown(aggregate, since=since, until=until)

        log.info("weekly_report: markdown rendered", length=len(markdown))

        if args.dry_run:
            log.info("weekly_report: dry-run mode — skipping write and webhook")
            return 0

        written_path = write_report(markdown, args.output_dir, week_start)
        log.info("weekly_report: file written", path=str(written_path))

        if args.webhook_url:
            post_to_webhook(markdown, args.webhook_url)

        log.info("weekly_report: complete")
        return 0

    except Exception as exc:
        log.error("weekly_report: fatal error", error=str(exc), exc_info=True)
        return 1


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> int:
    """Synchronous entry point; delegates to :func:`run` via asyncio.

    Returns
    -------
    int
        Process exit code.
    """
    args = parse_args()
    return asyncio.run(run(args))


if __name__ == "__main__":
    sys.exit(main())
