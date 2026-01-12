"""
Conformal Prediction Engine for calibrated uncertainty quantification.

Provides split-conformal, adaptive conformal prediction (ACI), and
mondrian (class-conditional) conformal prediction methods with
guaranteed coverage properties.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Dict
import uuid
import threading

import numpy as np


@dataclass
class ConformalConfig:
    """Configuration for conformal prediction."""

    coverage: float = 0.9  # Target coverage probability (e.g., 0.9 = 90%)
    min_calibration_size: int = 100  # Minimum samples for valid calibration
    score_clip_percentile: float = 99.0  # Clip extreme nonconformity scores


@dataclass
class ConformalResult:
    """Result from conformal prediction."""

    prediction_set: List[int]  # Set of class indices in the prediction set
    set_size: int  # Size of the prediction set
    coverage_probability: float  # Target coverage probability used
    quantile: float  # Nonconformity quantile threshold
    is_valid: bool = True  # Whether calibration was valid
    message: str = ""


@dataclass
class CalibrationData:
    """Stored calibration data for conformal prediction."""

    calibration_id: str
    quantile: float
    coverage: float
    n_samples: int
    method: str
    class_quantiles: Optional[Dict[int, float]] = None  # For mondrian conformal
    created_at: float = 0.0


class BaseConformalPredictor(ABC):
    """Abstract base class for conformal predictors."""

    def __init__(self, config: ConformalConfig):
        self.config = config

    @abstractmethod
    def fit(self, nonconformity_scores: np.ndarray, labels: Optional[np.ndarray] = None) -> str:
        """
        Fit the conformal predictor on calibration data.

        Args:
            nonconformity_scores: (N,) or (N, C) array of nonconformity scores
            labels: (N,) array of true class labels (optional, required for Mondrian)

        Returns:
            Calibration ID for later retrieval.
        """
        pass

    @abstractmethod
    def predict(self, scores: np.ndarray) -> List[ConformalResult]:
        """
        Generate prediction sets for new samples.

        Args:
            scores: (N, C) array of nonconformity scores per class

        Returns:
            List of ConformalResult for each sample.
        """
        pass


def compute_quantile(scores: np.ndarray, coverage: float) -> float:
    """
    Compute the (1 - coverage) quantile of nonconformity scores.

    For split conformal, we use the (1 - alpha)(1 + 1/n) quantile
    to ensure finite-sample coverage guarantee.

    Args:
        scores: (N,) array of nonconformity scores
        coverage: Target coverage probability (e.g., 0.9)

    Returns:
        Quantile threshold.
    """
    n = len(scores)
    if n == 0:
        return float("inf")

    # Adjusted quantile for finite-sample guarantee
    alpha = 1 - coverage
    adjusted_level = min((1 - alpha) * (1 + 1 / n), 1.0)

    return float(np.quantile(scores, adjusted_level))


class SplitConformalPredictor(BaseConformalPredictor):
    """
    Split Conformal Prediction for exchangeable data.

    Uses a held-out calibration set to compute nonconformity score quantiles,
    then applies to new predictions.
    """

    def __init__(self, config: Optional[ConformalConfig] = None):
        super().__init__(config or ConformalConfig())
        self._lock = threading.Lock()
        self._calibration: Optional[CalibrationData] = None

    def fit(self, nonconformity_scores: np.ndarray, labels: Optional[np.ndarray] = None) -> str:
        """
        Fit the split conformal predictor.

        Args:
            nonconformity_scores: (N,) array of nonconformity scores for calibration set
            labels: Not used for split conformal

        Returns:
            Calibration ID.
        """
        scores = np.asarray(nonconformity_scores).flatten()

        if len(scores) < self.config.min_calibration_size:
            raise ValueError(
                f"Insufficient calibration samples: {len(scores)} < {self.config.min_calibration_size}"
            )

        # Clip extreme scores for robustness
        clip_value = np.percentile(scores, self.config.score_clip_percentile)
        scores = np.clip(scores, None, clip_value)

        quantile = compute_quantile(scores, self.config.coverage)

        with self._lock:
            self._calibration = CalibrationData(
                calibration_id=str(uuid.uuid4()),
                quantile=quantile,
                coverage=self.config.coverage,
                n_samples=len(scores),
                method="split_conformal",
                created_at=float(np.datetime64("now", "s").astype(float)),
            )

        return self._calibration.calibration_id

    def predict(self, scores: np.ndarray) -> List[ConformalResult]:
        """
        Generate prediction sets using split conformal prediction.

        Args:
            scores: (N, C) array of nonconformity scores per class
                   Lower scores indicate higher conformity (more likely class)

        Returns:
            List of ConformalResult for each sample.
        """
        with self._lock:
            if self._calibration is None:
                return [
                    ConformalResult(
                        prediction_set=[],
                        set_size=0,
                        coverage_probability=self.config.coverage,
                        quantile=float("inf"),
                        is_valid=False,
                        message="Predictor not calibrated. Call fit() first.",
                    )
                ]

            quantile = self._calibration.quantile
            coverage = self._calibration.coverage

        scores = np.asarray(scores)
        if scores.ndim == 1:
            scores = scores.reshape(1, -1)

        results = []
        for sample_scores in scores:
            # Include all classes with scores below quantile
            prediction_set = np.where(sample_scores <= quantile)[0].tolist()

            results.append(
                ConformalResult(
                    prediction_set=prediction_set,
                    set_size=len(prediction_set),
                    coverage_probability=coverage,
                    quantile=quantile,
                    is_valid=True,
                )
            )

        return results

    def get_calibration(self) -> Optional[CalibrationData]:
        """Get the current calibration data."""
        with self._lock:
            return self._calibration


class AdaptiveConformalPredictor(BaseConformalPredictor):
    """
    Adaptive Conformal Inference (ACI) for distribution shift.

    Dynamically adjusts the quantile based on observed coverage
    to maintain target coverage under covariate shift.
    """

    def __init__(
        self,
        config: Optional[ConformalConfig] = None,
        gamma: float = 0.01,  # Learning rate for quantile update
    ):
        super().__init__(config or ConformalConfig())
        self._lock = threading.Lock()
        self._quantile: float = 0.0
        self._gamma = gamma
        self._n_updates = 0
        self._coverage_history: List[float] = []

    def fit(self, nonconformity_scores: np.ndarray, labels: Optional[np.ndarray] = None) -> str:
        """
        Initialize the adaptive predictor with calibration data.

        Args:
            nonconformity_scores: (N,) initial calibration scores
            labels: Not used

        Returns:
            Calibration ID.
        """
        scores = np.asarray(nonconformity_scores).flatten()

        if len(scores) < self.config.min_calibration_size:
            raise ValueError(
                f"Insufficient calibration samples: {len(scores)} < {self.config.min_calibration_size}"
            )

        # Initialize quantile from calibration set
        initial_quantile = compute_quantile(scores, self.config.coverage)

        with self._lock:
            self._quantile = initial_quantile
            self._n_updates = 0
            self._coverage_history = []

        return str(uuid.uuid4())

    def update(self, true_label: int, prediction_set: List[int]) -> None:
        """
        Update quantile based on observed coverage.

        Args:
            true_label: The true class label
            prediction_set: The prediction set that was generated
        """
        covered = true_label in prediction_set
        target = self.config.coverage

        with self._lock:
            # ACI update rule: increase quantile if under-covering, decrease if over-covering
            if covered:
                self._quantile -= self._gamma * (1 - target)
            else:
                self._quantile += self._gamma * target

            self._quantile = max(0.0, self._quantile)  # Keep non-negative
            self._n_updates += 1
            self._coverage_history.append(float(covered))

    def predict(self, scores: np.ndarray) -> List[ConformalResult]:
        """
        Generate prediction sets using current adaptive quantile.

        Args:
            scores: (N, C) array of nonconformity scores per class

        Returns:
            List of ConformalResult.
        """
        with self._lock:
            quantile = self._quantile

        scores = np.asarray(scores)
        if scores.ndim == 1:
            scores = scores.reshape(1, -1)

        results = []
        for sample_scores in scores:
            prediction_set = np.where(sample_scores <= quantile)[0].tolist()

            results.append(
                ConformalResult(
                    prediction_set=prediction_set,
                    set_size=len(prediction_set),
                    coverage_probability=self.config.coverage,
                    quantile=quantile,
                    is_valid=True,
                )
            )

        return results

    def get_running_coverage(self, window: int = 100) -> float:
        """Get the running coverage over recent predictions."""
        with self._lock:
            if not self._coverage_history:
                return 0.0
            recent = self._coverage_history[-window:]
            return float(np.mean(recent))


class MondrianConformalPredictor(BaseConformalPredictor):
    """
    Mondrian Conformal Prediction for class-conditional coverage.

    Provides separate coverage guarantees for each class, useful when
    different classes have different nonconformity score distributions.
    """

    def __init__(self, config: Optional[ConformalConfig] = None):
        super().__init__(config or ConformalConfig())
        self._lock = threading.Lock()
        self._class_quantiles: Dict[int, float] = {}
        self._n_classes = 0

    def fit(self, nonconformity_scores: np.ndarray, labels: Optional[np.ndarray] = None) -> str:
        """
        Fit class-conditional quantiles.

        Args:
            nonconformity_scores: (N,) nonconformity scores
            labels: (N,) true class labels - REQUIRED for Mondrian

        Returns:
            Calibration ID.
        """
        if labels is None:
            raise ValueError("Mondrian conformal requires labels for class-conditional calibration")

        scores = np.asarray(nonconformity_scores).flatten()
        labels = np.asarray(labels).flatten()

        if len(scores) != len(labels):
            raise ValueError("Scores and labels must have same length")

        unique_classes = np.unique(labels)
        class_quantiles: Dict[int, float] = {}

        for cls in unique_classes:
            cls_mask = labels == cls
            cls_scores = scores[cls_mask]

            if len(cls_scores) < 10:  # Minimum per-class samples
                # Use global quantile as fallback
                class_quantiles[int(cls)] = compute_quantile(scores, self.config.coverage)
            else:
                class_quantiles[int(cls)] = compute_quantile(cls_scores, self.config.coverage)

        with self._lock:
            self._class_quantiles = class_quantiles
            self._n_classes = len(unique_classes)

        return str(uuid.uuid4())

    def predict(
        self, scores: np.ndarray, class_indices: Optional[np.ndarray] = None
    ) -> List[ConformalResult]:
        """
        Generate prediction sets using class-conditional quantiles.

        Args:
            scores: (N, C) nonconformity scores per class
            class_indices: (N,) optional class predictions for quantile lookup

        Returns:
            List of ConformalResult.
        """
        with self._lock:
            if not self._class_quantiles:
                return [
                    ConformalResult(
                        prediction_set=[],
                        set_size=0,
                        coverage_probability=self.config.coverage,
                        quantile=float("inf"),
                        is_valid=False,
                        message="Predictor not calibrated. Call fit() first.",
                    )
                ]

            class_quantiles = self._class_quantiles.copy()

        scores = np.asarray(scores)
        if scores.ndim == 1:
            scores = scores.reshape(1, -1)

        n_classes = scores.shape[1]
        results = []

        for i, sample_scores in enumerate(scores):
            prediction_set = []

            for cls in range(n_classes):
                # Get quantile for this class, fallback to global if not available
                quantile = class_quantiles.get(cls, np.mean(list(class_quantiles.values())))

                if sample_scores[cls] <= quantile:
                    prediction_set.append(cls)

            avg_quantile = (
                np.mean([class_quantiles.get(cls, 0.0) for cls in prediction_set])
                if prediction_set
                else 0.0
            )

            results.append(
                ConformalResult(
                    prediction_set=prediction_set,
                    set_size=len(prediction_set),
                    coverage_probability=self.config.coverage,
                    quantile=float(avg_quantile),
                    is_valid=True,
                )
            )

        return results


class ConformalCalibrationStore:
    """Thread-safe storage for conformal calibration data."""

    def __init__(self, max_calibrations: int = 100):
        self._lock = threading.Lock()
        self._calibrations: Dict[str, CalibrationData] = {}
        self._max_calibrations = max_calibrations

    def store(self, calibration: CalibrationData) -> None:
        """Store a calibration."""
        with self._lock:
            if len(self._calibrations) >= self._max_calibrations:
                # Remove oldest
                oldest_id = min(
                    self._calibrations.keys(), key=lambda k: self._calibrations[k].created_at
                )
                del self._calibrations[oldest_id]

            self._calibrations[calibration.calibration_id] = calibration

    def get(self, calibration_id: str) -> Optional[CalibrationData]:
        """Retrieve a calibration by ID."""
        with self._lock:
            return self._calibrations.get(calibration_id)

    def list_calibrations(self) -> List[str]:
        """List all calibration IDs."""
        with self._lock:
            return list(self._calibrations.keys())


def compute_nonconformity_scores(
    ensemble_probs: np.ndarray, method: str = "one_minus_prob"
) -> np.ndarray:
    """
    Compute nonconformity scores from ensemble predictions.

    Args:
        ensemble_probs: (K, N, C) probabilities from K ensemble members
        method: Scoring method - "one_minus_prob" or "entropy"

    Returns:
        (N, C) nonconformity scores per sample and class.
    """
    # Average across ensemble
    mean_probs = np.mean(ensemble_probs, axis=0)  # (N, C)

    if method == "one_minus_prob":
        # Simple: 1 - probability (lower conformity for lower prob)
        return 1.0 - mean_probs
    elif method == "entropy":
        # Use negative log probability
        eps = 1e-15
        return -np.log(np.clip(mean_probs, eps, 1 - eps))
    else:
        raise ValueError(f"Unknown nonconformity method: {method}")
