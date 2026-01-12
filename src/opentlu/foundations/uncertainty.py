import numpy as np


def predictive_entropy(probs: np.ndarray) -> float:
    """
    Compute entropy of a probability distribution (averaged over batch).
    H(p) = - sum p_i log p_i

    Args:
        probs: (N, C) probabilities.

    Returns:
        Mean entropy over the batch.
    """
    epsilon = 1e-15
    probs = np.clip(probs, epsilon, 1 - epsilon)
    entropies = -np.sum(probs * np.log(probs), axis=1)
    return float(np.mean(entropies))


def ensemble_variance(predictions: np.ndarray) -> np.ndarray:
    """
    Compute variance of predictions across an ensemble.

    Args:
        predictions: (K, N, ...) where K is ensemble size.

    Returns:
        (N, ...) variance.
    """
    import typing

    return typing.cast(np.ndarray, np.var(predictions, axis=0))


def ensemble_uncertainty_decomposition(ensemble_probs: np.ndarray) -> tuple[float, float, float]:
    """
    Decompose uncertainty into Aleatoric and Epistemic components using Mutual Information.

    Total Uncertainty (Entropy of mean) = Aleatoric (Mean entropy) + Epistemic (Mutual Info)
    H(E[p]) = E[H(p)] + I(y; m | x)

    Args:
        ensemble_probs: (K, N, C) probabilities from K models.

    Returns:
        (total_uncertainty, aleatoric_uncertainty, epistemic_uncertainty) averaged over N.
    """
    # 1. Total Uncertainty: Entropy of the mean prediction
    mean_probs = np.mean(ensemble_probs, axis=0)  # (N, C)
    total_uncertainty = predictive_entropy(mean_probs)

    # 2. Aleatoric Uncertainty: Mean of the individual entropies
    episilon = 1e-15
    clipped = np.clip(ensemble_probs, episilon, 1 - episilon)
    individual_entropies = -np.sum(clipped * np.log(clipped), axis=2)  # (K, N)
    aleatoric_uncertainty = float(np.mean(np.mean(individual_entropies, axis=0)))  # scalar

    # 3. Epistemic: Difference
    epistemic_uncertainty = total_uncertainty - aleatoric_uncertainty

    return total_uncertainty, aleatoric_uncertainty, epistemic_uncertainty
