"""Tests for new features: TTC, OOD ensemble, statistics, health monitor, etc."""

import numpy as np

from opentlu.safety.monitors import (
    TTCMonitor,
    TTCConfig,
    constant_velocity_ttc,
)
from opentlu.runtime.ood import (
    EnergyBasedDetector,
    LabelShiftDetector,
    OODEnsemble,
    MahalanobisDetector,
)
from opentlu.evaluation.statistics import (
    bootstrap_ci,
    wilson_ci,
    StatisticalEvaluator,
)
from opentlu.runtime.health import (
    HealthMonitor,
    RollingStatistics,
)
from opentlu.active_learning.acquisition import (
    DataAcquisitionPolicy,
    AcquisitionConfig,
    SampleMetadata,
    dpp_kernel,
    greedy_dpp_map,
)
from opentlu.foundations.contracts import UncertaintyEstimate, RiskAssessment


# --- TTC Monitor Tests ---


def test_constant_velocity_ttc():
    """Test TTC computation with constant velocity."""
    # Ego at origin, moving right at 10 m/s
    # Object at (50, 0), stationary
    ego_pos = np.array([0.0, 0.0])
    ego_vel = np.array([10.0, 0.0])
    obj_pos = np.array([50.0, 0.0])
    obj_vel = np.array([0.0, 0.0])

    ttc = constant_velocity_ttc(ego_pos, ego_vel, obj_pos, obj_vel)
    assert np.isclose(ttc, 5.0), f"Expected TTC=5s, got {ttc}"


def test_ttc_no_collision():
    """Test TTC when objects are moving apart."""
    ego_pos = np.array([0.0, 0.0])
    ego_vel = np.array([-10.0, 0.0])  # Moving away
    obj_pos = np.array([50.0, 0.0])
    obj_vel = np.array([0.0, 0.0])

    ttc = constant_velocity_ttc(ego_pos, ego_vel, obj_pos, obj_vel)
    assert ttc == float("inf"), "Expected infinite TTC when moving apart"


def test_ttc_monitor():
    """Test TTC monitor with multiple objects."""
    config = TTCConfig(critical_ttc=1.0, warning_ttc=3.0)
    monitor = TTCMonitor("ttc_monitor", config)

    state = {
        "ego_position": [0.0, 0.0],
        "ego_velocity": [10.0, 0.0],
        "objects": [
            {"object_id": "car1", "position": [50.0, 0.0], "velocity": [0.0, 0.0]},
            {"object_id": "car2", "position": [20.0, 0.0], "velocity": [0.0, 0.0]},  # Closer
        ],
    }

    output = monitor.check(state)

    # TTC to car2 is 2s (< warning_ttc=3s), so severity > 0
    assert output.severity > 0
    # TTC to car2 is 2s (> critical_ttc=1s), so not triggered
    assert not output.triggered or "car2" in output.message


# --- OOD Detection Tests ---


def test_energy_detector():
    """Test energy-based OOD detector."""
    detector = EnergyBasedDetector(temperature=1.0)

    # Peaked distribution (in-distribution like)
    peaked = np.array([[10.0, 0.0, 0.0, 0.0]])
    score_peaked = detector.score(peaked)

    # Uniform distribution (OOD like)
    uniform = np.array([[0.0, 0.0, 0.0, 0.0]])
    score_uniform = detector.score(uniform)

    # Peaked should have lower (more negative) energy
    assert score_peaked < score_uniform


def test_label_shift_detector():
    """Test label shift detector."""
    detector = LabelShiftDetector()

    # Fit on balanced labels
    labels = np.array([0, 0, 1, 1, 2, 2])
    detector.fit(np.zeros((6, 3)), labels)

    # Test with same distribution
    same_dist = np.array([[0.33, 0.33, 0.34]])
    score_same = detector.score(same_dist)

    # Test with shifted distribution
    shifted = np.array([[0.9, 0.05, 0.05]])
    score_shifted = detector.score(shifted)

    assert score_shifted > score_same, "Shifted distribution should have higher score"


def test_ood_ensemble():
    """Test OOD ensemble combining multiple detectors."""
    # Create detectors
    mahal = MahalanobisDetector(name="mahal")
    mahal.fit(np.random.randn(100, 10))

    energy = EnergyBasedDetector()

    ensemble = OODEnsemble(
        detectors=[mahal, energy],
        weights=[0.5, 0.5],
        threshold=2.0,
    )

    # Score in-distribution
    in_dist = np.random.randn(10)
    result_in = ensemble.score(in_dist)

    assert "mahal" in result_in.component_scores
    assert "energy" in result_in.component_scores
    assert isinstance(result_in.is_ood, bool)


