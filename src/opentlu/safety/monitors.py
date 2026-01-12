import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional

import numpy as np

from opentlu.foundations.contracts import MonitorOutput


@dataclass
class TTCConfig:
    """Configuration for Time-to-Collision monitor."""

    critical_ttc: float = 1.0  # Seconds - triggers SAFE_STOP
    warning_ttc: float = 3.0  # Seconds - triggers severity scaling
    model: Literal["constant_velocity", "constant_acceleration"] = "constant_velocity"
    debounce_steps: int = 3  # Hysteresis for rapid oscillation prevention
    min_closing_velocity: float = 0.1  # Minimum closing speed to consider


@dataclass
class TrackedObject:
    """Represents a tracked object for TTC computation."""

    object_id: str
    position: np.ndarray  # (2,) or (3,) for 2D/3D
    velocity: np.ndarray  # (2,) or (3,)
    acceleration: Optional[np.ndarray] = None  # Optional for constant_acceleration model


class BaseMonitor(ABC):
    """Abstract base class for runtime monitors."""

    def __init__(self, monitor_id: str):
        self.monitor_id = monitor_id

    @abstractmethod
    def check(self, state: Dict[str, Any]) -> MonitorOutput:
        """
        Check the current state against safety criteria.

        Args:
            state: Dictionary containing current observations/state.

        Returns:
            MonitorOutput with trigger status and severity.
        """
        pass


class ConstraintMonitor(BaseMonitor):
    """Monitors simple state constraints (e.g., speed limit)."""

    def __init__(self, monitor_id: str, limit: float, metric_key: str):
        super().__init__(monitor_id)
        self.limit = limit
        self.metric_key = metric_key

    def check(self, state: Dict[str, Any]) -> MonitorOutput:
        value = state.get(self.metric_key, 0.0)
        triggered = value > self.limit
        severity = (value - self.limit) / self.limit if triggered else 0.0
        severity = min(max(severity, 0.0), 1.0)

        return MonitorOutput(
            monitor_id=self.monitor_id,
            triggered=triggered,
            severity=severity,
            message=f"Value {value} exceeded limit {self.limit}" if triggered else "OK",
            timestamp=time.time(),
        )


class GeofenceMonitor(BaseMonitor):
    """Monitors if position is within allowed bounds."""

    def __init__(self, monitor_id: str, bounds: tuple[float, float, float, float]):
        """
        Args:
            bounds: (x_min, y_min, x_max, y_max)
        """
        super().__init__(monitor_id)
        self.bounds = bounds

    def check(self, state: Dict[str, Any]) -> MonitorOutput:
        x = state.get("x", 0.0)
        y = state.get("y", 0.0)
        x_min, y_min, x_max, y_max = self.bounds

        triggered = not (x_min <= x <= x_max and y_min <= y <= y_max)

        return MonitorOutput(
            monitor_id=self.monitor_id,
            triggered=triggered,
            severity=1.0 if triggered else 0.0,
            message=f"Position ({x}, {y}) out of bounds {self.bounds}" if triggered else "OK",
            timestamp=time.time(),
        )


def constant_velocity_ttc(
    ego_pos: np.ndarray,
    ego_vel: np.ndarray,
    obj_pos: np.ndarray,
    obj_vel: np.ndarray,
    min_closing_velocity: float = 0.1,
) -> float:
    """
    Compute Time-to-Collision using constant velocity model.

    TTC = -d / (v_rel dot d_hat) where d is relative position
    and v_rel is relative velocity.

    Args:
        ego_pos: Ego vehicle position
        ego_vel: Ego vehicle velocity
        obj_pos: Object position
        obj_vel: Object velocity
        min_closing_velocity: Minimum closing speed threshold

    Returns:
        TTC in seconds (inf if not approaching)
    """
    # Relative position (object relative to ego)
    rel_pos = obj_pos - ego_pos
    distance = np.linalg.norm(rel_pos)

    if distance < 1e-6:
        return 0.0  # Already at collision

    # Relative velocity (positive means approaching)
    rel_vel = ego_vel - obj_vel  # Ego approaching object
    closing_velocity = np.dot(rel_vel, rel_pos) / distance

    if closing_velocity < min_closing_velocity:
        return float("inf")  # Not approaching or moving away

    ttc = distance / closing_velocity
    return max(0.0, ttc)


def constant_acceleration_ttc(
    ego_pos: np.ndarray,
    ego_vel: np.ndarray,
    obj_pos: np.ndarray,
    obj_vel: np.ndarray,
    ego_acc: Optional[np.ndarray] = None,
    obj_acc: Optional[np.ndarray] = None,
) -> float:
    """
    Compute Time-to-Collision using constant acceleration model.

    Solves the quadratic: 0.5 * a_rel * t^2 + v_rel * t + d = 0
    where d is initial distance, v_rel is closing velocity, a_rel is relative acceleration.

    Args:
        ego_pos: Ego vehicle position
        ego_vel: Ego vehicle velocity
        obj_pos: Object position
        obj_vel: Object velocity
        ego_acc: Ego vehicle acceleration (optional)
        obj_acc: Object acceleration (optional)

    Returns:
        TTC in seconds (inf if no collision predicted)
    """
    rel_pos = obj_pos - ego_pos
    distance = np.linalg.norm(rel_pos)

    if distance < 1e-6:
        return 0.0

    # Direction from ego to object
    direction = rel_pos / distance

    # Project velocities and accelerations onto collision axis
    rel_vel = ego_vel - obj_vel
    v_rel = np.dot(rel_vel, direction)  # Positive = approaching

    if ego_acc is not None and obj_acc is not None:
        rel_acc = ego_acc - obj_acc
        a_rel = np.dot(rel_acc, direction)
    else:
        a_rel = 0.0

    # Solve quadratic: 0.5 * a_rel * t^2 + v_rel * t - distance = 0
    # Standard form: at^2 + bt + c = 0
    a = 0.5 * a_rel
    b = v_rel
    c = -distance

    if abs(a) < 1e-10:
        # Linear case (constant velocity)
        if b > 1e-6:
            return distance / b
        return float("inf")

    discriminant = b * b - 4 * a * c

    if discriminant < 0:
        return float("inf")

    sqrt_disc = np.sqrt(discriminant)
    t1 = (-b + sqrt_disc) / (2 * a)
    t2 = (-b - sqrt_disc) / (2 * a)

    # Return smallest positive time
    times = [t for t in [t1, t2] if t > 0]
    if times:
        return min(times)

    return float("inf")


