"""
Mock Data Generators for OpenTLU.

This module provides functions to generate realistic mock data for testing
and development purposes, simulating the output of various system components.
"""

import random
from datetime import datetime


from opentlu.schemas import (
    UncertaintyEstimate,
    MonitorOutput,
    Scenario,
    SampleMetadata,
)


def generate_uncertainty_estimate(model_id: str = "default") -> UncertaintyEstimate:
    """Generate a mock uncertainty estimate."""
    return UncertaintyEstimate(
        model_id=model_id,
        timestamp=datetime.now().timestamp(),
        confidence=random.uniform(0.7, 0.99),
        aleatoric_score=random.uniform(0.01, 0.2),
        epistemic_score=random.uniform(0.01, 0.15),
        total_uncertainty=random.uniform(0.05, 0.3),
        prediction=[random.random() for _ in range(5)],
        prediction_set=[0, 1, 2],
    )


def generate_monitor(monitor_id: str) -> MonitorOutput:
    """Generate a mock monitor output."""
    triggered = random.random() < 0.2
    return MonitorOutput(
        monitor_id=monitor_id,
        timestamp=datetime.now().timestamp(),
        triggered=triggered,
        severity=random.uniform(0.5, 1.0) if triggered else random.uniform(0, 0.3),
        message=f"Monitor {monitor_id} status: {'ALERT' if triggered else 'Normal'}",
        details={"check_count": random.randint(1, 100)},
    )


def generate_scenario(scenario_id: str) -> Scenario:
    """Generate a mock scenario."""
    return Scenario(
        id=scenario_id,
        name=f"Scenario {scenario_id[:8]}",
        description="Test scenario for evaluation",
        tags={"type": "test", "priority": random.choice(["low", "medium", "high"])},
        created_at=datetime.now().timestamp() - random.randint(0, 86400 * 30),
        updated_at=datetime.now().timestamp(),
    )


def generate_sample(sample_id: str) -> SampleMetadata:
    """Generate mock sample metadata."""
    return SampleMetadata(
        id=sample_id,
        uncertainty={
            "confidence": random.uniform(0.5, 0.99),
            "aleatoric_score": random.uniform(0.01, 0.3),
            "epistemic_score": random.uniform(0.01, 0.25),
        },
        risk={
            "expected_risk": random.uniform(0, 1),
            "cvar": random.uniform(0, 0.5),
        },
        novelty_score=random.uniform(0, 1),
    )