# --- Statistical Evaluation Tests ---


def test_bootstrap_ci():
    """Test bootstrap confidence interval."""
    np.random.seed(42)
    data = np.random.normal(100, 10, 1000)

    estimate, ci_lower, ci_upper = bootstrap_ci(data, n_bootstrap=1000)

    assert ci_lower < estimate < ci_upper
    assert 98 < estimate < 102  # Should be close to true mean 100


def test_wilson_ci():
    """Test Wilson confidence interval for proportions."""
    # 80 successes out of 100
    proportion, ci_lower, ci_upper = wilson_ci(80, 100)

    assert np.isclose(proportion, 0.8)
    assert ci_lower < 0.8 < ci_upper
    assert ci_lower > 0.7  # Should be reasonably tight


def test_statistical_evaluator():
    """Test statistical evaluator aggregation."""
    evaluator = StatisticalEvaluator(
        acceptance_thresholds={"collision_rate": 0.01},
        n_bootstrap=100,
    )

    # Create sample results
    results = [
        {
            "metrics": {"collision_rate": 0.005, "latency": 10},
            "passed": True,
            "tags": {"scenario": "urban"},
        },
        {
            "metrics": {"collision_rate": 0.003, "latency": 15},
            "passed": True,
            "tags": {"scenario": "highway"},
        },
        {
            "metrics": {"collision_rate": 0.008, "latency": 12},
            "passed": True,
            "tags": {"scenario": "urban"},
        },
    ]

    agg = evaluator.aggregate_results(results, stratify_by=["scenario"])

    assert agg.total_scenarios == 3
    assert agg.pass_rate.value == 1.0
    assert "collision_rate" in agg.mean_metrics
    assert "scenario" in agg.stratified_metrics


# --- Health Monitor Tests ---


def test_rolling_statistics():
    """Test rolling statistics computation."""
    stats = RollingStatistics(window_seconds=10.0)

    # Record some values
    for i in range(100):
        stats.record(float(i), success=i % 10 != 0)  # 10% errors

    p50 = stats.get_percentile(50)
    p99 = stats.get_percentile(99)

    assert p50 < p99
    assert 0.05 < stats.get_error_rate() < 0.15


def test_health_monitor():
    """Test health monitor recording and status."""
    monitor = HealthMonitor(
        latency_threshold_p99_ms=50.0,
        error_rate_threshold=0.1,
    )

    # Record some operations
    for i in range(100):
        latency = 10 + np.random.rand() * 10
        monitor.record("inference", latency, success=True)

    status = monitor.get_health()

    assert status.total_operations == 100
    assert status.latency_p50 > 0
    assert status.latency_p99 >= status.latency_p50
    assert status.error_rate == 0.0


# --- Diversity-Aware Acquisition Tests ---


def test_dpp_kernel():
    """Test DPP kernel construction."""
    embeddings = np.random.randn(10, 5)
    scores = np.random.rand(10)

    kernel = dpp_kernel(embeddings, scores)

    assert kernel.shape == (10, 10)
    assert np.allclose(kernel, kernel.T)  # Symmetric
    assert np.all(np.diag(kernel) > 0)  # Positive diagonal


def test_greedy_dpp_map():
    """Test greedy DPP MAP inference."""
    embeddings = np.random.randn(10, 5)
    scores = np.random.rand(10)

    kernel = dpp_kernel(embeddings, scores)
    selected = greedy_dpp_map(kernel, k=3)

    assert len(selected) == 3
    assert len(set(selected)) == 3  # All unique


def test_diversity_aware_selection():
    """Test diversity-aware batch selection."""
    config = AcquisitionConfig()
    policy = DataAcquisitionPolicy(config)

    # Create samples with embeddings
    samples = []
    embeddings = []
    for i in range(20):
        unc = UncertaintyEstimate(
            confidence=0.5,
            aleatoric_score=0.1,
            epistemic_score=0.1 + i * 0.01,
            source="test",
        )
        risk = RiskAssessment(
            expected_risk=0.1,
            tail_risk_cvar=0.2,
            violation_probability=0.01,
            is_acceptable=True,
        )
        emb = np.random.randn(10)
        samples.append(
            SampleMetadata(
                id=f"sample_{i}",
                uncertainty=unc,
                risk=risk,
                novelty_score=0.1,
                embedding=emb,
            )
        )
        embeddings.append(emb)

    embeddings = np.array(embeddings)

    # Test DPP selection
    result = policy.select_batch_with_metadata(
        samples,
        batch_size=5,
        diversity_method="dpp",
        embeddings=embeddings,
    )

    assert len(result.selected_ids) == 5
    assert result.method == "dpp"
    assert result.diversity_score != 0.0
