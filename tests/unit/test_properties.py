"""
Property-based tests for OpenTLU using Hypothesis.

These tests verify mathematical invariants that should hold universally,
catching edge cases that example-based tests might miss.
"""

import numpy as np
from hypothesis import given, strategies as st, settings
from hypothesis.extra.numpy import arrays

from opentlu.foundations.uncertainty import (
    predictive_entropy,
    ensemble_variance,
    ensemble_uncertainty_decomposition,
)
from opentlu.foundations.metrics import (
    brier_score,
    expected_calibration_error,
)
from opentlu.foundations.contracts import (
    UncertaintyEstimate,
    MitigationState,
)
from opentlu.safety.monitors import ConstraintMonitor, GeofenceMonitor
from opentlu.runtime.controller import MitigationController


# --- Strategies for generating valid inputs ---


@st.composite
def probability_vector(draw, size: int = 4):
    """Generate a valid probability vector that sums to 1."""
    raw = draw(
        arrays(
            dtype=np.float64,
            shape=(size,),
            elements=st.floats(
                min_value=0.01, max_value=1.0, allow_nan=False, allow_infinity=False
            ),
        )
    )
    return raw / raw.sum()


@st.composite
def probability_batch(draw, n_samples: int = 10, n_classes: int = 4):
    """Generate a batch of probability vectors."""
    batch = []
    for _ in range(n_samples):
        batch.append(draw(probability_vector(n_classes)))
    return np.array(batch)


@st.composite
def ensemble_probs(draw, k_models: int = 3, n_samples: int = 5, n_classes: int = 4):
    """Generate ensemble probability predictions."""
    ensemble = []
    for _ in range(k_models):
        ensemble.append(draw(probability_batch(n_samples, n_classes)))
    return np.array(ensemble)


# --- Uncertainty Tests ---


@given(probs=probability_batch(n_samples=10, n_classes=4))
@settings(max_examples=100)
def test_entropy_non_negative(probs: np.ndarray):
    """Entropy should always be non-negative."""
    entropy = predictive_entropy(probs)
    assert entropy >= 0, f"Entropy was negative: {entropy}"


@given(probs=probability_batch(n_samples=10, n_classes=4))
@settings(max_examples=100)
def test_entropy_bounded(probs: np.ndarray):
    """Entropy should be bounded by log(num_classes)."""
    n_classes = probs.shape[1]
    max_entropy = np.log(n_classes)
    entropy = predictive_entropy(probs)
    assert entropy <= max_entropy + 1e-10, f"Entropy {entropy} exceeded max {max_entropy}"


@given(ensemble=ensemble_probs(k_models=3, n_samples=5, n_classes=4))
@settings(max_examples=50)
def test_uncertainty_decomposition_identity(ensemble: np.ndarray):
    """Total uncertainty should equal aleatoric + epistemic (mutual information decomposition)."""
    total, aleatoric, epistemic = ensemble_uncertainty_decomposition(ensemble)

    # Total = Aleatoric + Epistemic (with numerical tolerance)
    reconstructed = aleatoric + epistemic
    assert np.isclose(total, reconstructed, rtol=1e-5), (
        f"Decomposition failed: {total} != {aleatoric} + {epistemic}"
    )


@given(ensemble=ensemble_probs(k_models=5, n_samples=10, n_classes=4))
@settings(max_examples=50)
def test_aleatoric_non_negative(ensemble: np.ndarray):
    """Aleatoric uncertainty should be non-negative."""
    _, aleatoric, _ = ensemble_uncertainty_decomposition(ensemble)
    assert aleatoric >= -1e-10, f"Aleatoric was negative: {aleatoric}"


@given(ensemble=ensemble_probs(k_models=5, n_samples=10, n_classes=4))
@settings(max_examples=50)
def test_epistemic_non_negative(ensemble: np.ndarray):
    """Epistemic uncertainty should be non-negative (within numerical tolerance)."""
    _, _, epistemic = ensemble_uncertainty_decomposition(ensemble)
    # Epistemic can be slightly negative due to floating point but should be close to 0
    assert epistemic >= -1e-6, f"Epistemic was too negative: {epistemic}"


# --- Calibration Metric Tests ---


@given(
    probs=arrays(
        dtype=np.float64,
        shape=(100,),
        elements=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
    ),
    targets=arrays(
        dtype=np.float64,
        shape=(100,),
        elements=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
    ),
)
@settings(max_examples=50)
def test_brier_score_bounded(probs: np.ndarray, targets: np.ndarray):
    """Brier score should be bounded in [0, 1] for probability predictions."""
    score = brier_score(probs, targets)
    assert 0.0 <= score <= 1.0, f"Brier score out of bounds: {score}"


@given(
    probs=arrays(
        dtype=np.float64,
        shape=(100,),
        elements=st.floats(min_value=0.01, max_value=0.99, allow_nan=False, allow_infinity=False),
    ),
    labels=arrays(dtype=np.int64, shape=(100,), elements=st.integers(min_value=0, max_value=1)),
)
@settings(max_examples=50)
def test_ece_bounded(probs: np.ndarray, labels: np.ndarray):
    """ECE should be bounded in [0, 1]."""
    ece = expected_calibration_error(probs, labels.astype(float))
    assert 0.0 <= ece <= 1.0, f"ECE out of bounds: {ece}"


