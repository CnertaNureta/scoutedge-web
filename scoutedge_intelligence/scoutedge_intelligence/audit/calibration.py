"""Probability calibration tools for 1X2 football predictions.

Provides Platt (sigmoid) scaling and isotonic regression calibrators that
map raw model probabilities to empirically-grounded frequencies.  A
``reliability_curve_data`` helper and a ``calibration_summary`` function
expose post-hoc diagnostics.

Typical usage::

    calibrator = PlattCalibrator().fit(raw_preds, actuals)
    calibrated = calibrator.transform(raw_preds)
    summary = calibration_summary(raw_preds, calibrated, actuals)
"""

from __future__ import annotations

import numpy as np
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression

from scoutedge_intelligence.audit.metrics import (
    OUTCOMES,
    _validate_actual,
    _validate_prob_dict,
    aggregate_brier,
    expected_calibration_error,
)

# ---------------------------------------------------------------------------
# Types & constants
# ---------------------------------------------------------------------------

ProbDict = dict[str, float]

_MIN_SAMPLES: int = 20

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _validate_inputs(predicted: list[ProbDict], actual: list[str]) -> None:
    """Validate predicted/actual lists for calibration use."""
    if len(predicted) != len(actual):
        raise ValueError(
            f"predicted and actual must have equal length, got {len(predicted)} vs {len(actual)}"
        )
    if len(predicted) < _MIN_SAMPLES:
        raise ValueError(
            f"insufficient data for calibration: need >= {_MIN_SAMPLES} samples, "
            f"got {len(predicted)}"
        )
    for pred_dict, act in zip(predicted, actual, strict=True):
        _validate_prob_dict(pred_dict)
        _validate_actual(act)


def _extract_class_arrays(
    predicted: list[ProbDict],
    actual: list[str],
    outcome: str,
) -> tuple[
    np.ndarray[tuple[int], np.dtype[np.float64]], np.ndarray[tuple[int], np.dtype[np.float64]]
]:
    """Return (prob_column, binary_label) arrays for a single outcome class."""
    probs = np.array([p[outcome] for p in predicted], dtype=np.float64)
    labels = np.array([1.0 if a == outcome else 0.0 for a in actual], dtype=np.float64)
    return probs, labels


def _renormalise(prob_dict: ProbDict) -> ProbDict:
    """Return a new ProbDict whose values sum to 1.0."""
    total = sum(prob_dict.values())
    if total <= 0.0:
        # Uniform fallback -- should not happen in practice
        n = len(prob_dict)
        uniform = 1.0 / n
        return dict.fromkeys(prob_dict, uniform)
    return {k: v / total for k, v in prob_dict.items()}


# ---------------------------------------------------------------------------
# PlattCalibrator
# ---------------------------------------------------------------------------


