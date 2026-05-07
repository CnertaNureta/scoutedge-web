"""In-play Bayesian probability updater for ScoutEdge WC2026.

Implements a stateful Bayesian filter that takes a pre-match score-matrix
prior (from DixonColesModel) and updates win/draw/away probabilities live
as in-play events occur (goal_home, goal_away, red_home, red_away, tick).

Design
------
Two matrices are maintained internally:

_base_matrix
    The score-matrix conditioned on all observed goals so far, but **before**
    any Poisson re-weighting for remaining time.  Rows and columns represent
    *additional* goals above the current scoreline.  Only goal events mutate
    this matrix.

_matrix (the public ``current_matrix``)
    Derived from ``_base_matrix`` by element-wise multiplication with a
    Poisson weight grid computed from the current effective lambdas and
    the remaining match time.  This is recomputed after every event.

Separation of concerns between the two matrices is what avoids the
double-counting bug that arises when reweighting is applied cumulatively.

Red cards lower the effective lambdas (multiplied by ``red_card_penalty``).
Ticks update the minute (hence remaining time) and trigger a reweighting.
Goal events shift ``_base_matrix`` by one index in the appropriate dimension.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

import numpy as np
from scipy.stats import poisson

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class InPlayState:
    """Snapshot of the in-play match state.

    Attributes
    ----------
    minute:
        Current match minute in [0, 120].
    home_score:
        Goals scored by the home team so far.
    away_score:
        Goals scored by the away team so far.
    home_red_cards:
        Red cards received by the home team.
    away_red_cards:
        Red cards received by the away team.
    last_event_minute:
        Minute of the most recently applied event; ``None`` before any
        event is applied.
    """

    minute: int
    home_score: int
    away_score: int
    home_red_cards: int = 0
    away_red_cards: int = 0
    last_event_minute: int | None = None


@dataclass
class InPlayEvent:
    """A single in-play event to be applied to the updater.

    Attributes
    ----------
    minute:
        Match minute at which the event occurs [0, 120].
    type:
        One of ``"goal_home"``, ``"goal_away"``, ``"red_home"``,
        ``"red_away"``, ``"tick"``.
    payload:
        Optional additional data (reserved for future use).
    """

    minute: int
    type: str
    payload: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# Main updater
# ---------------------------------------------------------------------------


class InPlayBayesianUpdater:
    """Bayesian in-play updater for football match probabilities.

    Updates pre-match P(home/draw/away) using observed in-play events.
    The approach is transparent and lightweight — no Monte-Carlo simulation
    is performed.  Instead the joint score-probability matrix is conditioned
    on the known partial scoreline and the implied remaining Poisson rates
    are rescaled proportionally to the time left in the match.

    Parameters
    ----------
    pre_match_matrix:
        Shape ``(9, 9)`` joint score-probability matrix from
        :class:`~scoutedge_intelligence.models.dixon_coles.DixonColesModel`.
        Must sum to 1.0.
    pre_match_lambda_home:
        Pre-match expected goals for the home side (full 90 minutes).
    pre_match_lambda_away:
        Pre-match expected goals for the away side (full 90 minutes).
    red_card_penalty:
        Multiplicative factor applied to a team's expected goals on
        receiving a red card.  Default ``0.85``.

    Raises
    ------
    ValueError
        If ``pre_match_matrix`` is not shape ``(9, 9)`` or does not sum
        to a positive value.
    """

    MAX_GOALS: int = 8
    MATCH_LENGTH_MIN: int = 90  # extra time handled by extending up to 120

    def __init__(
        self,
        pre_match_matrix: np.ndarray[Any, np.dtype[np.float64]],
        pre_match_lambda_home: float,
        pre_match_lambda_away: float,
        red_card_penalty: float = 0.85,
    ) -> None:
        expected_shape = (self.MAX_GOALS + 1, self.MAX_GOALS + 1)
        if pre_match_matrix.shape != expected_shape:
            raise ValueError(
                f"pre_match_matrix must have shape {expected_shape}, got {pre_match_matrix.shape}"
            )
        total = float(pre_match_matrix.sum())
        if total <= 0:
            raise ValueError("pre_match_matrix must have a positive sum.")

        self._pre_match_matrix: np.ndarray[Any, np.dtype[np.float64]] = (
            pre_match_matrix.astype(np.float64) / total
        )
        self._pre_match_lambda_home: float = pre_match_lambda_home
        self._pre_match_lambda_away: float = pre_match_lambda_away
        self._red_card_penalty: float = red_card_penalty

        # Mutable runtime state
        self._state: InPlayState = InPlayState(minute=0, home_score=0, away_score=0)

        # _base_matrix: conditioned on observed goals, no time-decay weighting yet.
        # Entries represent future additional goals above the current scoreline.
        self._base_matrix: np.ndarray[Any, np.dtype[np.float64]] = self._pre_match_matrix.copy()

        # Cumulative red-card scale factors for each side (independent of time)
        self._home_rc_factor: float = 1.0
        self._away_rc_factor: float = 1.0

        # The public matrix is computed lazily; initialise it now.
        self._matrix: np.ndarray[Any, np.dtype[np.float64]] = self._compute_matrix()

    # ------------------------------------------------------------------
    # Read-only properties
    # ------------------------------------------------------------------

    @property
    def current_state(self) -> InPlayState:
        """Return a copy of the current match state (read-only view)."""
        return InPlayState(
            minute=self._state.minute,
            home_score=self._state.home_score,
            away_score=self._state.away_score,
            home_red_cards=self._state.home_red_cards,
            away_red_cards=self._state.away_red_cards,
            last_event_minute=self._state.last_event_minute,
        )

    @property
    def current_matrix(self) -> np.ndarray[Any, np.dtype[np.float64]]:
        """Return a copy of the current joint score-probability matrix."""
        return self._matrix.copy()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def apply_event(self, event: InPlayEvent) -> dict[str, float]:
        """Apply an in-play event and return updated outcome probabilities.

        Parameters
        ----------
        event:
            The event to apply.  Events must arrive in chronological order
            (non-decreasing minute).  For non-tick events, the minute must
            be strictly >= the last applied event minute.  Ticks may share
            the same minute as the previous event.

        Returns
        -------
        dict
            ``{"home_win": float, "draw": float, "away_win": float}``
            Values sum to 1.0.

        Raises
        ------
        ValueError
            If the event minute is earlier than the last event minute, or
            if a goal would push a scoreline past the matrix boundary.
        """
        self._validate_event_order(event)

        # Update minute before processing so remaining-time calculations are
        # based on the event minute, not the prior state minute.
        self._state.minute = event.minute
        self._state.last_event_minute = event.minute

        if event.type == "goal_home":
            self._shift_base_matrix(side="home")
            self._state.home_score += 1
        elif event.type == "goal_away":
            self._shift_base_matrix(side="away")
            self._state.away_score += 1
        elif event.type == "red_home":
            self._home_rc_factor *= self._red_card_penalty
            self._state.home_red_cards += 1
        elif event.type == "red_away":
            self._away_rc_factor *= self._red_card_penalty
            self._state.away_red_cards += 1
        elif event.type == "tick":
            pass  # minute already updated above; recompute below
        else:
            raise ValueError(
                f"Unknown event type {event.type!r}. "
                "Must be one of: goal_home, goal_away, red_home, red_away, tick."
            )

        # Recompute the public matrix from the (possibly updated) base matrix
        # using current effective lambdas and remaining time.
        self._matrix = self._compute_matrix()
        return self.derive_probabilities()

    def derive_probabilities(self) -> dict[str, float]:
        """Compute P(home_win / draw / away_win) from the current matrix.

        Returns
        -------
        dict
            ``{"home_win": float, "draw": float, "away_win": float}``
            Values sum to 1.0.
        """
        g = self.MAX_GOALS + 1
        m = self._matrix

        # Vectorised triangular sums
        home_goals = self._state.home_score
        away_goals = self._state.away_score

        home_win: float = 0.0
        draw: float = 0.0
        away_win: float = 0.0

        for extra_h in range(g):
            for extra_a in range(g):
                final_h = home_goals + extra_h
                final_a = away_goals + extra_a
                v = float(m[extra_h, extra_a])
                if final_h > final_a:
                    home_win += v
                elif final_h == final_a:
                    draw += v
                else:
                    away_win += v

        total = home_win + draw + away_win
        if total <= 0:
            return {"home_win": 1 / 3, "draw": 1 / 3, "away_win": 1 / 3}

        return {
            "home_win": home_win / total,
            "draw": draw / total,
            "away_win": away_win / total,
        }

    def reset(self) -> None:
        """Restore the updater to its pre-match state.

        All mutable fields — base matrix, effective lambdas, score, red
        cards, and minute — are reset to the values passed at construction.
        """
        self._state = InPlayState(minute=0, home_score=0, away_score=0)
        self._base_matrix = self._pre_match_matrix.copy()
        self._home_rc_factor = 1.0
        self._away_rc_factor = 1.0
        self._matrix = self._compute_matrix()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _validate_event_order(self, event: InPlayEvent) -> None:
        """Raise ValueError if an event breaks chronological ordering."""
        last = self._state.last_event_minute
        if last is None:
            return
        if event.minute < last:
            raise ValueError(
                f"Event minute {event.minute} is before the last event "
                f"minute {last}. Events must arrive in chronological order."
            )

    def _remaining_minutes(self, current_minute: int) -> float:
        """Estimated remaining minutes from *current_minute*.

        Clamped so that extra time (>90) still leaves a positive residual
        until minute 120 to avoid division-by-zero edge cases.
        """
        if current_minute >= self.MATCH_LENGTH_MIN:
            return max(0.0, float(120 - current_minute))
        return float(self.MATCH_LENGTH_MIN - current_minute)

    def _remaining_fraction(self, current_minute: int) -> float:
        """Fraction of the 90-minute match duration still to play [0, 1]."""
        return min(1.0, self._remaining_minutes(current_minute) / float(self.MATCH_LENGTH_MIN))

    def _effective_lambdas(self) -> tuple[float, float]:
        """Return current effective (lambda_home, lambda_away).

        Incorporates both the time-decay scaling and red-card penalties.
        A small floor of 1e-10 prevents zero-division in Poisson PMF.
        """
        frac = self._remaining_fraction(self._state.minute)
        lam_h = max(self._pre_match_lambda_home * frac * self._home_rc_factor, 1e-10)
        lam_a = max(self._pre_match_lambda_away * frac * self._away_rc_factor, 1e-10)
        return lam_h, lam_a

    def _compute_matrix(self) -> np.ndarray[Any, np.dtype[np.float64]]:
        """Build the normalised probability matrix from ``_base_matrix``.

        Element ``(i, j)`` of the result is proportional to
        ``_base_matrix[i, j] * Poisson(i; lam_h) * Poisson(j; lam_a)``,
        where ``(i, j)`` count *additional* goals above the current score.

        The result is always normalised to sum to 1.0.
        """
        g = self.MAX_GOALS + 1
        lam_h, lam_a = self._effective_lambdas()

        home_pmf = np.array([poisson.pmf(k, lam_h) for k in range(g)], dtype=np.float64)
        away_pmf = np.array([poisson.pmf(k, lam_a) for k in range(g)], dtype=np.float64)
        weight_matrix: np.ndarray[Any, np.dtype[np.float64]] = np.outer(home_pmf, away_pmf).astype(
            np.float64
        )

        result = self._base_matrix * weight_matrix

        total = float(result.sum())
        result = result / total if total > 0 else np.full((g, g), 1.0 / (g * g), dtype=np.float64)

        return result

    def _shift_base_matrix(self, side: str) -> None:
        """Shift ``_base_matrix`` by one additional goal in *side*'s dimension.

        After a goal is scored, ``_base_matrix[i, j]`` must represent
        P(home scores *i* more | home has already scored home_score+1).
        We achieve this by taking the sub-matrix starting one index further
        along the appropriate axis.

        The current (pre-goal) matrix rows/cols already represent additional
        goals on top of the existing scoreline.  After a home goal, row 0
        of the new matrix (= 0 more home goals on top of new score) should
        map to what was row 1 (= 1 more home goal on top of the old score).

        Parameters
        ----------
        side:
            ``"home"`` shifts rows; ``"away"`` shifts columns.

        Raises
        ------
        ValueError
            If shifting would push the score past ``MAX_GOALS``.
        """
        g = self.MAX_GOALS + 1

        if side == "home":
            new_score = self._state.home_score + 1
            if new_score > self.MAX_GOALS:
                raise ValueError(
                    f"scoreline already past goal cap: "
                    f"home_score would become {new_score} > MAX_GOALS={self.MAX_GOALS}"
                )
            # Take rows [1:] (i.e. prior "1 more", "2 more", ... become "0 more", "1 more", ...)
            new_base: np.ndarray[Any, np.dtype[np.float64]] = np.zeros((g, g), dtype=np.float64)
            rows_left = g - 1  # 8 rows remain after dropping row 0
            new_base[:rows_left, :] = self._base_matrix[1:, :]
        else:  # away
            new_score = self._state.away_score + 1
            if new_score > self.MAX_GOALS:
                raise ValueError(
                    f"scoreline already past goal cap: "
                    f"away_score would become {new_score} > MAX_GOALS={self.MAX_GOALS}"
                )
            new_base = np.zeros((g, g), dtype=np.float64)
            cols_left = g - 1
            new_base[:, :cols_left] = self._base_matrix[:, 1:]

        # Normalise the shifted base matrix so reweighting stays numerically stable
        base_total = float(new_base.sum())
        if base_total > 0:
            new_base = new_base / base_total

        self._base_matrix = new_base
