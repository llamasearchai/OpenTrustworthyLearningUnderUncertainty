import numpy as np
from opentlu.runtime.health import (
    RollingStatistics,
    AlertEngine,
    AlertRule,
)
from opentlu.runtime.logging import (
    InterventionLogger,
    MemoryLogSink,
)
from opentlu.foundations.contracts import MitigationState, UncertaintyEstimate
from opentlu.runtime.ood import MahalanobisDetector, EnergyBasedDetector


def test_rolling_statistics():
    """Test rolling stats computation."""
    stats = RollingStatistics(window_seconds=1.0)

    # Add successful samples
    for _ in range(10):
        stats.record(0.1, success=True)  # 100ms

    assert stats.get_total_count() == (10, 0)
    assert stats.get_error_rate() == 0.0
    assert np.isclose(stats.get_mean(), 0.1)

    # Add errors
    stats.record(0.0, success=False)
    assert stats.get_error_rate() > 0.0


def test_alert_engine():
    """Test alerting logic."""
    engine = AlertEngine()

    # Rule: Trigger if latency > 0.5
    rule = AlertRule(
        name="high_latency", metric="latency", condition=lambda x: x > 0.5, threshold=0.5
    )
    engine.add_rule(rule)

    # Normal
    alerts = engine.evaluate({"latency": 0.2}, {"latency": 10})
    assert len(alerts) == 0

    # Trigger
    alerts = engine.evaluate({"latency": 0.6}, {"latency": 10})
    assert len(alerts) == 1
    assert alerts[0].rule_name == "high_latency"

    # Cooldown check (immediate subsequent call shouldn't trigger if default cooldown > 0)
    alerts = engine.evaluate({"latency": 0.7}, {"latency": 10})
    assert len(alerts) == 0


def test_logger_memory_sink():
    """Test logging system with memory sink."""
    sink = MemoryLogSink()
    logger = InterventionLogger(sink, log_all=True)

    logger.new_trace()
    logger.log(
        observation={"x": 1},
        mitigation_state=MitigationState.NOMINAL,
        uncertainty=UncertaintyEstimate(
            confidence=1.0, aleatoric_score=0.1, epistemic_score=0.1, source="test"
        ),
        ood_score=0.0,
        action_taken=np.array([0.0]),
    )
    logger.close()  # flushes

    records = sink.get_records()
    assert len(records) == 1
    assert records[0].mitigation_state == MitigationState.NOMINAL
    assert "x" in records[0].observation


def test_mahalanobis_ood():
    """Test Mahalanobis distance OOD detector."""
    detector = MahalanobisDetector()

    # Fit on 2D normal data
    data = np.random.normal(0, 1, size=(100, 2))
    detector.fit(data)

    # In-dist
    in_dist = np.array([[0.1, 0.1]])
    score_in = detector.score(in_dist)

    # OOD
    ood = np.array([[10.0, 10.0]])
    score_out = detector.score(ood)

    # Distance should be higher for OOD
    assert score_out > score_in


def test_energy_ood():
    """Test Energy-based OOD detector."""
    detector = EnergyBasedDetector(temperature=1.0)

    # High confidence logic (one high logit) -> Low energy
    logits_in = np.array([[10.0, 1.0, 1.0]])
    score_in = detector.score(logits_in)

    # Low confidence (flat logistics) -> High energy
    logits_out = np.array([[2.0, 2.0, 2.0]])
    score_out = detector.score(logits_out)

    # Energy = -log(sum(exp(x))).
    # exp(10) is large -> sum large -> log large -> -log small (negative large magnitude?)
    # Wait, energy as defined in literature is -T*log...
    # Lower energy is usually ID (higher prob).
    # score() returns negative energy (higher = more OOD) per updated signature conventions usually,
    # OR returns energy itself.
    # Let's check docstring from outline: "Negative energy score (higher = more OOD)"
    # So score_out > score_in

    assert score_out > score_in
