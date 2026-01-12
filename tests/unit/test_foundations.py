import numpy as np

from opentlu.foundations.metrics import brier_score, expected_calibration_error
from opentlu.foundations.uncertainty import predictive_entropy, ensemble_uncertainty_decomposition


def test_brier_score():
    probs = np.array([0.9, 0.1])
    targets = np.array([1.0, 0.0])
    # (0.9-1)^2 = 0.01, (0.1-0)^2 = 0.01. Mean = 0.01
    score = brier_score(probs, targets)
    assert np.isclose(score, 0.01)


def test_ece_perfect():
    """Perfectly calibrated: when prob is 0.8, acc is 0.8."""
    probs = np.array([0.9, 0.1])
    labels = np.array([1, 0])
    ece = expected_calibration_error(probs, labels, n_bins=10)
    assert np.isclose(ece, 0.1)


def test_entropy():
    # Uniform distribution (highest entropy, ln 2)
    probs = np.array([[0.5, 0.5]])
    ent = predictive_entropy(probs)
    assert np.isclose(ent, 0.693, atol=0.001)


def test_uncertainty_decomposition():
    # Model 1: [1.0, 0.0], Model 2: [0.0, 1.0]
    p1 = np.array([[1.0, 0.0]])
    p2 = np.array([[0.0, 1.0]])
    ensemble = np.stack([p1, p2])

    total, aleatoric, epistemic = ensemble_uncertainty_decomposition(ensemble)

    # Aleatoric should be 0 (models are certain)
    assert np.isclose(aleatoric, 0.0, atol=1e-4)
    # Total is entropy of mean [0.5, 0.5] = ln 2
    assert np.isclose(total, np.log(2), atol=0.001)
    # Epistemic = Total - Alatoric = ln 2
    assert np.isclose(epistemic, np.log(2), atol=0.001)
