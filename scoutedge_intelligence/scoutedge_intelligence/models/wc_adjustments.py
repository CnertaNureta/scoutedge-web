"""WC2026 contextual adjustment layer for match probability predictions.

Applies five World Cup-specific environmental and logistical factors as
multiplicative modifiers to base win/draw/loss probabilities, then
renormalises so the output sums to exactly 1.0.

The five factors are:
    1. Altitude acclimatisation delta (venue vs team base altitude)
    2. Heat / humidity stress scaled by pressing intensity
    3. Long-haul travel fatigue (threshold: > 2000 km)
    4. Rest-day asymmetry (fewer rest days → penalty)
    5. Knockout-stage pressure flag (stage != "group")

All functions are pure; no I/O or external state is used.
"""

from __future__ import annotations

from dataclasses import dataclass

# ---------------------------------------------------------------------------
# Data contract
# ---------------------------------------------------------------------------


@dataclass
class WCMatchContext:
    """Environmental and logistical context for a single WC2026 match.

    Attributes:
        venue_city: Host city name (informational; not used in calculations).
        altitude_m: Venue altitude in metres above sea level.
        temperature_c: Ambient temperature at kick-off in Celsius.
        humidity_pct: Relative humidity at kick-off (0-100).
        home_team_base_altitude: Typical training altitude of the home team (m).
        away_team_base_altitude: Typical training altitude of the away team (m).
        home_team_pressing_intensity: Pressing intensity in [0, 1]; higher
            values mean the team presses more and is more heat-sensitive.
        away_team_pressing_intensity: Same for the away team.
        home_team_travel_km: Distance the home team travelled to the venue (km).
        away_team_travel_km: Distance the away team travelled to the venue (km).
        home_team_rest_days: Days of rest since the home team's last match.
        away_team_rest_days: Days of rest since the away team's last match.
        stage: Tournament stage; any value other than ``"group"`` is treated
            as a knockout match.
    """

    venue_city: str
    altitude_m: int
    temperature_c: float
    humidity_pct: float
    home_team_base_altitude: int = 0
    away_team_base_altitude: int = 0
    home_team_pressing_intensity: float = 0.5
    away_team_pressing_intensity: float = 0.5
    home_team_travel_km: float = 0
    away_team_travel_km: float = 0
    home_team_rest_days: int = 4
    away_team_rest_days: int = 4
    stage: str = "group"


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Altitude: penalty starts once delta exceeds this threshold (m)
_ALTITUDE_THRESHOLD_M: int = 1500

# Altitude: penalty multiplier applied per 500 m above threshold
_ALTITUDE_PENALTY_PER_500M: float = 0.015

# Heat: baseline stress starts at this temperature (°C); humidity amplifies it
_HEAT_TEMP_BASELINE_C: float = 25.0

# Heat: maximum heat-stress multiplier reduction per team
_HEAT_MAX_PENALTY: float = 0.06

# Travel: long-haul threshold in kilometres
_TRAVEL_THRESHOLD_KM: float = 2000.0

# Travel: flat penalty applied when a team exceeds the threshold
_TRAVEL_PENALTY: float = 0.04

# Rest: neutral rest benchmark (days)
_REST_NEUTRAL_DAYS: int = 4

# Rest: penalty per day below neutral (positive → team gets fewer days)
_REST_PENALTY_PER_DAY: float = 0.02

# Knockout: symmetrical pressure boost for both draw and win outcomes
_KNOCKOUT_DRAW_FACTOR: float = 0.90  # draws less likely in knockout stage

# Knockout: slight edge for teams historically strong in knockouts (same for
# both teams without team-specific data, so treated as a small uncertainty
# factor on individual probs rather than a directional shift).
# Here we model it only through the draw reduction; home/away are not
# differentially adjusted by default.
_KNOCKOUT_HOME_FACTOR: float = 1.025
_KNOCKOUT_AWAY_FACTOR: float = 0.975


# ---------------------------------------------------------------------------
# Main class
# ---------------------------------------------------------------------------


