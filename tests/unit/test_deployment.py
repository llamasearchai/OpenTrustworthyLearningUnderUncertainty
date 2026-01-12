from typing import Dict, Any
import numpy as np

from opentlu.evaluation.deployment import (
    ShadowRunner,
    ShadowResult,
    Policy,
    ABTestRunner,
    AutoPromoter,
    PromotionCriteria,
)


class MockPolicy(Policy):
    def __init__(self, action: np.ndarray, delay: float = 0.0):
        self.action = action
        self.delay = delay
        self.called_count = 0

    def __call__(self, observation: Dict[str, Any]) -> np.ndarray:
        self.called_count += 1
        if self.delay > 0:
            import time

            time.sleep(self.delay)
        return self.action


def test_shadow_runner_basic():
    """Test basic shadow mode execution."""
    prod_action = np.array([1.0, 0.0])
    cand_action = np.array([0.9, 0.1])

    prod_policy = MockPolicy(prod_action)
    cand_policy = MockPolicy(cand_action)

    runner = ShadowRunner(prod_policy, cand_policy, shadow_fraction=1.0)

    obs = {"inputs": [1, 2, 3]}
    result = runner.run(obs)

    assert isinstance(result, ShadowResult)
    assert np.array_equal(result.production_action, prod_action)
    assert np.array_equal(result.shadow_action, cand_action)
    assert result.divergence_score >= 0.0

    stats = runner.get_statistics()
    assert stats["n_runs"] == 1
    assert stats["n_runs"] == 1  # Since shadow_fraction=1.0, all requests are shadow runs


def test_shadow_runner_fraction():
    """Test that shadow fraction is respected."""
    prod_policy = MockPolicy(np.array([1.0]))
    cand_policy = MockPolicy(np.array([1.0]))

    # 0% shadow
    runner = ShadowRunner(prod_policy, cand_policy, shadow_fraction=0.0)
    runner.run({})
    assert cand_policy.called_count == 0

    # 100% shadow
    cand_policy.called_count = 0
    runner = ShadowRunner(prod_policy, cand_policy, shadow_fraction=1.0)
    runner.run({})
    assert cand_policy.called_count == 1


def test_ab_test_sticky_bucketing():
    """Test sticky assignment in A/B testing."""
    policy_a = MockPolicy(np.array([0.0]))
    policy_b = MockPolicy(np.array([1.0]))

    policies = {"A": policy_a, "B": policy_b}
    allocation = {"A": 0.5, "B": 0.5}

    runner = ABTestRunner(policies, allocation, sticky_key="user_id")

    # User 1 should always get same variant
    ctx1 = {"user_id": "user1"}
    action1, variant1 = runner.run({}, ctx1)

    for _ in range(10):
        a, v = runner.run({}, ctx1)
        assert v == variant1

    # User 2 should get consistent var
    ctx2 = {"user_id": "user2"}
    action2, variant2 = runner.run({}, ctx2)

    for _ in range(10):
        a, v = runner.run({}, ctx2)
        assert v == variant2


def test_ab_test_metrics():
    """Test metric recording in A/B runner."""
    policy = MockPolicy(np.array([0.0]))
    runner = ABTestRunner({"A": policy}, {"A": 1.0})

    runner.run({})
    runner.record_metric("A", "reward", 10.0)
    runner.record_metric("A", "reward", 20.0)

    metrics = runner.get_metrics()
    assert metrics["A"]["n_samples"] == 1
    assert metrics["A"]["custom_metrics"]["reward"]["mean"] == 15.0  # (10+20)/2


def test_auto_promoter():
    """Test auto-promotion logic."""
    criteria = PromotionCriteria(min_samples=10, max_latency_increase_pct=10.0, min_confidence=0.95)
    promoter = AutoPromoter(criteria, control_variant="control")

    # Construct metrics
    metrics = {
        "control": {
            "n_samples": 100,
            "mean_latency_ms": 10.0,
            "p95_latency_ms": 10.0,
            "errors": 0,
            "custom_metrics": {},
        },
        "candidate": {
            "n_samples": 100,
            "mean_latency_ms": 10.5,
            "p95_latency_ms": 10.5,  # 5% increase (acceptable)
            "errors": 0,
            "custom_metrics": {},
        },
    }

    # Should promote
    promote, details = promoter.evaluate(metrics, "candidate")
    assert promote, f"Should promote but got: {details}"

    # Change to high latency
    metrics["candidate"]["p95_latency_ms"] = 15.0  # 50% increase (too high)
    promote, details = promoter.evaluate(metrics, "candidate")
    assert not promote
    assert not details["checks"]["latency"]["passed"]
