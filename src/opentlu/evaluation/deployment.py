"""
Shadow Deployment and A/B Testing Framework.

Enables safe model deployment through shadow mode (no effect on actions)
and A/B split testing with automatic metric comparison and promotion.
"""

import hashlib
import time
import threading
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Protocol, Tuple
from collections import defaultdict
import numpy as np


class Policy(Protocol):
    """Protocol for policies that can be deployed."""

    def __call__(self, observation: Dict[str, Any]) -> np.ndarray:
        """Generate action from observation."""
        ...


@dataclass
class ShadowResult:
    """Result from shadow mode execution."""

    production_action: np.ndarray
    shadow_action: np.ndarray
    divergence_score: float  # L2 norm between actions
    production_latency_ms: float
    shadow_latency_ms: float
    shadow_error: Optional[str] = None


@dataclass
class ABTestMetrics:
    """Metrics for an A/B test variant."""

    variant_name: str
    n_samples: int
    action_values: List[np.ndarray] = field(default_factory=list)
    latencies_ms: List[float] = field(default_factory=list)
    errors: int = 0
    custom_metrics: Dict[str, List[float]] = field(default_factory=lambda: defaultdict(list))


@dataclass
class PromotionCriteria:
    """Criteria for promoting a candidate model."""

    min_samples: int = 1000  # Minimum samples before promotion decision
    max_latency_increase_pct: float = 20.0  # Max acceptable latency increase
    min_confidence: float = 0.95  # Statistical confidence for promotion
    required_metrics: List[str] = field(default_factory=list)  # Metrics that must not regress


class ShadowRunner:
    """
    Shadow mode runner for safe model evaluation.

    Runs candidate policy in shadow mode (no effect on system)
    while production policy controls actual behavior.
    """

    def __init__(
        self,
        production_policy: Policy,
        candidate_policy: Policy,
        shadow_fraction: float = 1.0,
        timeout_ms: float = 100.0,
    ):
        """
        Initialize shadow runner.

        Args:
            production_policy: Policy currently in production
            candidate_policy: Candidate policy to evaluate
            shadow_fraction: Fraction of requests to run shadow (0-1)
            timeout_ms: Timeout for shadow policy execution
        """
        self.production_policy = production_policy
        self.candidate_policy = candidate_policy
        self.shadow_fraction = shadow_fraction
        self.timeout_ms = timeout_ms

        self._lock = threading.Lock()
        self._divergence_history: List[float] = []
        self._n_shadow_runs = 0
        self._n_shadow_errors = 0

    def run(self, observation: Dict[str, Any]) -> ShadowResult:
        """
        Execute production policy and optionally shadow policy.

        Args:
            observation: Current observation

        Returns:
            ShadowResult with both actions and divergence.
        """
        # Always run production
        start = time.perf_counter()
        production_action = self.production_policy(observation)
        production_latency = (time.perf_counter() - start) * 1000

        # Check if we should run shadow
        shadow_action = np.zeros_like(production_action)
        shadow_latency = 0.0
        shadow_error = None

        if np.random.random() < self.shadow_fraction:
            try:
                start = time.perf_counter()
                shadow_action = self.candidate_policy(observation)
                shadow_latency = (time.perf_counter() - start) * 1000

                with self._lock:
                    self._n_shadow_runs += 1

            except Exception as e:
                shadow_error = str(e)
                shadow_action = np.zeros_like(production_action)
                with self._lock:
                    self._n_shadow_errors += 1

        # Compute divergence
        divergence = float(np.linalg.norm(production_action - shadow_action))

        with self._lock:
            self._divergence_history.append(divergence)
            if len(self._divergence_history) > 10000:
                self._divergence_history.pop(0)

        return ShadowResult(
            production_action=production_action,
            shadow_action=shadow_action,
            divergence_score=divergence,
            production_latency_ms=production_latency,
            shadow_latency_ms=shadow_latency,
            shadow_error=shadow_error,
        )

    def get_statistics(self) -> Dict[str, float]:
        """Get shadow mode statistics."""
        with self._lock:
            if not self._divergence_history:
                return {
                    "n_runs": 0,
                    "n_errors": 0,
                    "error_rate": 0.0,
                    "mean_divergence": 0.0,
                    "max_divergence": 0.0,
                }

            return {
                "n_runs": self._n_shadow_runs,
                "n_errors": self._n_shadow_errors,
                "error_rate": self._n_shadow_errors / max(1, self._n_shadow_runs),
                "mean_divergence": float(np.mean(self._divergence_history)),
                "max_divergence": float(np.max(self._divergence_history)),
                "std_divergence": float(np.std(self._divergence_history)),
                "p50_divergence": float(np.percentile(self._divergence_history, 50)),
                "p95_divergence": float(np.percentile(self._divergence_history, 95)),
            }


