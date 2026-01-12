"""Tests for conformal prediction engine."""

import numpy as np
import pytest

from opentlu.foundations.conformal import (
    ConformalConfig,
    SplitConformalPredictor,
    AdaptiveConformalPredictor,
    MondrianConformalPredictor,
    compute_nonconformity_scores,
    compute_quantile,
)


def test_compute_quantile():
    """Test quantile computation."""
    scores = np.array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0])
    q = compute_quantile(scores, coverage=0.9)
    # Should be approximately the 90th percentile
    assert 0.8 <= q <= 1.0


def test_split_conformal_fit():
    """Test split conformal predictor fitting."""
    config = ConformalConfig(coverage=0.9, min_calibration_size=10)
    predictor = SplitConformalPredictor(config)

    # Fit with calibration data
    scores = np.random.rand(100)
    cal_id = predictor.fit(scores)

    assert cal_id is not None
    calibration = predictor.get_calibration()
    assert calibration is not None
    assert calibration.coverage == 0.9


def test_split_conformal_predict():
    """Test split conformal prediction."""
    config = ConformalConfig(coverage=0.9, min_calibration_size=10)
    predictor = SplitConformalPredictor(config)

    # Fit
    predictor.fit(np.random.rand(100))

    # Predict
    test_scores = np.array([[0.1, 0.3, 0.5, 0.9]])  # 1 sample, 4 classes
    results = predictor.predict(test_scores)

    assert len(results) == 1
    assert results[0].is_valid
    assert len(results[0].prediction_set) > 0


def test_split_conformal_coverage():
    """Test that conformal prediction achieves target coverage."""
    np.random.seed(42)
    config = ConformalConfig(coverage=0.9, min_calibration_size=100)
    predictor = SplitConformalPredictor(config)

    # Generate calibration data with known distribution
    n_cal = 500
    n_test = 500
    n_classes = 5

    # True labels for calibration
    cal_labels = np.random.randint(0, n_classes, n_cal)
    # Nonconformity scores: 1 - p(true class)
    cal_probs = np.random.dirichlet([1] * n_classes, n_cal)
    cal_scores = 1 - cal_probs[np.arange(n_cal), cal_labels]

    predictor.fit(cal_scores)

    # Test
    test_labels = np.random.randint(0, n_classes, n_test)
    test_probs = np.random.dirichlet([1] * n_classes, n_test)
    test_scores = 1 - test_probs  # Per-class nonconformity

    results = predictor.predict(test_scores)

    # Count coverage (true label in prediction set)
    covered = sum(1 for i, r in enumerate(results) if test_labels[i] in r.prediction_set)
    coverage = covered / n_test

    # Coverage should be at least target (minus some tolerance)
    assert coverage >= 0.85, f"Coverage {coverage} below target 0.9"


def test_adaptive_conformal():
    """Test adaptive conformal prediction."""
    config = ConformalConfig(coverage=0.9, min_calibration_size=10)
    predictor = AdaptiveConformalPredictor(config, gamma=0.01)

    # Fit
    predictor.fit(np.random.rand(100))

    # Predict and update
    for _ in range(10):
        scores = np.random.rand(5)
        results = predictor.predict(scores.reshape(1, -1))
        assert len(results) == 1

        # Simulate update
        true_label = 2
        predictor.update(true_label, results[0].prediction_set)

    running_cov = predictor.get_running_coverage()
    assert 0.0 <= running_cov <= 1.0


def test_mondrian_conformal():
    """Test Mondrian (class-conditional) conformal prediction."""
    config = ConformalConfig(coverage=0.9, min_calibration_size=10)
    predictor = MondrianConformalPredictor(config)

    # Fit with labels
    n_cal = 200
    n_classes = 4
    labels = np.random.randint(0, n_classes, n_cal)
    scores = np.random.rand(n_cal)

    predictor.fit(scores, labels)

    # Predict
    test_scores = np.random.rand(10, n_classes)
    results = predictor.predict(test_scores)

    assert len(results) == 10
    for r in results:
        assert r.is_valid


def test_nonconformity_scores():
    """Test nonconformity score computation."""
    # Ensemble probs: 3 models, 5 samples, 4 classes
    ensemble = np.random.dirichlet([1, 1, 1, 1], (3, 5))

    # One minus prob method
    scores = compute_nonconformity_scores(ensemble, method="one_minus_prob")
    assert scores.shape == (5, 4)
    assert np.all(scores >= 0) and np.all(scores <= 1)

    # Entropy method
    scores_entropy = compute_nonconformity_scores(ensemble, method="entropy")
    assert scores_entropy.shape == (5, 4)
    assert np.all(scores_entropy >= 0)


def test_insufficient_calibration_samples():
    """Test error on insufficient calibration data."""
    config = ConformalConfig(min_calibration_size=100)
    predictor = SplitConformalPredictor(config)

    with pytest.raises(ValueError, match="Insufficient"):
        predictor.fit(np.random.rand(50))
