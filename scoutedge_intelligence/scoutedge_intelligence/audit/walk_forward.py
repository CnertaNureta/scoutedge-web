"""Walk-forward backtester for 1X2 football match prediction models.

Implements a strict time-respecting cross-validation scheme: train on all
matches up to index T, predict the next ``step_size`` matches, score with
Brier and log-loss, then slide T forward by ``step_size`` and repeat.

The backtester is model-agnostic: any object that satisfies the
:class:`Predictor` protocol can be evaluated, including
:class:`~scoutedge_intelligence.models.dixon_coles.DixonColesModel` or a
full ``TripleLayerEngine``.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any, Protocol

import numpy as np
import pandas as pd
import structlog

from scoutedge_intelligence.audit.metrics import (
    brier_score_multiclass,
    log_loss,
)

__all__ = ["Predictor", "WalkForwardBacktester"]

_log: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

# ---------------------------------------------------------------------------
# Protocol
# ---------------------------------------------------------------------------


class Predictor(Protocol):
    """Anything that can be trained on history and predict 1X2 probabilities.

    Both methods must be implemented by concrete predictors.
    """

    def fit(self, matches_df: pd.DataFrame) -> None:
        """Train the model on *matches_df*.

        Parameters
        ----------
        matches_df:
            Historical match data with at minimum the columns consumed by the
            concrete implementation (e.g. home_team, away_team, home_goals,
            away_goals, date).
        """
        ...

    def predict_1x2(self, home_team: str, away_team: str) -> dict[str, float]:
        """Return outcome probabilities for a single fixture.

        Parameters
        ----------
        home_team:
            Name of the home team as it appears in the training data.
        away_team:
            Name of the away team as it appears in the training data.

        Returns
        -------
        dict[str, float]
            Keys exactly ``{"home_win", "draw", "away_win"}`` summing to 1.0.

        Raises
        ------
        Exception
            Any exception signals that a prediction could not be produced
            (e.g. unknown team).  The backtester will skip the match and log
            a warning.
        """
        ...


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_REQUIRED_COLUMNS: frozenset[str] = frozenset(
    {"home_team", "away_team", "date", "home_goals", "away_goals"}
)


def _derive_outcome(home_goals: int, away_goals: int) -> str:
    """Return the string outcome for a finished match.

    Parameters
    ----------
    home_goals:
        Goals scored by the home side.
    away_goals:
        Goals scored by the away side.

    Returns
    -------
    str
        One of ``"home_win"``, ``"draw"``, or ``"away_win"``.
    """
    if home_goals > away_goals:
        return "home_win"
    if home_goals < away_goals:
        return "away_win"
    return "draw"


def _validate_dataframe(matches_df: pd.DataFrame) -> None:
    """Raise :class:`ValueError` for missing columns."""
    missing = _REQUIRED_COLUMNS - set(matches_df.columns)
    if missing:
        raise ValueError(f"matches_df is missing required columns: {sorted(missing)}")


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------


class WalkForwardBacktester:
    """Strict time-respecting backtester for 1X2 football prediction models.

    Parameters
    ----------
    predictor_factory:
        A zero-argument callable that returns a fresh :class:`Predictor`
        instance.  A new predictor is instantiated for every window so that
        no information leaks between windows via mutable state.
    initial_train_size:
        Minimum number of matches required in the training set before the
        first prediction window opens.  Defaults to 200.
    step_size:
        Number of matches to predict per window.  The window slides forward
        by exactly this many matches after each evaluation.  Defaults to 16.

    Examples
    --------
    >>> from scoutedge_intelligence.models.dixon_coles import DixonColesModel
    >>> backtester = WalkForwardBacktester(DixonColesModel)
    >>> results = backtester.run(matches_df)
    >>> print(results["mean_brier"])
    """

    def __init__(
        self,
        predictor_factory: Callable[[], Predictor],
        *,
        initial_train_size: int = 200,
        step_size: int = 16,
    ) -> None:
        self._factory = predictor_factory
        self._initial_train_size = initial_train_size
        self._step_size = step_size

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def run(self, matches_df: pd.DataFrame) -> dict[str, Any]:
        """Execute the walk-forward evaluation and return aggregate statistics.

        The dataframe must be sorted ascending by ``date``.  Each window
        trains a fresh predictor on all rows strictly before the window
        start index and predicts the rows in ``[start, start + step_size)``.

        If ``predict_1x2`` raises for a particular match (e.g. an unknown
        team), that match is silently skipped and a ``structlog`` warning is
        emitted.  All other matches in the window continue normally.

        Parameters
        ----------
        matches_df:
            Match history with required columns: ``home_team``, ``away_team``,
            ``date`` (datetime), ``home_goals`` (int), ``away_goals`` (int).
            Must be sorted ascending by date.  The first
            ``initial_train_size`` rows form the first training set.

        Returns
        -------
        dict
            Contains the following keys:

            ``n_predictions`` : int
                Total number of successfully scored matches.
            ``mean_brier`` : float
                Arithmetic mean of all per-match Brier scores.
            ``median_brier`` : float
                Median Brier score.
            ``p25_brier`` : float
                25th-percentile Brier score.
            ``p75_brier`` : float
                75th-percentile Brier score.
            ``mean_log_loss`` : float
                Arithmetic mean of all per-match log-loss values.
            ``accuracy`` : float
                Fraction of matches where the highest-probability outcome
                matched the actual outcome.
            ``results`` : list[dict]
                One dict per successfully scored match with keys:
                ``match_idx``, ``predicted``, ``actual``, ``brier``,
                ``correct``.
            ``windows`` : list[dict]
                One dict per evaluation window with keys:
                ``start``, ``end``, ``n``, ``mean_brier``.

        Raises
        ------
        ValueError
            If *matches_df* has fewer than
            ``initial_train_size + step_size`` rows or is missing required
            columns.
        """
        _validate_dataframe(matches_df)

        n_total = len(matches_df)
        min_required = self._initial_train_size + self._step_size
        if n_total < min_required:
            raise ValueError(
                f"matches_df has {n_total} rows but at least "
                f"{min_required} are required "
                f"(initial_train_size={self._initial_train_size} + "
                f"step_size={self._step_size})."
            )

        all_results: list[dict[str, Any]] = []
        windows: list[dict[str, Any]] = []

        for start in range(
            self._initial_train_size,
            n_total - self._step_size + 1,
            self._step_size,
        ):
            end = start + self._step_size
            train = matches_df.iloc[:start]
            test = matches_df.iloc[start:end]

            predictor = self._factory()
            predictor.fit(train)

            window_briers: list[float] = []

            for idx, row in test.iterrows():
                home_team: str = row["home_team"]
                away_team: str = row["away_team"]
                actual: str = _derive_outcome(int(row["home_goals"]), int(row["away_goals"]))

                try:
                    predicted: dict[str, float] = predictor.predict_1x2(home_team, away_team)
                except Exception as exc:
                    _log.warning(
                        "walk_forward.skip_match",
                        match_idx=idx,
                        home_team=home_team,
                        away_team=away_team,
                        error=str(exc),
                    )
                    continue

                brier = brier_score_multiclass(predicted, actual)
                ll = log_loss(predicted, actual)
                top_outcome = max(predicted, key=lambda k: predicted[k])
                correct = top_outcome == actual

                all_results.append(
                    {
                        "match_idx": idx,
                        "predicted": predicted,
                        "actual": actual,
                        "brier": brier,
                        "log_loss": ll,
                        "correct": correct,
                    }
                )
                window_briers.append(brier)

            windows.append(
                {
                    "start": start,
                    "end": end,
                    "n": len(window_briers),
                    "mean_brier": float(np.mean(window_briers)) if window_briers else float("nan"),
                }
            )

        return self._aggregate(all_results, windows)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _aggregate(results: list[dict[str, Any]], windows: list[dict[str, Any]]) -> dict[str, Any]:
        """Compute summary statistics from per-match result records.

        Parameters
        ----------
        results:
            List of per-match dicts produced during :meth:`run`.
        windows:
            List of per-window dicts produced during :meth:`run`.

        Returns
        -------
        dict
            Aggregated statistics dict as documented in :meth:`run`.
        """
        n = len(results)
        if n == 0:
            return {
                "n_predictions": 0,
                "mean_brier": float("nan"),
                "median_brier": float("nan"),
                "p25_brier": float("nan"),
                "p75_brier": float("nan"),
                "mean_log_loss": float("nan"),
                "accuracy": float("nan"),
                "results": results,
                "windows": windows,
            }

        briers = np.array([r["brier"] for r in results], dtype=np.float64)
        log_losses = np.array([r["log_loss"] for r in results], dtype=np.float64)
        correct_flags = np.array([r["correct"] for r in results], dtype=np.float64)

        # Strip log_loss from per-match records before returning (keep public API clean)
        clean_results = [{k: v for k, v in r.items() if k != "log_loss"} for r in results]

        return {
            "n_predictions": n,
            "mean_brier": float(np.mean(briers)),
            "median_brier": float(np.median(briers)),
            "p25_brier": float(np.percentile(briers, 25)),
            "p75_brier": float(np.percentile(briers, 75)),
            "mean_log_loss": float(np.mean(log_losses)),
            "accuracy": float(np.mean(correct_flags)),
            "results": clean_results,
            "windows": windows,
        }