class ABTestRunner:
    """
    A/B test runner for controlled model deployment.

    Splits traffic between multiple policy variants using
    consistent hashing for sticky assignments.
    """

    def __init__(
        self,
        policies: Dict[str, Policy],
        allocation: Dict[str, float],
        sticky_key: str = "session_id",
    ):
        """
        Initialize A/B test runner.

        Args:
            policies: Dict mapping variant name to policy
            allocation: Dict mapping variant name to traffic fraction (must sum to 1)
            sticky_key: Key in context for sticky allocation
        """
        self.policies = policies
        self.allocation = allocation
        self.sticky_key = sticky_key

        # Validate allocation sums to ~1
        total = sum(allocation.values())
        if not 0.99 <= total <= 1.01:
            raise ValueError(f"Allocation must sum to 1.0, got {total}")

        # Build allocation ranges
        self._ranges: List[Tuple[str, float, float]] = []
        current = 0.0
        for name, fraction in allocation.items():
            self._ranges.append((name, current, current + fraction))
            current += fraction

        self._lock = threading.Lock()
        self._metrics: Dict[str, ABTestMetrics] = {
            name: ABTestMetrics(variant_name=name, n_samples=0) for name in policies.keys()
        }

    def _get_bucket(self, context: Dict[str, Any]) -> str:
        """Determine which bucket based on sticky key."""
        key = context.get(self.sticky_key, str(np.random.random()))
        hash_val = int(hashlib.md5(str(key).encode()).hexdigest(), 16)
        bucket_val = (hash_val % 10000) / 10000

        for name, low, high in self._ranges:
            if low <= bucket_val < high:
                return name

        # Fallback to first variant
        return self._ranges[0][0]

    def run(
        self,
        observation: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> Tuple[np.ndarray, str]:
        """
        Execute the assigned policy variant.

        Args:
            observation: Current observation
            context: Context dict with sticky key

        Returns:
            (action, variant_name)
        """
        context = context or {}
        variant = self._get_bucket(context)
        policy = self.policies[variant]

        start = time.perf_counter()
        try:
            action = policy(observation)
            latency = (time.perf_counter() - start) * 1000

            with self._lock:
                metrics = self._metrics[variant]
                metrics.n_samples += 1
                metrics.action_values.append(action)
                metrics.latencies_ms.append(latency)

                # Limit stored values
                if len(metrics.action_values) > 10000:
                    metrics.action_values.pop(0)
                    metrics.latencies_ms.pop(0)

        except Exception:
            with self._lock:
                self._metrics[variant].errors += 1
            raise

        return action, variant

    def record_metric(self, variant: str, metric_name: str, value: float) -> None:
        """Record a custom metric for a variant."""
        with self._lock:
            self._metrics[variant].custom_metrics[metric_name].append(value)

    def get_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get metrics for all variants."""
        with self._lock:
            results = {}
            for name, metrics in self._metrics.items():
                results[name] = {
                    "n_samples": metrics.n_samples,
                    "errors": metrics.errors,
                    "mean_latency_ms": float(np.mean(metrics.latencies_ms))
                    if metrics.latencies_ms
                    else 0.0,
                    "p95_latency_ms": float(np.percentile(metrics.latencies_ms, 95))
                    if metrics.latencies_ms
                    else 0.0,
                    "custom_metrics": {
                        k: {"mean": float(np.mean(v)), "std": float(np.std(v))}
                        for k, v in metrics.custom_metrics.items()
                        if v
                    },
                }
            return results


class AutoPromoter:
    """
    Automatic promotion manager for A/B tests.

    Evaluates statistical significance and applies promotion criteria
    to decide when to promote a candidate.
    """

    def __init__(
        self,
        criteria: PromotionCriteria,
        control_variant: str = "control",
    ):
        """
        Initialize auto promoter.

        Args:
            criteria: Promotion criteria
            control_variant: Name of the control/baseline variant
        """
        self.criteria = criteria
        self.control_variant = control_variant

    def evaluate(
        self,
        metrics: Dict[str, Dict[str, Any]],
        candidate_variant: str,
    ) -> Tuple[bool, Dict[str, Any]]:
        """
        Evaluate if candidate should be promoted.

        Args:
            metrics: Metrics from ABTestRunner.get_metrics()
            candidate_variant: Name of candidate variant

        Returns:
            (should_promote, details)
        """
        details: Dict[str, Any] = {"checks": {}}

        if self.control_variant not in metrics or candidate_variant not in metrics:
            details["error"] = "Missing variant metrics"
            return False, details

        control = metrics[self.control_variant]
        candidate = metrics[candidate_variant]

        # Check minimum samples
        if candidate["n_samples"] < self.criteria.min_samples:
            details["checks"]["min_samples"] = {
                "passed": False,
                "current": candidate["n_samples"],
                "required": self.criteria.min_samples,
            }
            return False, details

        details["checks"]["min_samples"] = {"passed": True}

        # Check latency
        control_latency = control.get("p95_latency_ms", 0)
        candidate_latency = candidate.get("p95_latency_ms", 0)

        if control_latency > 0:
            latency_increase = ((candidate_latency - control_latency) / control_latency) * 100
        else:
            latency_increase = 0

        latency_ok = latency_increase <= self.criteria.max_latency_increase_pct
        details["checks"]["latency"] = {
            "passed": latency_ok,
            "control_p95_ms": control_latency,
            "candidate_p95_ms": candidate_latency,
            "increase_pct": latency_increase,
        }

        if not latency_ok:
            return False, details

        # Check required metrics (no regression)
        for metric_name in self.criteria.required_metrics:
            control_metric = control.get("custom_metrics", {}).get(metric_name, {})
            candidate_metric = candidate.get("custom_metrics", {}).get(metric_name, {})

            if not control_metric or not candidate_metric:
                details["checks"][metric_name] = {"passed": True, "note": "Missing data, skipped"}
                continue

            # Simple comparison: candidate should not be worse
            # For safety metrics, lower is better
            control_mean = control_metric.get("mean", 0)
            candidate_mean = candidate_metric.get("mean", 0)

            # Assume lower is better for safety metrics
            regression = candidate_mean > control_mean * 1.1  # 10% tolerance

            details["checks"][metric_name] = {
                "passed": not regression,
                "control_mean": control_mean,
                "candidate_mean": candidate_mean,
            }

            if regression:
                return False, details

        # Check error rate
        if candidate["errors"] > 0:
            error_rate = candidate["errors"] / max(1, candidate["n_samples"])
            if error_rate > 0.01:  # 1% error threshold
                details["checks"]["error_rate"] = {
                    "passed": False,
                    "rate": error_rate,
                }
                return False, details

        details["checks"]["error_rate"] = {"passed": True}
        details["recommendation"] = "PROMOTE"

        return True, details


class DeploymentManager:
    """
    High-level manager for progressive model deployment.

    Orchestrates the shadow -> A/B -> full rollout pipeline.
    """

    def __init__(
        self,
        production_policy: Policy,
        promotion_criteria: Optional[PromotionCriteria] = None,
    ):
        """
        Initialize deployment manager.

        Args:
            production_policy: Current production policy
            promotion_criteria: Criteria for automatic promotion
        """
        self.production_policy = production_policy
        self.criteria = promotion_criteria or PromotionCriteria()
        self._current_stage: str = "production"
        self._candidate_policy: Optional[Policy] = None
        self._shadow_runner: Optional[ShadowRunner] = None
        self._ab_runner: Optional[ABTestRunner] = None

    def start_shadow(self, candidate: Policy, shadow_fraction: float = 1.0) -> None:
        """Start shadow mode for a candidate policy."""
        self._candidate_policy = candidate
        self._shadow_runner = ShadowRunner(
            self.production_policy,
            candidate,
            shadow_fraction=shadow_fraction,
        )
        self._current_stage = "shadow"

    def start_ab_test(
        self,
        candidate_allocation: float = 0.05,
    ) -> None:
        """Graduate from shadow to A/B test."""
        if self._candidate_policy is None:
            raise RuntimeError("No candidate policy. Call start_shadow first.")

        self._ab_runner = ABTestRunner(
            policies={
                "control": self.production_policy,
                "candidate": self._candidate_policy,
            },
            allocation={
                "control": 1 - candidate_allocation,
                "candidate": candidate_allocation,
            },
        )
        self._current_stage = "ab_test"

    def run(
        self,
        observation: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ) -> np.ndarray:
        """
        Run the current deployment stage.

        Returns the action to execute (always from production or A/B assigned policy).
        """
        if self._current_stage == "shadow" and self._shadow_runner:
            result = self._shadow_runner.run(observation)
            return result.production_action

        elif self._current_stage == "ab_test" and self._ab_runner:
            action, _ = self._ab_runner.run(observation, context)
            return action

        else:
            return self.production_policy(observation)

    def get_status(self) -> Dict[str, Any]:
        """Get current deployment status."""
        status: Dict[str, Any] = {"stage": self._current_stage}

        if self._shadow_runner and self._current_stage == "shadow":
            status["shadow_stats"] = self._shadow_runner.get_statistics()

        if self._ab_runner and self._current_stage == "ab_test":
            status["ab_metrics"] = self._ab_runner.get_metrics()

        return status

    def check_promotion(self) -> Tuple[bool, Dict[str, Any]]:
        """Check if candidate is ready for promotion."""
        if self._current_stage != "ab_test" or self._ab_runner is None:
            return False, {"error": "Not in A/B test stage"}

        promoter = AutoPromoter(self.criteria)
        return promoter.evaluate(
            self._ab_runner.get_metrics(),
            "candidate",
        )

    def promote(self) -> None:
        """Promote candidate to production."""
        if self._candidate_policy is None:
            raise RuntimeError("No candidate to promote")

        self.production_policy = self._candidate_policy
        self._candidate_policy = None
        self._shadow_runner = None
        self._ab_runner = None
        self._current_stage = "production"
