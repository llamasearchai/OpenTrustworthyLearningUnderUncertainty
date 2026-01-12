import numpy as np
from opentlu.safety.filter import (
    BoxConstraint,
    LinearConstraint,
    CBFFilter,
    SafetyFilter,
    box_constraint_project,
    linear_constraint_project,
    DynamicsModel,
)
from opentlu.foundations.contracts import SafetyEnvelope


class MockDynamics(DynamicsModel):
    def predict(self, state: np.ndarray, action: np.ndarray) -> np.ndarray:
        # Simple dynamics: next_state = state + action
        return state + action


def test_box_projection():
    """Test box constraint projection."""
    constraint = BoxConstraint(lower=np.array([-1.0, -1.0]), upper=np.array([1.0, 1.0]))

    # Inside bounds - no change
    action = np.array([0.5, -0.5])
    proj, mod = box_constraint_project(action, constraint)
    assert not mod
    assert np.allclose(proj, action)

    # Outside bounds - clamp
    action = np.array([2.0, -2.0])
    proj, mod = box_constraint_project(action, constraint)
    assert mod
    assert np.allclose(proj, [1.0, -1.0])


def test_linear_projection():
    """Test linear constraint projection A*x <= b."""
    # Constraint: x[0] + x[1] <= 1.0
    constraint = LinearConstraint(A=np.array([[1.0, 1.0]]), b=np.array([1.0]))

    # Inside: 0.5 + 0.0 = 0.5 <= 1.0
    action = np.array([0.5, 0.0])
    proj, mod = linear_constraint_project(action, constraint)
    assert not mod
    assert np.allclose(proj, action)

    # Outside: 1.0 + 1.0 = 2.0 > 1.0
    # Should project to closest point on x+y=1
    action = np.array([1.0, 1.0])
    proj, mod = linear_constraint_project(action, constraint)
    assert mod
    # Sum should be close to 1.0 (with tolerance)
    assert np.sum(proj) <= 1.0 + 1e-4


def test_cbf_filter():
    """Test Control Barrier Function filter."""
    dynamics = MockDynamics()

    # Barrier: state must be non-negative (x >= 0)
    # h(x) = x[0]
    def barrier(x):
        return x[0]

    cbf = CBFFilter(dynamics, barrier, alpha=1.0)

    state = np.array([0.1])  # Close to boundary

    # Action pushing towards negative: 0.1 + (-0.2) = -0.1 (Unsafe next state)
    action = np.array([-0.2])

    # Filter should modify action to keep next state safe(r)
    # Condition: h(next) + alpha*h(curr) >= 0 ??
    # Usually: dh/dt + alpha h >= 0. Discretized: h(next) >= (1-gamma)h(curr) or similar implementation details.
    # Implementation checks is_safe() then projects.

    safe_action, mod, margin = cbf.filter_action(state, action)

    assert mod
    # Check if result is safe
    next_state = dynamics.predict(state, safe_action)
    assert (
        barrier(next_state) >= 0 or next_state[0] >= -1e-9
    )  # Allow mild tolerance or check correctness
    is_safe, _ = cbf.is_safe(state, safe_action)
    assert is_safe


def test_safety_filter_integration():
    """Test full safety filter integration."""
    envelope = SafetyEnvelope(source="test", constraints=[])

    box = BoxConstraint(np.array([-1]), np.array([1]))

    sf = SafetyFilter(envelope=envelope, box_constraints=[box], fallback_action=np.array([0.0]))

    # Safe action
    res = sf.filter(np.array([0.5]))
    assert not res.was_modified

    # Unsafe action
    res = sf.filter(np.array([1.5]))
    assert res.was_modified
    assert np.allclose(res.action, [1.0])
