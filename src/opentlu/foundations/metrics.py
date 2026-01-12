import numpy as np


def brier_score(probs: np.ndarray, targets: np.ndarray) -> float:
    """
    Compute Brier score (mean squared error of probability predictions).

    Args:
        probs: Predicted probabilities (N, C) or (N,).
        targets: One-hot targets (N, C) or binary targets (N,).

    Returns:
        Scalar Brier score.
    """
    return float(np.mean(np.square(probs - targets)))


def expected_calibration_error(probs: np.ndarray, labels: np.ndarray, n_bins: int = 10) -> float:
    """
    Compute Expected Calibration Error (ECE) for classification.

    Args:
        probs: Predicted probabilities for the positive class (binary) or max prob (multiclass), shape (N,).
        labels: True labels (binary 0/1) or matching boolean for multiclass correctness, shape (N,).
        n_bins: Number of bins for discrediting confidence.

    Returns:
        ECE score (0.0 to 1.0).
    """
    bin_boundaries = np.linspace(0, 1, n_bins + 1)
    ece = 0.0

    for i in range(n_bins):
        bin_lower = bin_boundaries[i]
        bin_upper = bin_boundaries[i + 1]

        # Select samples in this bin
        in_bin = np.logical_and(probs > bin_lower, probs <= bin_upper)
        prop_in_bin = np.mean(in_bin)

        if prop_in_bin > 0:
            # Accuracy in bin
            accuracy_in_bin = np.mean(labels[in_bin])
            # Confidence in bin
            conf_in_bin = np.mean(probs[in_bin])

            ece += np.abs(accuracy_in_bin - conf_in_bin) * prop_in_bin

    return float(ece)


def negative_log_likelihood(probs: np.ndarray, targets: np.ndarray) -> float:
    """
    Compute NLL.
    """
    # Clip for stability
    epsilon = 1e-15
    probs = np.clip(probs, epsilon, 1 - epsilon)

    # Assuming targets are binary/one-hot matching probs format
    return float(-np.mean(targets * np.log(probs)))
