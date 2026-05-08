"""Dixon-Coles football match outcome prediction model.

Reference: Dixon & Coles (1997) — "Modelling Association Football Scores
and Inefficiencies in the Football Betting Market".
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import Any, ClassVar

import numpy as np
import pandas as pd
from scipy import optimize
from scipy.stats import poisson

logger = logging.getLogger(__name__)

# Module-level guard so the unfitted-fallback warning is logged at most once
# per process. Reset to ``False`` in tests via the ``reset_unfitted_warning``
# fixture.
_warned_unfitted: bool = False


@dataclass
class DixonColesParams:
    """Fitted parameters for the Dixon-Coles model."""

    attack: dict[str, float]
    defense: dict[str, float]
    home_advantage: float
    rho: float


class DixonColesModel:
    """Dixon-Coles Poisson model with low-score correction.

    Attributes
    ----------
    MAX_GOALS:
        Truncation point for the score matrix (inclusive).
    params:
        Fitted model parameters; ``None`` until :meth:`fit` is called
        or a ``DixonColesParams`` object is supplied to ``__init__``.
    """

    MAX_GOALS: int = 8

    # Uniform 1X2 distribution returned when the model is unfitted. Treated
    # as a class-level constant; callers receive a copy to avoid accidental
    # mutation of the shared default.
    _UNIFIED_PROBS: ClassVar[dict[str, float]] = {
        "home_win": 1 / 3,
        "draw": 1 / 3,
        "away_win": 1 / 3,
    }

    def __init__(self, params: DixonColesParams | None = None) -> None:
        self.params: DixonColesParams | None = params

    @property
    def is_fitted(self) -> bool:
        """Return ``True`` when fitted parameters are available."""
        return self.params is not None

    # ------------------------------------------------------------------
    # Core statistical primitives
    # ------------------------------------------------------------------

    @staticmethod
    def _tau(
        x: int,
        y: int,
        lambda_: float,
        mu: float,
        rho: float,
    ) -> float:
        """Low-score correction factor tau(x, y; lambda, mu, rho).

        For (x, y) in {(0,0), (0,1), (1,0), (1,1)} the Poisson
        independence assumption is relaxed via parameter *rho*.
        All other score-pairs return 1.0.

        Parameters
        ----------
        x:
            Home goals scored.
        y:
            Away goals scored.
        lambda_:
            Expected goals for the home team.
        mu:
            Expected goals for the away team.
        rho:
            Low-score correlation parameter.

        Returns
        -------
        float
            Correction multiplier.
        """
        if x == 0 and y == 0:
            return 1.0 - lambda_ * mu * rho
        if x == 0 and y == 1:
            return 1.0 + lambda_ * rho
        if x == 1 and y == 0:
            return 1.0 + mu * rho
        if x == 1 and y == 1:
            return 1.0 - rho
        return 1.0

    def _expected_goals(self, home_team: str, away_team: str) -> tuple[float, float]:
        """Return (λ_home, μ_away) for a given fixture."""
        if self.params is None:
            raise RuntimeError("Model is not fitted. Call fit() first.")
        attack = self.params.attack
        defense = self.params.defense
        if home_team not in attack:
            raise KeyError(f"Unknown team: {home_team!r}")
        if away_team not in attack:
            raise KeyError(f"Unknown team: {away_team!r}")
        lambda_ = math.exp(attack[home_team] + defense[away_team] + self.params.home_advantage)
        mu = math.exp(attack[away_team] + defense[home_team])
        return lambda_, mu

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def score_matrix(self, home_team: str, away_team: str) -> np.ndarray[Any, np.dtype[np.float64]]:
        """Compute the (MAX_GOALS+1) x (MAX_GOALS+1) score-probability matrix.

        Entry ``[i, j]`` is P(home=i, away=j). The matrix is renormalised
        so that it sums exactly to 1.0.

        Parameters
        ----------
        home_team:
            Name of the home team (must be in fitted attack dict).
        away_team:
            Name of the away team (must be in fitted attack dict).

        Returns
        -------
        np.ndarray
            Shape ``(MAX_GOALS+1, MAX_GOALS+1)``.

        Raises
        ------
        KeyError
            If either team is not present in the fitted parameters.
        """
        lambda_, mu = self._expected_goals(home_team, away_team)
        rho = self.params.rho  # type: ignore[union-attr]

        g = self.MAX_GOALS + 1
        matrix = np.zeros((g, g))
        for i in range(g):
            for j in range(g):
                tau = self._tau(i, j, lambda_, mu, rho)
                matrix[i, j] = tau * poisson.pmf(i, lambda_) * poisson.pmf(j, mu)

        # Renormalise to account for truncation
        total = matrix.sum()
        if total > 0:
            matrix /= total
        return matrix

    def predict_1x2(self, home_team: str, away_team: str) -> dict[str, float]:
        """Return 1X2 outcome probabilities.

        Parameters
        ----------
        home_team:
            Name of the home team.
        away_team:
            Name of the away team.

        Returns
        -------
        dict
            Keys: ``home_win``, ``draw``, ``away_win``.
            Values sum to 1.0.

        Raises
        ------
        KeyError
            If either team is not present in the fitted parameters.
        """
        if self.params is None:
            global _warned_unfitted
            if not _warned_unfitted:
                logger.warning(
                    "dixon_coles.unfitted_fallback: predict_1x2 called before "
                    "fit(); returning uniform 1/3-1/3-1/3 probabilities."
                )
                _warned_unfitted = True
            return dict(self._UNIFIED_PROBS)

        matrix = self.score_matrix(home_team, away_team)
        g = self.MAX_GOALS + 1
        home_win = float(np.sum([matrix[i, j] for i in range(g) for j in range(g) if i > j]))
        draw = float(np.sum([matrix[i, i] for i in range(g)]))
        away_win = float(np.sum([matrix[i, j] for i in range(g) for j in range(g) if j > i]))
        # Normalise for floating-point safety
        total = home_win + draw + away_win
        return {
            "home_win": home_win / total,
            "draw": draw / total,
            "away_win": away_win / total,
        }

    def predict_props(self, home_team: str, away_team: str) -> dict[str, Any]:
        """Return supplementary match propositions.

        Parameters
        ----------
        home_team:
            Name of the home team.
        away_team:
            Name of the away team.

        Returns
        -------
        dict
            Keys:
            - ``over_2_5_goals`` (float)
            - ``under_2_5_goals`` (float)
            - ``btts_yes`` (float) — both teams to score
            - ``btts_no`` (float)
            - ``most_likely_score`` (tuple[int, int])
            - ``most_likely_score_prob`` (float)

        Raises
        ------
        KeyError
            If either team is not present in the fitted parameters.
        """
        matrix = self.score_matrix(home_team, away_team)
        g = self.MAX_GOALS + 1

        over_2_5 = float(np.sum([matrix[i, j] for i in range(g) for j in range(g) if i + j > 2]))
        under_2_5 = float(np.sum([matrix[i, j] for i in range(g) for j in range(g) if i + j <= 2]))
        btts_yes = float(
            np.sum([matrix[i, j] for i in range(g) for j in range(g) if i > 0 and j > 0])
        )
        btts_no = 1.0 - btts_yes

        flat_idx = int(np.argmax(matrix))
        most_likely_score = (flat_idx // g, flat_idx % g)
        most_likely_score_prob = float(matrix.flat[flat_idx])

        return {
            "over_2_5_goals": over_2_5,
            "under_2_5_goals": under_2_5,
            "btts_yes": btts_yes,
            "btts_no": btts_no,
            "most_likely_score": most_likely_score,
            "most_likely_score_prob": most_likely_score_prob,
        }

    # ------------------------------------------------------------------
    # Fitting
    # ------------------------------------------------------------------

    def fit(
        self,
        matches_df: pd.DataFrame,
        decay_factor: float = 0.0065,
    ) -> optimize.OptimizeResult:
        """Fit the Dixon-Coles model via maximum likelihood estimation.

        Parameters
        ----------
        matches_df:
            DataFrame with columns: ``home_team``, ``away_team``,
            ``date`` (datetime), ``home_goals``, ``away_goals``.
        decay_factor:
            Controls exponential time-decay: weight = exp(-decay_factor * days_ago).
            Default 0.0065 ≈ half-life of ~106 days.

        Returns
        -------
        scipy.optimize.OptimizeResult
            The result from :func:`scipy.optimize.minimize`.

        Side Effects
        ------------
        Sets ``self.params`` with the optimised ``DixonColesParams``.
        """
        required = {"home_team", "away_team", "date", "home_goals", "away_goals"}
        missing = required - set(matches_df.columns)
        if missing:
            raise ValueError(f"matches_df is missing columns: {missing}")

        df = matches_df.copy()
        df["date"] = pd.to_datetime(df["date"])
        max_date = df["date"].max()
        df["days_ago"] = (max_date - df["date"]).dt.days
        df["weight"] = np.exp(-decay_factor * df["days_ago"])

        teams = sorted(set(df["home_team"]) | set(df["away_team"]))
        n = len(teams)
        team_idx: dict[str, int] = {t: i for i, t in enumerate(teams)}

        # Parameter layout: [attack_0..n-1, defense_0..n-1, home_adv, rho]
        # attack and defense are in log-space (unconstrained); identifiability
        # is enforced via SLSQP equality constraints sum(attack)=0, sum(defense)=0.
        n_params = 2 * n + 2
        home_adv_idx = 2 * n
        rho_idx = 2 * n + 1

        def _neg_log_likelihood(params: np.ndarray[Any, np.dtype[np.float64]]) -> float:
            attack = params[:n]
            defense = params[n : 2 * n]
            home_adv = params[home_adv_idx]
            rho = params[rho_idx]

            nll = 0.0
            for row in df.itertuples(index=False):
                hi = team_idx[row.home_team]
                ai = team_idx[row.away_team]
                hg = int(row.home_goals)
                ag = int(row.away_goals)
                w = float(row.weight)

                lambda_ = math.exp(attack[hi] + defense[ai] + home_adv)
                mu = math.exp(attack[ai] + defense[hi])

                tau = self._tau(hg, ag, lambda_, mu, rho)
                if tau <= 0:
                    return 1e10

                log_lik = (
                    math.log(tau)
                    + hg * math.log(lambda_)
                    - lambda_
                    - math.lgamma(hg + 1)
                    + ag * math.log(mu)
                    - mu
                    - math.lgamma(ag + 1)
                )
                nll -= w * log_lik
            return nll

        # Initial guess: zeros for attack/defense, small positive home adv, zero rho
        x0 = np.zeros(n_params)
        x0[home_adv_idx] = 0.1
        x0[rho_idx] = -0.1

        # Identifiability constraints: sum(attack) == 0, sum(defense) == 0
        constraints = [
            {
                "type": "eq",
                "fun": lambda p: np.sum(p[:n]),
            },
            {
                "type": "eq",
                "fun": lambda p: np.sum(p[n : 2 * n]),
            },
        ]

        # Bounds: rho ∈ (-1, 0] to keep τ corrections positive; others unbounded
        bounds = (
            [(None, None)] * (2 * n)
            + [(None, None)]  # home_adv
            + [(-0.99, 0.99)]  # rho
        )

        result: optimize.OptimizeResult = optimize.minimize(
            _neg_log_likelihood,
            x0,
            method="SLSQP",
            bounds=bounds,
            constraints=constraints,
            options={"maxiter": 500, "ftol": 1e-8},
        )

        opt = result.x
        attack_params: dict[str, float] = {t: float(opt[team_idx[t]]) for t in teams}
        defense_params: dict[str, float] = {t: float(opt[n + team_idx[t]]) for t in teams}

        self.params = DixonColesParams(
            attack=attack_params,
            defense=defense_params,
            home_advantage=float(opt[home_adv_idx]),
            rho=float(opt[rho_idx]),
        )
        return result