class TTCMonitor(BaseMonitor):
    """
    Time-to-Collision safety monitor.

    Estimates TTC based on relative position, velocity, and optionally
    acceleration to predict collisions and trigger severity-scaled alerts.
    """

    def __init__(
        self,
        monitor_id: str,
        config: Optional[TTCConfig] = None,
    ):
        """
        Initialize TTC monitor.

        Args:
            monitor_id: Unique identifier for this monitor
            config: TTC configuration (uses defaults if not provided)
        """
        super().__init__(monitor_id)
        self.config = config or TTCConfig()
        self._trigger_history: List[bool] = []
        self._last_triggered_object: Optional[str] = None

    def _compute_ttc(
        self,
        ego_pos: np.ndarray,
        ego_vel: np.ndarray,
        obj: TrackedObject,
    ) -> float:
        """Compute TTC for a single tracked object."""
        if self.config.model == "constant_velocity":
            return constant_velocity_ttc(
                ego_pos,
                ego_vel,
                obj.position,
                obj.velocity,
                self.config.min_closing_velocity,
            )
        else:  # constant_acceleration
            return constant_acceleration_ttc(
                ego_pos,
                ego_vel,
                obj.position,
                obj.velocity,
                obj.acceleration,
                obj.acceleration,  # Assume symmetric
            )

    def check(self, state: Dict[str, Any]) -> MonitorOutput:
        """
        Check TTC against all tracked objects.

        Expected state keys:
            - ego_position: np.ndarray (2,) or (3,)
            - ego_velocity: np.ndarray (2,) or (3,)
            - objects: List[Dict] with keys: object_id, position, velocity, [acceleration]

        Returns:
            MonitorOutput with severity based on minimum TTC.
        """
        ego_pos = np.asarray(state.get("ego_position", [0.0, 0.0]))
        ego_vel = np.asarray(state.get("ego_velocity", [0.0, 0.0]))
        objects_data = state.get("objects", [])

        if not objects_data:
            return MonitorOutput(
                monitor_id=self.monitor_id,
                triggered=False,
                severity=0.0,
                message="No objects to track",
                timestamp=time.time(),
            )

        # Convert to TrackedObject instances
        objects: List[TrackedObject] = []
        for obj_dict in objects_data:
            obj = TrackedObject(
                object_id=obj_dict.get("object_id", "unknown"),
                position=np.asarray(obj_dict["position"]),
                velocity=np.asarray(obj_dict["velocity"]),
                acceleration=np.asarray(obj_dict["acceleration"])
                if "acceleration" in obj_dict
                else None,
            )
            objects.append(obj)

        # Compute TTC for all objects
        min_ttc = float("inf")
        min_ttc_object: Optional[str] = None

        for obj in objects:
            ttc = self._compute_ttc(ego_pos, ego_vel, obj)
            if ttc < min_ttc:
                min_ttc = ttc
                min_ttc_object = obj.object_id

        # Compute severity: 1.0 - (min_ttc / warning_ttc), clipped to [0, 1]
        if min_ttc >= self.config.warning_ttc:
            severity = 0.0
        elif min_ttc <= 0:
            severity = 1.0
        else:
            severity = 1.0 - (min_ttc / self.config.warning_ttc)
            severity = min(max(severity, 0.0), 1.0)

        # Check if triggered (TTC below critical threshold)
        triggered = min_ttc < self.config.critical_ttc

        # Apply hysteresis (debounce)
        self._trigger_history.append(triggered)
        if len(self._trigger_history) > self.config.debounce_steps:
            self._trigger_history.pop(0)

        # Only trigger if majority of recent checks triggered
        if self.config.debounce_steps > 1:
            trigger_count = sum(self._trigger_history)
            final_triggered = trigger_count > len(self._trigger_history) // 2
        else:
            final_triggered = triggered

        self._last_triggered_object = min_ttc_object if final_triggered else None

        # Construct message
        if min_ttc == float("inf"):
            message = "No collision predicted"
        elif final_triggered:
            message = f"CRITICAL: TTC={min_ttc:.2f}s to {min_ttc_object}"
        elif severity > 0:
            message = f"WARNING: TTC={min_ttc:.2f}s to {min_ttc_object}"
        else:
            message = f"TTC={min_ttc:.2f}s (safe)"

        return MonitorOutput(
            monitor_id=self.monitor_id,
            triggered=final_triggered,
            severity=severity,
            message=message,
            timestamp=time.time(),
        )

    def get_last_triggered_object(self) -> Optional[str]:
        """Get the ID of the object that last triggered the monitor."""
        return self._last_triggered_object
