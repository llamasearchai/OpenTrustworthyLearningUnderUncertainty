import typing
from opentlu.foundations.contracts import MitigationState, UncertaintyEstimate
from opentlu.runtime.controller import MitigationController
from opentlu.safety.monitors import BaseMonitor, MonitorOutput


class MockMonitor(BaseMonitor):
    def __init__(self, severity: float):
        super().__init__("mock")
        self.severity = severity

    def check(self, state: typing.Dict[str, typing.Any]) -> MonitorOutput:
        triggered = self.severity > 0
        import time

        return MonitorOutput(
            monitor_id=self.monitor_id,
            triggered=triggered,
            severity=self.severity,
            message="Mock",
            timestamp=time.time(),
        )


def test_nominal_state():
    monitor = MockMonitor(severity=0.0)
    controller = MitigationController([monitor])

    unc = UncertaintyEstimate(
        confidence=1.0, aleatoric_score=0.1, epistemic_score=0.1, source="test"
    )
    state = controller.step({}, unc, ood_score=0.0)

    assert state == MitigationState.NOMINAL


def test_cautious_state():
    monitor = MockMonitor(severity=0.0)
    controller = MitigationController([monitor], uncertainty_threshold=0.5)

    # High epistemic -> Cautious
    unc = UncertaintyEstimate(
        confidence=0.5, aleatoric_score=0.1, epistemic_score=0.6, source="test"
    )
    state = controller.step({}, unc, ood_score=0.0)

    assert state == MitigationState.CAUTIOUS


def test_fallback_ood():
    monitor = MockMonitor(severity=0.0)
    controller = MitigationController([monitor], ood_threshold=0.8)

    unc = UncertaintyEstimate(
        confidence=1.0, aleatoric_score=0.1, epistemic_score=0.1, source="test"
    )
    state = controller.step({}, unc, ood_score=0.9)

    assert state == MitigationState.FALLBACK


def test_safe_stop_monitor():
    # Severity 1.0 -> Safe Stop
    monitor = MockMonitor(severity=1.0)
    controller = MitigationController([monitor])

    unc = UncertaintyEstimate(
        confidence=1.0, aleatoric_score=0.1, epistemic_score=0.1, source="test"
    )
    state = controller.step({}, unc, ood_score=0.0)

    assert state == MitigationState.SAFE_STOP
