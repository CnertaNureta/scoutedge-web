"""Player-level Poisson (lambda) model for WC2026 scorer predictions.

Models individual player goal output as a Poisson process, adjusting for
opponent defensive strength, playing time, and venue.
"""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
from scipy.stats import poisson


class PlayerLambdaModel:
    """Poisson goal-scoring model for individual players.

    Estimates each player's expected goals (lambda) for a given fixture by
    combining their historical xG rate with opponent defensive strength,
    expected minutes, and a venue modifier.  All public methods are pure with
    respect to external state.

    Args:
        player_stats_df: DataFrame with columns:
            ``player_id``, ``team``, ``goals_per_90``, ``xg_per_90``,
            ``assists_per_90``, ``xa_per_90``.
        team_strength_lookup: Mapping of team name to a dict containing at
            least ``attack_strength`` and ``defense_strength`` float keys.

    Example::

        model = PlayerLambdaModel(stats_df, strength_lookup)
        lam = model.expected_goals("mbappe_fra", "Germany", expected_minutes=75)
    """

    def __init__(
        self,
        player_stats_df: pd.DataFrame,
        team_strength_lookup: dict[str, dict[str, float]],
    ) -> None:
        # Index by player_id for O(1) lookup; keep original df intact.
        self._stats: dict[str, dict[str, float]] = player_stats_df.set_index("player_id").to_dict(
            orient="index"
        )
        self._team_strength: dict[str, dict[str, float]] = team_strength_lookup

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def expected_goals(
        self,
        player_id: str,
        opponent: str,
        expected_minutes: float = 90.0,
        venue_modifier: float = 1.0,
    ) -> float:
        """Compute the expected goal lambda for a player in a fixture.

        Lambda is derived from the player's xg_per_90 rate, adjusted by:
        - Opponent defensive strength: ``exp(-opp_def * 0.5)``
        - Minutes scaling: ``expected_minutes / 90``
        - Venue modifier multiplied in directly.

        Args:
            player_id: Unique player identifier.
            opponent: Opponent team name (used to look up defense_strength).
            expected_minutes: Projected minutes played (default 90).
            venue_modifier: Multiplicative venue adjustment (e.g. 1.15 for
                a strong home crowd advantage).

        Returns:
            Expected goals (lambda ≥ 0.0).  Returns 0.0 for unknown players.
        """
        if player_id not in self._stats:
            return 0.0

        xg_per_90: float = float(self._stats[player_id]["xg_per_90"])
        opp_def: float = self._opponent_defense(opponent)

        lam: float = (
            xg_per_90 * math.exp(-opp_def * 0.5) * (expected_minutes / 90.0) * venue_modifier
        )
        return max(lam, 0.0)

    def goal_distribution(
        self,
        player_id: str,
        opponent: str,
        expected_minutes: float = 90.0,
    ) -> dict[int, float]:
        """Return the Poisson probability mass for 0-3 goals.

        Args:
            player_id: Unique player identifier.
            opponent: Opponent team name.
            expected_minutes: Projected minutes played (default 90).

        Returns:
            Dict ``{0: P0, 1: P1, 2: P2, 3: P3}`` where each value is a
            probability in ``[0, 1]``.
        """
        lam: float = self.expected_goals(player_id, opponent, expected_minutes)
        return {k: float(poisson.pmf(k, lam)) for k in range(4)}

    def p_anytime_scorer(
        self,
        player_id: str,
        opponent: str,
        expected_minutes: float = 90.0,
    ) -> float:
        """Probability that the player scores at least one goal.

        Equivalent to ``1 - P(0 goals)`` under the Poisson model.

        Args:
            player_id: Unique player identifier.
            opponent: Opponent team name.
            expected_minutes: Projected minutes played (default 90).

        Returns:
            Probability in ``[0, 1]``.
        """
        lam: float = self.expected_goals(player_id, opponent, expected_minutes)
        return float(1.0 - poisson.pmf(0, lam))

    def motm_probability(self, player_id: str, match_context: dict[str, float | str]) -> float:
        """Estimate the probability of a player winning Man of the Match.

        Combines expected goals with a team win probability signal.  A player
        on a winning team is more likely to be recognised, so ``team_win_prob``
        scales the raw scorer probability upward.

        ``match_context`` keys:
            - ``opponent`` (str): Opponent team name.
            - ``expected_minutes`` (float, optional): Defaults to 90.
            - ``team_win_prob`` (float): Probability that the player's team wins
              (in ``[0, 1]``).

        Args:
            player_id: Unique player identifier.
            match_context: Fixture-level context dict (see above).

        Returns:
            Estimated MoTM probability in ``[0, 1]``.
        """
        opponent: str = str(match_context["opponent"])
        raw_minutes = match_context.get("expected_minutes", 90.0)
        minutes: float = float(raw_minutes if raw_minutes is not None else 90.0)
        team_win_prob: float = float(match_context["team_win_prob"])

        p_score: float = self.p_anytime_scorer(player_id, opponent, minutes)

        # MoTM probability: weight scoring contribution by team win probability.
        # When team_win_prob == 0 the player can still be heroic (e.g. consolation
        # goal), so we blend: 0.7 * team_win_prob + 0.3 gives a soft floor.
        win_weight: float = 0.7 * team_win_prob + 0.3
        raw: float = p_score * win_weight

        # Clamp to [0, 1] as a safety measure.
        return float(np.clip(raw, 0.0, 1.0))

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _opponent_defense(self, opponent: str) -> float:
        """Return the defense_strength for *opponent* (default 1.0 if unknown)."""
        team_info = self._team_strength.get(opponent, {})
        return float(team_info.get("defense_strength", 1.0))
