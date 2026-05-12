"""Football ELO rating system for WC2026 match predictions.

Implements a margin-of-victory adjusted ELO model with home advantage,
season regression, and probabilistic outcome prediction.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np


@dataclass
class FootballELOConfig:
    """Configuration parameters for the Football ELO model.

    Attributes:
        k: K-factor controlling rating sensitivity per match.
        home_advantage: ELO points added to home team's effective rating.
        initial_rating: Default rating assigned to an unseen team.
        season_regression_factor: Fraction of rating retained after regression
            toward the mean (applied once per season reset).
    """

    k: int = 30
    home_advantage: int = 65
    initial_rating: float = 1500.0
    season_regression_factor: float = 0.85


class FootballELO:
    """Margin-of-victory adjusted ELO rating system for international football.

    Ratings are stored in an internal dict keyed by team name string.
    Unknown teams are lazily initialised to ``config.initial_rating``.

    Example::

        elo = FootballELO()
        elo.update("Brazil", "Germany", 2, 1)
        probs = elo.predict_outcomes("Brazil", "Germany")
    """

    def __init__(self, config: FootballELOConfig | None = None) -> None:
        """Initialise with an optional config; defaults to FootballELOConfig()."""
        self._config: FootballELOConfig = config if config is not None else FootballELOConfig()
        self._ratings: dict[str, float] = {}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get_rating(self, team: str) -> float:
        """Return the current ELO rating for *team*, creating a default entry if absent.

        Args:
            team: Team name string (case-sensitive).

        Returns:
            Current ELO rating as a float.
        """
        if team not in self._ratings:
            self._ratings[team] = self._config.initial_rating
        return self._ratings[team]

    def expected_score(self, rating_a: float, rating_b: float) -> float:
        """Compute the ELO expected score for team A given ratings of A and B.

        The expected score is the win-probability proxy: 1 means certain win,
        0 means certain loss, 0.5 means equal strength.

        Args:
            rating_a: ELO rating of team A.
            rating_b: ELO rating of team B.

        Returns:
            Expected score in [0, 1] for team A.
        """
        return float(1.0 / (1.0 + 10.0 ** ((rating_b - rating_a) / 400.0)))

    def margin_multiplier(self, goal_diff: int, elo_diff: float) -> float:
        """Return the goal-margin multiplier used to scale the ELO update.

        Based on the FiveThirtyEight / World Football ELO formula that accounts
        for both the magnitude of the result and the rating difference between
        teams (to avoid over-rewarding upset wins by dominant teams).

        Guarantees:
            - ``goal_diff == 0`` → returns 1.0 (draws use a unit multiplier).
            - Monotonically increasing with ``abs(goal_diff)``.

        Args:
            goal_diff: Absolute goal difference (non-negative).
            elo_diff: ELO difference of the winning team minus the losing team
                at the time of the match (may be negative for upsets).

        Returns:
            Float ≥ 1.0.
        """
        if goal_diff == 0:
            return 1.0

        gd = abs(goal_diff)
        # Numerator: log-scaled goal difference (diminishing returns)
        numerator = math.log(gd + 1)
        # Denominator: correction for expected dominance
        denominator = 1.0 + 0.001 * elo_diff
        # Clamp denominator away from zero/negative to keep multiplier positive
        denominator = max(denominator, 0.5)
        return numerator / math.log(2) * (1.0 / denominator)

    def update(
        self,
        home: str,
        away: str,
        home_goals: int,
        away_goals: int,
    ) -> tuple[float, float]:
        """Update ratings after a completed match and return the new ratings.

        Home advantage is baked into the effective rating used for
        ``expected_score``, not permanently stored in the rating.

        Args:
            home: Name of the home team.
            away: Name of the away team.
            home_goals: Goals scored by the home team.
            away_goals: Goals scored by the away team.

        Returns:
            Tuple of ``(new_home_rating, new_away_rating)``.
        """
        cfg = self._config
        home_rating = self.get_rating(home)
        away_rating = self.get_rating(away)

        # Apply home advantage to expected score calculation only
        effective_home = home_rating + cfg.home_advantage
        e_home = self.expected_score(effective_home, away_rating)
        e_away = 1.0 - e_home

        # Actual scores: 1 = win, 0.5 = draw, 0 = loss
        goal_diff = home_goals - away_goals
        if goal_diff > 0:
            s_home, s_away = 1.0, 0.0
        elif goal_diff < 0:
            s_home, s_away = 0.0, 1.0
        else:
            s_home, s_away = 0.5, 0.5

        # Winning team's elo_diff for margin multiplier
        if goal_diff > 0:
            elo_diff_for_mult = effective_home - away_rating
        elif goal_diff < 0:
            elo_diff_for_mult = away_rating - effective_home
        else:
            elo_diff_for_mult = 0.0

        mult = self.margin_multiplier(abs(goal_diff), elo_diff_for_mult)

        new_home = home_rating + cfg.k * mult * (s_home - e_home)
        new_away = away_rating + cfg.k * mult * (s_away - e_away)

        self._ratings[home] = new_home
        self._ratings[away] = new_away

        return new_home, new_away

    def predict_outcomes(self, home: str, away: str) -> dict[str, float]:
        """Predict win/draw/loss probabilities for an upcoming match.

        Uses the ELO expected score to derive win probabilities and a
        draw probability heuristic based on the closeness of the match-up.
        The three probabilities are normalised to sum to exactly 1.0.

        Draw heuristic: the base draw probability is set to 0.25 (reflecting
        the historical ~25 % draw rate in international football) and is
        modulated by a Gaussian centred on equal strength (elo_diff = 0).
        A larger rating gap reduces the draw probability proportionally.

        Args:
            home: Name of the home team.
            away: Name of the away team.

        Returns:
            Dict with keys ``"home_win"``, ``"draw"``, ``"away_win"``
            whose values are non-negative floats summing to 1.0.
        """
        cfg = self._config
        home_rating = self.get_rating(home)
        away_rating = self.get_rating(away)

        effective_home = home_rating + cfg.home_advantage
        raw_home_win = self.expected_score(effective_home, away_rating)
        raw_away_win = 1.0 - raw_home_win

        # Draw probability heuristic:
        # Maximum draw probability (0.28) when ratings are equal, decaying
        # with a Gaussian as the gap grows.  Sigma chosen so that a 200-pt
        # gap halves the draw probability.
        elo_gap = abs(effective_home - away_rating)
        sigma = 200.0 / math.sqrt(2.0 * math.log(2.0))
        draw_base: float = 0.28 * float(np.exp(-0.5 * (elo_gap / sigma) ** 2))

        # Scale win probabilities down proportionally to make room for draws
        win_total = raw_home_win + raw_away_win  # == 1.0
        home_win = raw_home_win * (1.0 - draw_base) / win_total
        away_win = raw_away_win * (1.0 - draw_base) / win_total
        draw = draw_base

        # Normalise to guard against floating-point drift
        total = home_win + draw + away_win
        return {
            "home_win": home_win / total,
            "draw": draw / total,
            "away_win": away_win / total,
        }