# --- Monitor Tests ---


@given(
    value=st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
    limit=st.floats(min_value=1.0, max_value=50.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=100)
def test_constraint_monitor_severity_bounded(value: float, limit: float):
    """Monitor severity should always be in [0, 1]."""
    monitor = ConstraintMonitor("test", limit=limit, metric_key="value")
    output = monitor.check({"value": value})
    assert 0.0 <= output.severity <= 1.0, f"Severity out of bounds: {output.severity}"


@given(
    value=st.floats(min_value=0.0, max_value=100.0, allow_nan=False, allow_infinity=False),
    limit=st.floats(min_value=1.0, max_value=50.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=100)
def test_constraint_monitor_trigger_correctness(value: float, limit: float):
    """Monitor should trigger iff value exceeds limit."""
    monitor = ConstraintMonitor("test", limit=limit, metric_key="value")
    output = monitor.check({"value": value})
    assert output.triggered == (value > limit), (
        f"Trigger mismatch: value={value}, limit={limit}, triggered={output.triggered}"
    )


@given(
    x=st.floats(min_value=-100.0, max_value=100.0, allow_nan=False, allow_infinity=False),
    y=st.floats(min_value=-100.0, max_value=100.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=100)
def test_geofence_monitor_trigger_correctness(x: float, y: float):
    """Geofence should trigger iff position is outside bounds."""
    bounds = (-10.0, -10.0, 10.0, 10.0)  # x_min, y_min, x_max, y_max
    monitor = GeofenceMonitor("test", bounds=bounds)
    output = monitor.check({"x": x, "y": y})

    in_bounds = bounds[0] <= x <= bounds[2] and bounds[1] <= y <= bounds[3]
    assert output.triggered == (not in_bounds), (
        f"Geofence trigger mismatch: ({x}, {y}), bounds={bounds}, triggered={output.triggered}"
    )


# --- FSM Reachability Tests ---


@given(
    epistemic=st.floats(min_value=0.0, max_value=2.0, allow_nan=False, allow_infinity=False),
    ood_score=st.floats(min_value=0.0, max_value=5.0, allow_nan=False, allow_infinity=False),
    monitor_severity=st.floats(min_value=0.0, max_value=1.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=100)
def test_fsm_always_produces_valid_state(
    epistemic: float, ood_score: float, monitor_severity: float
):
    """FSM should always transition to a valid MitigationState."""

    # Create a mock monitor that returns the given severity
    class MockMonitor:
        def __init__(self, severity: float):
            self._severity = min(max(severity, 0.0), 1.0)  # Clamp to valid range
            self.monitor_id = "mock"

        def check(self, state):
            from opentlu.foundations.contracts import MonitorOutput
            import time

            return MonitorOutput(
                monitor_id="mock",
                triggered=self._severity > 0,
                severity=self._severity,
                message="test",
                timestamp=time.time(),
            )

    controller = MitigationController(
        monitors=[MockMonitor(monitor_severity)],
        uncertainty_threshold=0.5,
        ood_threshold=0.8,
    )

    uncertainty = UncertaintyEstimate(
        confidence=0.5, aleatoric_score=0.1, epistemic_score=epistemic, source="test"
    )

    state = controller.step({}, uncertainty, ood_score)

    assert state in MitigationState, f"Invalid state returned: {state}"


@given(
    epistemic=st.floats(min_value=0.0, max_value=0.4, allow_nan=False, allow_infinity=False),
    ood_score=st.floats(min_value=0.0, max_value=0.7, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=50)
def test_fsm_reaches_nominal(epistemic: float, ood_score: float):
    """FSM should reach NOMINAL when all conditions are safe."""
    controller = MitigationController(
        monitors=[],  # No monitors
        uncertainty_threshold=0.5,
        ood_threshold=0.8,
    )

    uncertainty = UncertaintyEstimate(
        confidence=0.9, aleatoric_score=0.1, epistemic_score=epistemic, source="test"
    )

    state = controller.step({}, uncertainty, ood_score)
    assert state == MitigationState.NOMINAL, f"Expected NOMINAL, got {state}"


# --- Ensemble Variance Tests ---


@given(
    predictions=arrays(
        dtype=np.float64,
        shape=(5, 10),
        elements=st.floats(min_value=-10.0, max_value=10.0, allow_nan=False, allow_infinity=False),
    )
)
@settings(max_examples=50)
def test_ensemble_variance_non_negative(predictions: np.ndarray):
    """Variance should always be non-negative."""
    variance = ensemble_variance(predictions)
    assert np.all(variance >= 0), f"Negative variance found: {variance}"


@given(value=st.floats(min_value=-10.0, max_value=10.0, allow_nan=False, allow_infinity=False))
@settings(max_examples=50)
def test_ensemble_variance_zero_for_identical(value: float):
    """Variance should be zero when all ensemble members agree."""
    predictions = np.full((5, 10), value)
    variance = ensemble_variance(predictions)
    assert np.allclose(variance, 0.0), (
        f"Expected zero variance for identical predictions: {variance}"
    )