class WCAdjustmentLayer:
    """Applies WC2026 contextual multipliers to base match probabilities.

    Usage::

        layer = WCAdjustmentLayer()
        ctx = WCMatchContext(
            venue_city="Guadalajara",
            altitude_m=1566,
            temperature_c=30.0,
            humidity_pct=60.0,
        )
        base = {"home_win": 0.45, "draw": 0.25, "away_win": 0.30}
        adjusted = layer.adjust_probabilities(base, ctx)
        features = layer.get_adjustment_features(ctx)
    """

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def adjust_probabilities(
        self,
        base_probs: dict[str, float],
        ctx: WCMatchContext,
    ) -> dict[str, float]:
        """Apply WC contextual multipliers and renormalise.

        The adjustment is purely multiplicative: each raw probability is
        multiplied by a team-specific factor derived from the five WC
        factors.  The results are renormalised so they sum to 1.0.

        Args:
            base_probs: Dict with keys ``"home_win"``, ``"draw"``,
                ``"away_win"`` whose values are non-negative and sum ≈ 1.0.
            ctx: Match context containing venue and team metadata.

        Returns:
            Dict with the same keys as *base_probs*, non-negative, summing
            to 1.0 within floating-point precision (< 1e-12 error).

        Raises:
            ValueError: If *base_probs* is missing any required key or any
                value is negative.
        """
        _validate_base_probs(base_probs)

        home_factor, away_factor = self._compute_team_factors(ctx)
        knockout_draw_factor = self._knockout_draw_factor(ctx)

        home_win_raw = base_probs["home_win"] * home_factor
        draw_raw = base_probs["draw"] * knockout_draw_factor
        away_win_raw = base_probs["away_win"] * away_factor

        total = home_win_raw + draw_raw + away_win_raw
        if total <= 0.0:
            # Degenerate input: return uniform distribution
            return {"home_win": 1.0 / 3.0, "draw": 1.0 / 3.0, "away_win": 1.0 / 3.0}

        return {
            "home_win": home_win_raw / total,
            "draw": draw_raw / total,
            "away_win": away_win_raw / total,
        }

    def get_adjustment_features(self, ctx: WCMatchContext) -> dict[str, float]:
        """Return the 7 numeric adjustment features derived from *ctx*.

        Feature names and semantics
        ---------------------------
        ``altitude_delta_home``
            Signed altitude delta for the home team: venue altitude minus the
            home team's base altitude (metres).  Positive means the team is
            playing at higher altitude than it is acclimatised to.

        ``altitude_delta_away``
            Same for the away team.

        ``heat_stress_home``
            A score in [0, 1] representing combined temperature-and-humidity
            stress on the home team, scaled by its pressing intensity.
            Zero when temperature ≤ ``_HEAT_TEMP_BASELINE_C``.

        ``heat_stress_away``
            Same for the away team.

        ``travel_flag_home``
            1.0 if the home team travelled more than 2000 km, else 0.0.

        ``travel_flag_away``
            1.0 if the away team travelled more than 2000 km, else 0.0.

        ``knockout_flag``
            1.0 if the match stage is not ``"group"``, else 0.0.

        Args:
            ctx: Match context.

        Returns:
            Dict mapping each of the 7 feature names to a float.
        """
        return {
            "altitude_delta_home": float(ctx.altitude_m - ctx.home_team_base_altitude),
            "altitude_delta_away": float(ctx.altitude_m - ctx.away_team_base_altitude),
            "heat_stress_home": _heat_stress(
                ctx.temperature_c,
                ctx.humidity_pct,
                ctx.home_team_pressing_intensity,
            ),
            "heat_stress_away": _heat_stress(
                ctx.temperature_c,
                ctx.humidity_pct,
                ctx.away_team_pressing_intensity,
            ),
            "travel_flag_home": 1.0 if ctx.home_team_travel_km > _TRAVEL_THRESHOLD_KM else 0.0,
            "travel_flag_away": 1.0 if ctx.away_team_travel_km > _TRAVEL_THRESHOLD_KM else 0.0,
            "knockout_flag": 0.0 if ctx.stage == "group" else 1.0,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _compute_team_factors(
        self,
        ctx: WCMatchContext,
    ) -> tuple[float, float]:
        """Return the (home_factor, away_factor) composite multipliers.

        Each factor is the product of the four per-team adjustments:
        altitude, heat, travel, and rest.  Values are always positive.
        """
        home_factor = (
            _altitude_factor(ctx.altitude_m, ctx.home_team_base_altitude)
            * _heat_factor(
                ctx.temperature_c,
                ctx.humidity_pct,
                ctx.home_team_pressing_intensity,
            )
            * _travel_factor(ctx.home_team_travel_km)
            * _rest_factor(ctx.home_team_rest_days, ctx.away_team_rest_days)
        )
        away_factor = (
            _altitude_factor(ctx.altitude_m, ctx.away_team_base_altitude)
            * _heat_factor(
                ctx.temperature_c,
                ctx.humidity_pct,
                ctx.away_team_pressing_intensity,
            )
            * _travel_factor(ctx.away_team_travel_km)
            * _rest_factor(ctx.away_team_rest_days, ctx.home_team_rest_days)
        )
        # Knockout: slight asymmetric pressure
        if ctx.stage != "group":
            home_factor *= _KNOCKOUT_HOME_FACTOR
            away_factor *= _KNOCKOUT_AWAY_FACTOR

        return home_factor, away_factor

    def _knockout_draw_factor(self, ctx: WCMatchContext) -> float:
        """Return the draw-probability multiplier based on match stage."""
        return _KNOCKOUT_DRAW_FACTOR if ctx.stage != "group" else 1.0


# ---------------------------------------------------------------------------
# Pure factor functions (module-private)
# ---------------------------------------------------------------------------


def _altitude_factor(venue_alt_m: int, team_base_alt_m: int) -> float:
    """Multiplicative factor penalising a team playing above its acclimatised altitude.

    No penalty is applied if the delta is at or below *_ALTITUDE_THRESHOLD_M*.
    Above that, the factor decreases by ``_ALTITUDE_PENALTY_PER_500M`` for
    every 500 m of excess.

    Args:
        venue_alt_m: Venue altitude in metres.
        team_base_alt_m: Team's acclimatised base altitude in metres.

    Returns:
        Float in (0, 1].  Returns 1.0 when delta ≤ threshold.
    """
    delta = venue_alt_m - team_base_alt_m
    if delta <= _ALTITUDE_THRESHOLD_M:
        return 1.0
    excess = delta - _ALTITUDE_THRESHOLD_M
    steps = excess / 500.0
    penalty = steps * _ALTITUDE_PENALTY_PER_500M
    return max(1.0 - penalty, 0.01)


def _heat_stress(
    temperature_c: float,
    humidity_pct: float,
    pressing_intensity: float,
) -> float:
    """Compute a [0, 1] heat-stress score for a team.

    The score rises linearly with temperature above the baseline, with
    humidity as an amplifier and pressing intensity as a scaling factor.

    Args:
        temperature_c: Ambient temperature (°C).
        humidity_pct: Relative humidity (0-100).
        pressing_intensity: Team pressing intensity (0-1).

    Returns:
        Float in [0, 1].
    """
    if temperature_c <= _HEAT_TEMP_BASELINE_C:
        return 0.0
    temp_excess = temperature_c - _HEAT_TEMP_BASELINE_C
    # Sigmoid-like cap: normalise to 15 °C excess → 1.0 before scaling
    temp_norm = min(temp_excess / 15.0, 1.0)
    # Humidity amplifier: linear from 0.5 (dry) to 1.0 (fully saturated)
    humidity_amp = 0.5 + 0.5 * (humidity_pct / 100.0)
    return min(temp_norm * humidity_amp * pressing_intensity, 1.0)


def _heat_factor(
    temperature_c: float,
    humidity_pct: float,
    pressing_intensity: float,
) -> float:
    """Multiplicative heat factor in (0, 1] for a team.

    Uses :func:`_heat_stress` and scales by ``_HEAT_MAX_PENALTY``.

    Args:
        temperature_c: Ambient temperature (°C).
        humidity_pct: Relative humidity (0-100).
        pressing_intensity: Team pressing intensity (0-1).

    Returns:
        Float in (0, 1].  Returns 1.0 when temp ≤ baseline.
    """
    stress = _heat_stress(temperature_c, humidity_pct, pressing_intensity)
    return 1.0 - stress * _HEAT_MAX_PENALTY


def _travel_factor(travel_km: float) -> float:
    """Multiplicative factor penalising teams that travelled more than 2000 km.

    The boundary is exclusive: exactly 2000 km incurs *no* penalty; any
    distance strictly greater than 2000 km incurs the flat penalty.

    Args:
        travel_km: Distance the team travelled to the venue (km).

    Returns:
        ``1.0 - _TRAVEL_PENALTY`` for travel_km > 2000, else ``1.0``.
    """
    return (1.0 - _TRAVEL_PENALTY) if travel_km > _TRAVEL_THRESHOLD_KM else 1.0


def _rest_factor(team_rest_days: int, opponent_rest_days: int) -> float:
    """Multiplicative factor based on rest-day asymmetry relative to the opponent.

    A team with fewer rest days than its opponent is penalised; a team with
    more rest days gains a small boost (capped at the neutral point to avoid
    over-rewarding).

    The reference point is ``_REST_NEUTRAL_DAYS``.  The factor uses the
    team's own rest days vs the neutral, bounded so that extra rest beyond
    neutral yields no further change (the gain is already captured by the
    opponent's penalty in symmetrical use).

    Args:
        team_rest_days: Rest days for this team.
        opponent_rest_days: Rest days for the opposing team (used to derive
            relative disadvantage).

    Returns:
        Float > 0.  Equals 1.0 when both teams have equal rest.
    """
    # Compute rest delta relative to opponent
    delta = team_rest_days - opponent_rest_days
    if delta >= 0:
        return 1.0  # no penalty when team has same or more rest
    penalty = abs(delta) * _REST_PENALTY_PER_DAY
    return max(1.0 - penalty, 0.01)


def _validate_base_probs(base_probs: dict[str, float]) -> None:
    """Raise ``ValueError`` if *base_probs* is structurally invalid.

    Args:
        base_probs: Dict to validate.

    Raises:
        ValueError: If a required key is missing or any value is negative.
    """
    required = {"home_win", "draw", "away_win"}
    missing = required - base_probs.keys()
    if missing:
        raise ValueError(f"base_probs missing required keys: {missing}")
    for key, value in base_probs.items():
        if value < 0:
            raise ValueError(f"base_probs[{key!r}] is negative: {value}")
