from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np


@dataclass
class OODResult:
    """Result from OOD detection."""

    ensemble_score: float  # Combined score from all detectors
    component_scores: Dict[str, float]  # Individual detector scores
    is_ood: bool  # Whether classified as OOD
    contributing_detector: str  # Detector most responsible for OOD detection
    threshold: float  # Threshold used for classification


class BaseOODDetector(ABC):
    """Abstract base class for Out-of-Distribution detectors."""

    def __init__(self, name: str = "base"):
        self.name = name

    @abstractmethod
    def score(self, inputs: np.ndarray) -> float:
        """
        Compute anomaly score. Higher means more likely OOD.

        Args:
            inputs: (N, ...) input data (features/embeddings).

        Returns:
            Scalar score (averaged or max over batch depending on implementation,
            but typically this runs on single sample in runtime loop).
        """
        pass

    def fit(self, data: np.ndarray, labels: Optional[np.ndarray] = None) -> None:
        """
        Fit the detector on training data. Override in subclasses if needed.

        Args:
            data: Training data
            labels: Optional labels
        """
        pass


class MahalanobisDetector(BaseOODDetector):
    """
    Simple Mahalanobis distance based detector.
    Requires pre-computed mean and covariance from training data.
    """

    def __init__(
        self,
        mean: Optional[np.ndarray] = None,
        precision: Optional[np.ndarray] = None,
        name: str = "mahalanobis",
    ):
        super().__init__(name)
        self.mean = mean
        self.precision = precision
        self._fitted = mean is not None and precision is not None

    def fit(self, data: np.ndarray, labels: Optional[np.ndarray] = None) -> None:
        """Fit from data by computing mean and precision matrix."""
        self.mean = np.mean(data, axis=0)
        cov = np.cov(data.T)
        # Add regularization for numerical stability
        cov = cov + 1e-6 * np.eye(cov.shape[0])
        self.precision = np.linalg.inv(cov)
        self._fitted = True

    def score(self, inputs: np.ndarray) -> float:
        """
        Compute (x-mu)^T Sigma^-1 (x-mu).
        """
        if not self._fitted:
            raise RuntimeError("Detector not fitted. Call fit() first.")

        if inputs.ndim == 1:
            diff = inputs - self.mean
            return float(np.sqrt(np.dot(np.dot(diff, self.precision), diff)))
        else:
            # Batch mode
            scores = []
            for x in inputs:
                diff = x - self.mean
                scores.append(np.sqrt(np.dot(np.dot(diff, self.precision), diff)))
            return float(np.mean(scores))


class EnergyBasedDetector(BaseOODDetector):
    """
    Energy-based OOD detector.

    Uses the energy score: -T * log(sum(exp(logits/T)))
    Lower energy = more in-distribution.
    """

    def __init__(self, temperature: float = 1.0, name: str = "energy"):
        super().__init__(name)
        self.temperature = temperature

    def score(self, inputs: np.ndarray) -> float:
        """
        Compute negative energy score (higher = more OOD).

        Args:
            inputs: Logits or pre-softmax outputs (N, C)

        Returns:
            Negative energy score (higher = more OOD)
        """
        inputs = np.asarray(inputs)
        if inputs.ndim == 1:
            inputs = inputs.reshape(1, -1)

        # Energy = -T * log(sum(exp(logits/T)))
        scaled = inputs / self.temperature
        # Use logsumexp for numerical stability
        max_val = np.max(scaled, axis=1, keepdims=True)
        energy = -self.temperature * (
            max_val.flatten() + np.log(np.sum(np.exp(scaled - max_val), axis=1))
        )

        # Return negative energy (higher = more OOD)
        # In-distribution samples have lower (more negative) energy
        return float(np.mean(energy))


class LabelShiftDetector(BaseOODDetector):
    """
    Label shift detector using KL divergence.

    Detects when the prediction distribution differs from
    the training distribution, indicating label/prior shift.
    """

    def __init__(
        self,
        reference_distribution: Optional[np.ndarray] = None,
        name: str = "label_shift",
    ):
        super().__init__(name)
        self.reference_distribution = reference_distribution
        self._n_classes = 0

    def fit(self, data: np.ndarray, labels: Optional[np.ndarray] = None) -> None:
        """
        Fit reference distribution from training labels.

        Args:
            data: Not used
            labels: Training labels (N,)
        """
        if labels is None:
            raise ValueError("LabelShiftDetector requires labels for fitting")

        unique, counts = np.unique(labels, return_counts=True)
        self._n_classes = len(unique)
        self.reference_distribution = counts / counts.sum()

    def score(self, inputs: np.ndarray) -> float:
        """
        Compute KL divergence from reference distribution.

        Args:
            inputs: Prediction probabilities (N, C) or predicted labels (N,)

        Returns:
            KL divergence score (higher = more shift)
        """
        if self.reference_distribution is None:
            raise RuntimeError("Detector not fitted. Call fit() first.")

        inputs = np.asarray(inputs)

        # If inputs are predictions, compute empirical distribution
        if inputs.ndim == 2:
            # Softmax predictions - compute mean
            current_dist = np.mean(inputs, axis=0)
        else:
            # Predicted labels - compute histogram
            unique, counts = np.unique(inputs, return_counts=True)
            current_dist = np.zeros(self._n_classes)
            for u, c in zip(unique, counts):
                if u < self._n_classes:
                    current_dist[int(u)] = c
            current_dist = current_dist / (current_dist.sum() + 1e-10)

        # Ensure same size
        ref = self.reference_distribution
        if len(current_dist) != len(ref):
            # Pad with zeros if needed
            max_len = max(len(current_dist), len(ref))
            current_dist = np.pad(current_dist, (0, max_len - len(current_dist)))
            ref = np.pad(ref, (0, max_len - len(ref)))

        # Compute KL divergence: sum(p * log(p/q))
        eps = 1e-10
        current_dist = np.clip(current_dist, eps, 1)
        ref = np.clip(ref, eps, 1)
        kl_div = np.sum(current_dist * np.log(current_dist / ref))

        return float(kl_div)