class PlattCalibrator:
    """Per-class Platt (sigmoid) scaling calibrator.

    Fits one logistic regression per outcome class in a 1-vs-rest fashion.
    Each logistic regression maps the raw predicted probability for that class
    to a calibrated probability.  After transform, the three per-class outputs
    are renormalised to sum to 1.0.
    """

    def __init__(self) -> None:
        self._models: dict[str, LogisticRegression] = {}
        self._fitted: bool = False

    def fit(self, predicted: list[ProbDict], actual: list[str]) -> PlattCalibrator:
        """Fit one logistic regression per outcome class.

        Parameters
        ----------
        predicted:
            Raw model probability dicts.
        actual:
            Realised outcomes, one per prediction.

        Returns
        -------
        PlattCalibrator
            Self, to enable method chaining.

        Raises
        ------
        ValueError
            If inputs are invalid or fewer than 20 samples are provided.
        """
        _validate_inputs(predicted, actual)

        self._models = {}
        for outcome in OUTCOMES:
            probs, labels = _extract_class_arrays(predicted, actual, outcome)
            x_col = probs.reshape(-1, 1)
            model = LogisticRegression(
                C=1e10,  # Near-unregularised -- let the data speak
                solver="lbfgs",
                max_iter=1000,
                random_state=0,
            )
            model.fit(x_col, labels)
            self._models[outcome] = model

        self._fitted = True
        return self

    def transform(self, predicted: list[ProbDict]) -> list[ProbDict]:
        """Apply calibration to a list of raw probability dicts.

        Parameters
        ----------
        predicted:
            Raw model probability dicts (must have the 3 standard keys).

        Returns
        -------
        list[ProbDict]
            Calibrated probability dicts, each summing to 1.0.

        Raises
        ------
        RuntimeError
            If called before :meth:`fit`.
        """
        if not self._fitted:
            raise RuntimeError("calibrator not fitted")

        results: list[ProbDict] = []
        for pred_dict in predicted:
            _validate_prob_dict(pred_dict)
            raw: ProbDict = {}
            for outcome in OUTCOMES:
                x = np.array([[pred_dict[outcome]]])
                # Index [0, 1] gives P(class=1)
                raw[outcome] = float(self._models[outcome].predict_proba(x)[0, 1])
            results.append(_renormalise(raw))
        return results

    def is_fitted(self) -> bool:
        """Return ``True`` if the calibrator has been fitted."""
        return self._fitted


# ---------------------------------------------------------------------------
# IsotonicCalibrator
# ---------------------------------------------------------------------------


class IsotonicCalibrator:
    """Per-class isotonic regression calibrator.

    Fits one monotone isotonic regression per outcome class.  After
    transform, the three per-class outputs are renormalised to sum to 1.0.
    """

    def __init__(self) -> None:
        self._models: dict[str, IsotonicRegression] = {}
        self._fitted: bool = False

    def fit(self, predicted: list[ProbDict], actual: list[str]) -> IsotonicCalibrator:
        """Fit one isotonic regression per outcome class.

        Parameters
        ----------
        predicted:
            Raw model probability dicts.
        actual:
            Realised outcomes, one per prediction.

        Returns
        -------
        IsotonicCalibrator
            Self, to enable method chaining.

        Raises
        ------
        ValueError
            If inputs are invalid or fewer than 20 samples are provided.
        """
        _validate_inputs(predicted, actual)

        self._models = {}
        for outcome in OUTCOMES:
            probs, labels = _extract_class_arrays(predicted, actual, outcome)
            model = IsotonicRegression(out_of_bounds="clip")
            model.fit(probs, labels)
            self._models[outcome] = model

        self._fitted = True
        return self

    def transform(self, predicted: list[ProbDict]) -> list[ProbDict]:
        """Apply calibration to a list of raw probability dicts.

        Parameters
        ----------
        predicted:
            Raw model probability dicts (must have the 3 standard keys).

        Returns
        -------
        list[ProbDict]
            Calibrated probability dicts, each summing to 1.0.

        Raises
        ------
        RuntimeError
            If called before :meth:`fit`.
        """
        if not self._fitted:
            raise RuntimeError("calibrator not fitted")

        results: list[ProbDict] = []
        for pred_dict in predicted:
            _validate_prob_dict(pred_dict)
            raw: ProbDict = {}
            for outcome in OUTCOMES:
                x = np.array([pred_dict[outcome]])
                raw[outcome] = float(self._models[outcome].predict(x)[0])
            results.append(_renormalise(raw))
        return results

    def is_fitted(self) -> bool:
        """Return ``True`` if the calibrator has been fitted."""
        return self._fitted


# ---------------------------------------------------------------------------
# reliability_curve_data
# ---------------------------------------------------------------------------


