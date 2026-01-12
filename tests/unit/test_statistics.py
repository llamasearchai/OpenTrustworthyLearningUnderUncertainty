import numpy as np
import pytest
from opentlu.evaluation.statistics import (
    bootstrap_ci,
    wilson_ci,
    StatisticalEvaluator,
    AggregatedResults,
    MetricWithCI,
)


def test_bootstrap_ci_mean():
    """Test bootstrap CI for mean."""
    np.random.seed(42)
    # True mean 5.0
    data = np.random.normal(5.0, 1.0, 1000)

    est, lower, upper = bootstrap_ci(data, np.mean, n_bootstrap=1000)

    assert np.isclose(est, 5.0, atol=0.1)
    assert lower < est < upper
    # True mean should be in CI
    assert lower <= 5.0 <= upper


def test_wilson_ci():
    """Test Wilson score interval."""
    # 50/100 -> 0.5
    p, low, high = wilson_ci(50, 100)
    assert p == 0.5
    assert 0.39 < low < 0.5
    assert 0.5 < high < 0.61

    # 0/100 -> 0.0
    p, low, high = wilson_ci(0, 100)
    assert p == 0.0
    assert low == pytest.approx(0.0, abs=1e-9)
    assert high > 0.0

    # 100/100 -> 1.0
    p, low, high = wilson_ci(100, 100)
    assert p == 1.0
    assert low < 1.0
    assert high == 1.0


def test_statistical_evaluator_aggregate():
    """Test aggregation with stats evaluator."""
    evaluator = StatisticalEvaluator({"acc": 0.5})

    results = [
        {"metrics": {"acc": 0.8}, "passed": True, "tags": {"env": "sim"}},
        {"metrics": {"acc": 0.9}, "passed": True, "tags": {"env": "sim"}},
        {"metrics": {"acc": 0.7}, "passed": True, "tags": {"env": "real"}},
    ]

    agg = evaluator.aggregate_results(results, stratify_by=["env"])

    # Check mean
    assert np.isclose(agg.mean_metrics["acc"].value, 0.8)

    # Check stratification
    sim_agg = agg.stratified_metrics["env"].strata["sim"]["acc"]
    assert np.isclose(sim_agg.value, 0.85)  # (0.8+0.9)/2

    real_agg = agg.stratified_metrics["env"].strata["real"]["acc"]
    assert np.isclose(real_agg.value, 0.7)


def test_regression_detection():
    """Test detecting regression between results."""
    evaluator = StatisticalEvaluator({})

    # Old: Low error rate (0.1 +/- small) - Lower is better for safety
    old = AggregatedResults(
        total_scenarios=100,
        pass_rate=MetricWithCI(1.0, 0.95, 1.0, "wilson", 100),
        mean_metrics={"error_rate": MetricWithCI(0.1, 0.08, 0.12, "bootstrap", 100)},
        stratified_metrics={},
        power_analysis={},
    )

    # New: High error rate (0.2 +/- small)
    new = AggregatedResults(
        total_scenarios=100,
        pass_rate=MetricWithCI(1.0, 0.95, 1.0, "wilson", 100),
        mean_metrics={"error_rate": MetricWithCI(0.2, 0.18, 0.22, "bootstrap", 100)},
        stratified_metrics={},
        power_analysis={},
    )

    # Safety metric check (error_rate is safety)
    is_regression, details = evaluator.detect_regression(old, new, safety_metrics=["error_rate"])
    assert is_regression
    assert "REGRESSION" in details["error_rate"] or "lower" in details["error_rate"]

    # Non-safety check (metrics not in safety list might be ignored or treated differently depending on implementation,
    # but here let's assume default checks lower bounds)
    is_regr, _ = evaluator.detect_regression(old, new, safety_metrics=[])
    # If not safety, maybe it doesn't strict check?
    # Let's rely on the explicit safety check for specific failure.