class DynamicsResidualDetector(BaseOODDetector):
    """
    Dynamics shift detector using prediction residuals.

    Detects when a dynamics model's predictions diverge from
    observations, indicating environment dynamics shift.
    """

    def __init__(
        self,
        residual_threshold: float = 1.0,
        name: str = "dynamics_residual",
    ):
        super().__init__(name)
        self.residual_threshold = residual_threshold
        self._mean_residual = 0.0
        self._std_residual = 1.0

    def fit(self, data: np.ndarray, labels: Optional[np.ndarray] = None) -> None:
        """
        Fit from historical residuals.

        Args:
            data: Historical residuals (N, D)
            labels: Not used
        """
        residual_norms = np.linalg.norm(data, axis=-1) if data.ndim > 1 else np.abs(data)
        self._mean_residual = float(np.mean(residual_norms))
        self._std_residual = float(np.std(residual_norms)) + 1e-6

    def score(self, inputs: np.ndarray) -> float:
        """
        Compute normalized residual score.

        Args:
            inputs: Current residual(s) (D,) or (N, D)

        Returns:
            Z-score of residual magnitude
        """
        inputs = np.asarray(inputs)
        if inputs.ndim == 1:
            residual_norm = float(np.linalg.norm(inputs))
        else:
            residual_norm = float(np.mean(np.linalg.norm(inputs, axis=-1)))

        # Return z-score
        z_score = (residual_norm - self._mean_residual) / self._std_residual
        return max(0.0, z_score)  # Only positive z-scores indicate OOD


class OODEnsemble:
    """
    Ensemble of OOD detectors with weighted combination.

    Combines multiple detection methods for robust OOD detection.
    """

    def __init__(
        self,
        detectors: List[BaseOODDetector],
        weights: Optional[List[float]] = None,
        threshold: float = 0.5,
        combination_method: str = "weighted_mean",  # or "max", "vote"
    ):
        """
        Initialize OOD ensemble.

        Args:
            detectors: List of OOD detectors
            weights: Weights for each detector (defaults to uniform)
            threshold: Threshold for OOD classification
            combination_method: How to combine scores
        """
        self.detectors = detectors
        self.weights = weights or [1.0 / len(detectors)] * len(detectors)
        self.threshold = threshold
        self.combination_method = combination_method

        if len(self.weights) != len(detectors):
            raise ValueError("Number of weights must match number of detectors")

        # Normalize weights
        weight_sum = sum(self.weights)
        self.weights = [w / weight_sum for w in self.weights]

    def score(
        self,
        inputs: np.ndarray,
        predictions: Optional[np.ndarray] = None,
        dynamics_residual: Optional[np.ndarray] = None,
    ) -> OODResult:
        """
        Compute ensemble OOD score.

        Args:
            inputs: Input features/embeddings
            predictions: Model predictions (for label shift detector)
            dynamics_residual: Dynamics model residual (for dynamics detector)

        Returns:
            OODResult with ensemble and component scores.
        """
        component_scores: Dict[str, float] = {}
        weighted_scores: List[Tuple[float, float]] = []  # (weight, score)

        for detector, weight in zip(self.detectors, self.weights):
            try:
                if isinstance(detector, LabelShiftDetector) and predictions is not None:
                    score = detector.score(predictions)
                elif (
                    isinstance(detector, DynamicsResidualDetector) and dynamics_residual is not None
                ):
                    score = detector.score(dynamics_residual)
                else:
                    score = detector.score(inputs)

                component_scores[detector.name] = score
                weighted_scores.append((weight, score))
            except Exception:
                # Graceful degradation - skip failed detectors
                component_scores[detector.name] = 0.0
                weighted_scores.append((0.0, 0.0))

        # Combine scores
        if self.combination_method == "weighted_mean":
            total_weight = sum(w for w, _ in weighted_scores)
            if total_weight > 0:
                ensemble_score = sum(w * s for w, s in weighted_scores) / total_weight
            else:
                ensemble_score = 0.0
        elif self.combination_method == "max":
            ensemble_score = max(s for _, s in weighted_scores) if weighted_scores else 0.0
        elif self.combination_method == "vote":
            votes = sum(1 for _, s in weighted_scores if s > self.threshold)
            ensemble_score = votes / len(self.detectors)
        else:
            ensemble_score = sum(w * s for w, s in weighted_scores)

        # Determine contributing detector
        if component_scores:
            contributing = max(component_scores.keys(), key=lambda k: component_scores[k])
        else:
            contributing = "none"

        is_ood = ensemble_score > self.threshold

        return OODResult(
            ensemble_score=float(ensemble_score),
            component_scores=component_scores,
            is_ood=is_ood,
            contributing_detector=contributing,
            threshold=self.threshold,
        )

    def calibrate_threshold(
        self,
        validation_scores: np.ndarray,
        target_fpr: float = 0.05,
    ) -> float:
        """
        Auto-calibrate threshold from validation OOD data.

        Args:
            validation_scores: Ensemble scores on validation OOD data
            target_fpr: Target false positive rate

        Returns:
            Calibrated threshold.
        """
        # Set threshold at (1 - target_fpr) percentile of in-distribution scores
        self.threshold = float(np.percentile(validation_scores, 100 * (1 - target_fpr)))
        return self.threshold