def reliability_curve_data(
    predicted: list[ProbDict],
    actual: list[str],
    *,
    outcome: str = "home_win",
    n_bins: int = 10,
) -> dict[str, np.ndarray[tuple[int], np.dtype[np.generic]]]:
    """Reliability curve data for a single chosen outcome class.

    Unlike ``metrics.reliability_curve`` which operates on the top-predicted
    class, this function focuses on a *specific* outcome regardless of which
    class the model predicts with highest confidence.

    Parameters
    ----------
    predicted:
        List of valid 1X2 probability dicts.
    actual:
        List of realised outcomes, same length as *predicted*.
    outcome:
        The class of interest (one of ``OUTCOMES``).
    n_bins:
        Number of equal-width bins spanning [0, 1].

    Returns
    -------
    dict with keys:
        ``bin_centers``   - midpoint of each bin (np.ndarray, shape (n_bins,))
        ``bin_predicted`` - mean predicted probability in each bin (NaN if empty)
        ``bin_empirical`` - empirical frequency in each bin (NaN if empty)
        ``bin_count``     - number of samples in each bin

    Raises
    ------
    ValueError
        If *outcome* is not in OUTCOMES, or inputs are invalid.
    """
    if outcome not in OUTCOMES:
        raise ValueError(f"outcome must be one of {OUTCOMES}, got {outcome!r}")

    _validate_inputs(predicted, actual)

    probs, labels = _extract_class_arrays(predicted, actual, outcome)

    bin_edges = np.linspace(0.0, 1.0, n_bins + 1)
    bin_centers = 0.5 * (bin_edges[:-1] + bin_edges[1:])
    bin_predicted = np.full(n_bins, np.nan, dtype=np.float64)
    bin_empirical = np.full(n_bins, np.nan, dtype=np.float64)
    bin_count = np.zeros(n_bins, dtype=np.int64)

    for b in range(n_bins):
        lo, hi = bin_edges[b], bin_edges[b + 1]
        mask = (probs >= lo) & (probs < hi) if b < n_bins - 1 else (probs >= lo) & (probs <= hi)

        count = int(mask.sum())
        bin_count[b] = count
        if count > 0:
            bin_predicted[b] = float(probs[mask].mean())
            bin_empirical[b] = float(labels[mask].mean())

    return {
        "bin_centers": bin_centers,
        "bin_predicted": bin_predicted,
        "bin_empirical": bin_empirical,
        "bin_count": bin_count,
    }


# ---------------------------------------------------------------------------
# calibration_summary
# ---------------------------------------------------------------------------


def calibration_summary(
    raw_predicted: list[ProbDict],
    calibrated_predicted: list[ProbDict],
    actual: list[str],
) -> dict[str, float]:
    """Compute improvement statistics comparing raw and calibrated predictions.

    Uses :func:`scoutedge_intelligence.audit.metrics.aggregate_brier` for
    Brier scores and
    :func:`scoutedge_intelligence.audit.metrics.expected_calibration_error`
    for ECE.

    Parameters
    ----------
    raw_predicted:
        Original (uncalibrated) probability dicts.
    calibrated_predicted:
        Calibrated probability dicts from a fitted calibrator.
    actual:
        Realised outcomes.

    Returns
    -------
    dict with keys:
        ``raw_brier``         - mean Brier score for raw predictions
        ``calibrated_brier``  - mean Brier score for calibrated predictions
        ``raw_ece``           - ECE for raw predictions
        ``calibrated_ece``    - ECE for calibrated predictions
        ``improvement_brier`` - raw_brier - calibrated_brier (positive = better)
        ``improvement_ece``   - raw_ece - calibrated_ece (positive = better)

    Raises
    ------
    ValueError
        If any input list is invalid.
    """
    raw_brier = aggregate_brier(raw_predicted, actual)["mean"]
    calibrated_brier = aggregate_brier(calibrated_predicted, actual)["mean"]
    raw_ece = expected_calibration_error(raw_predicted, actual)
    calibrated_ece = expected_calibration_error(calibrated_predicted, actual)

    return {
        "raw_brier": raw_brier,
        "calibrated_brier": calibrated_brier,
        "raw_ece": raw_ece,
        "calibrated_ece": calibrated_ece,
        "improvement_brier": raw_brier - calibrated_brier,
        "improvement_ece": raw_ece - calibrated_ece,
    }
