"""
Constraint-Aware Action Filtering for runtime safety enforcement.

Implements convex constraint projection and control barrier function (CBF)
filtering to ensure actions satisfy safety envelope constraints.
"""

from dataclasses import dataclass
from typing import Callable, Dict, List, Optional, Protocol, Tuple
import numpy as np

from opentlu.foundations.contracts import SafetyEnvelope


@dataclass
class FilteredAction:
    """Result from safety filtering."""

    action: np.ndarray  # The (possibly modified) safe action
    was_modified: bool  # Whether the action was modified
    constraint_margins: Dict[str, float]  # Margin to each constraint (positive = safe)
    fallback_used: bool  # Whether fallback action was used
    violation_type: Optional[str] = None  # Type of constraint violated (if any)


@dataclass
class BoxConstraint:
    """Box (bound) constraint: lower <= action <= upper."""

    lower: np.ndarray
    upper: np.ndarray
    name: str = "box"


@dataclass
class LinearConstraint:
    """Linear constraint: A @ action <= b."""

    A: np.ndarray  # (M, D) constraint matrix
    b: np.ndarray  # (M,) constraint bounds
    name: str = "linear"


class DynamicsModel(Protocol):
    """Protocol for dynamics models used in CBF filtering."""

    def predict(self, state: np.ndarray, action: np.ndarray) -> np.ndarray:
        """Predict next state given current state and action."""
        ...


@dataclass
class CBFConstraint:
    """Control Barrier Function constraint."""

    h: Callable[[np.ndarray], float]  # Barrier function h(x) >= 0 for safety
    alpha: float = 1.0  # Class-K function parameter
    name: str = "cbf"


def box_constraint_project(
    action: np.ndarray, constraint: BoxConstraint
) -> Tuple[np.ndarray, bool]:
    """
    Project action onto box constraints.

    Args:
        action: Original action
        constraint: Box constraint with lower and upper bounds

    Returns:
        (projected_action, was_modified)
    """
    projected = np.clip(action, constraint.lower, constraint.upper)
    was_modified = not np.allclose(action, projected)
    return projected, was_modified


def linear_constraint_project(
    action: np.ndarray,
    constraint: LinearConstraint,
    max_iterations: int = 100,
    tolerance: float = 1e-6,
) -> Tuple[np.ndarray, bool]:
    """
    Project action onto linear constraints using iterative projection.

    Uses Dykstra's algorithm for projection onto intersection of half-spaces.

    Args:
        action: Original action
        constraint: Linear constraint A @ x <= b
        max_iterations: Maximum projection iterations
        tolerance: Convergence tolerance

    Returns:
        (projected_action, was_modified)
    """
    A = constraint.A
    b = constraint.b
    x = action.copy()

    # Check which constraints are violated
    violations = A @ x - b

    if np.all(violations <= tolerance):
        return x, False

    # Iterative projection onto half-spaces
    for _ in range(max_iterations):
        x_prev = x.copy()

        for i in range(len(b)):
            # Project onto half-space A[i] @ x <= b[i]
            a_i = A[i]
            violation = np.dot(a_i, x) - b[i]

            if violation > tolerance:
                # Project: x = x - (a'x - b) * a / ||a||^2
                norm_sq = np.dot(a_i, a_i)
                if norm_sq > 1e-10:
                    x = x - (violation / norm_sq) * a_i

        if np.linalg.norm(x - x_prev) < tolerance:
            break

    return x, True


class CBFFilter:
    """
    Control Barrier Function based action filter.

    Ensures the next state satisfies safety constraints using
    barrier function dynamics.
    """

    def __init__(
        self,
        dynamics_model: DynamicsModel,
        barrier_fn: Callable[[np.ndarray], float],
        alpha: float = 1.0,
    ):
        """
        Initialize CBF filter.

        Args:
            dynamics_model: Model predicting next state
            barrier_fn: Safety barrier function h(x) >= 0 means safe
            alpha: Class-K function parameter (higher = more conservative)
        """
        self.dynamics = dynamics_model
        self.h = barrier_fn
        self.alpha = alpha

    def is_safe(self, state: np.ndarray, action: np.ndarray) -> Tuple[bool, float]:
        """
        Check if action is safe according to CBF.

        CBF condition: dh/dt + alpha * h(x) >= 0

        Args:
            state: Current state
            action: Proposed action

        Returns:
            (is_safe, margin) where margin is the CBF value
        """
        next_state = self.dynamics.predict(state, action)
        h_current = self.h(state)
        h_next = self.h(next_state)

        # Discrete-time CBF condition: h(x') >= (1 - alpha) * h(x)
        margin = h_next - (1 - self.alpha) * h_current
        is_safe = margin >= 0

        return is_safe, float(margin)

    def filter_action(
        self,
        state: np.ndarray,
        action: np.ndarray,
        n_samples: int = 10,
    ) -> Tuple[np.ndarray, bool, float]:
        """
        Filter action to satisfy CBF constraint.

        Uses simple line search from action toward zero.

        Args:
            state: Current state
            action: Proposed action
            n_samples: Number of line search samples

        Returns:
            (safe_action, was_modified, margin)
        """
        is_safe, margin = self.is_safe(state, action)

        if is_safe:
            return action, False, margin

        # Line search toward zero action
        for alpha in np.linspace(0, 1, n_samples):
            scaled_action = (1 - alpha) * action
            is_safe, margin = self.is_safe(state, scaled_action)
            if is_safe:
                return scaled_action, True, margin

        # Return zero action if nothing works
        return np.zeros_like(action), True, self.h(state)


class SafetyFilter:
    """
    Main safety filter orchestrator.

    Combines multiple constraint types (box, linear, CBF) to ensure
    safe action execution.
    """

    def __init__(
        self,
        envelope: SafetyEnvelope,
        box_constraints: Optional[List[BoxConstraint]] = None,
        linear_constraints: Optional[List[LinearConstraint]] = None,
        cbf_filter: Optional[CBFFilter] = None,
        fallback_action: Optional[np.ndarray] = None,
    ):
        """
        Initialize safety filter.

        Args:
            envelope: Safety envelope from contracts
            box_constraints: List of box constraints
            linear_constraints: List of linear constraints
            cbf_filter: Optional CBF filter for dynamics constraints
            fallback_action: Conservative fallback action
        """
        self.envelope = envelope
        self.box_constraints = box_constraints or []
        self.linear_constraints = linear_constraints or []
        self.cbf_filter = cbf_filter
        self.fallback_action = fallback_action

    def filter(
        self,
        candidate_action: np.ndarray,
        state: Optional[np.ndarray] = None,
    ) -> FilteredAction:
        """
        Filter candidate action to ensure safety.

        Args:
            candidate_action: Action proposed by policy
            state: Current state (required for CBF filtering)

        Returns:
            FilteredAction with safe action and metadata.
        """
        action = candidate_action.copy()
        was_modified = False
        constraint_margins: Dict[str, float] = {}
        fallback_used = False
        violation_type = None

        # 1. Apply box constraints
        for box_constraint in self.box_constraints:
            new_action, modified = box_constraint_project(action, box_constraint)
            if modified:
                was_modified = True
                violation_type = box_constraint.name

            # Compute margin (min distance to constraint)
            lower_margin = float(np.min(new_action - box_constraint.lower))
            upper_margin = float(np.min(box_constraint.upper - new_action))
            constraint_margins[box_constraint.name] = min(lower_margin, upper_margin)
            action = new_action

        # 2. Apply linear constraints
        for lin_constraint in self.linear_constraints:
            new_action, modified = linear_constraint_project(action, lin_constraint)
            if modified:
                was_modified = True
                violation_type = lin_constraint.name

            # Compute margin
            violations = lin_constraint.A @ new_action - lin_constraint.b
            constraint_margins[lin_constraint.name] = float(-np.max(violations))
            action = new_action

        # 3. Apply CBF filter if available
        if self.cbf_filter is not None and state is not None:
            try:
                new_action, modified, margin = self.cbf_filter.filter_action(state, action)
                if modified:
                    was_modified = True
                    violation_type = "cbf"
                constraint_margins["cbf"] = margin
                action = new_action
            except Exception:
                # CBF failed - use fallback if available
                if self.fallback_action is not None:
                    action = self.fallback_action
                    fallback_used = True
                    was_modified = True

        # 4. Check if we need fallback
        # If action was modified to zero or very small, use fallback
        if np.linalg.norm(action) < 1e-6 and self.fallback_action is not None:
            action = self.fallback_action
            fallback_used = True

        return FilteredAction(
            action=action,
            was_modified=was_modified,
            constraint_margins=constraint_margins,
            fallback_used=fallback_used,
            violation_type=violation_type,
        )

    def check_constraints(self, action: np.ndarray) -> Dict[str, bool]:
        """
        Check if action satisfies all constraints without modifying.

        Returns:
            Dict mapping constraint name to satisfaction (True = satisfied)
        """
        results: Dict[str, bool] = {}

        for box_constraint in self.box_constraints:
            satisfied = bool(
                np.all(action >= box_constraint.lower) and np.all(action <= box_constraint.upper)
            )
            results[box_constraint.name] = satisfied

        for lin_constraint in self.linear_constraints:
            violations = lin_constraint.A @ action - lin_constraint.b
            results[lin_constraint.name] = bool(np.all(violations <= 0))

        return results
