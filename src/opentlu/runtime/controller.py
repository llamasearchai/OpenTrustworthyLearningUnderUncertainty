from typing import Any, Dict, List
from opentlu.foundations.contracts import MitigationState, UncertaintyEstimate
from opentlu.safety.monitors import BaseMonitor


class MitigationController:
    """
    Finite State Machine for runtime safety and mitigation.
    Transitions: Nominal -> Cautious -> Fallback -> Safe Stop -> Human Escalation.
    """

    def __init__(
        self,
        monitors: List[BaseMonitor],
        uncertainty_threshold: float = 0.5,
        ood_threshold: float = 0.8,
    ):
        self.monitors = monitors
        self.uncertainty_threshold = uncertainty_threshold
        self.ood_threshold = ood_threshold
        self.current_state = MitigationState.NOMINAL

    def step(
        self, state: Dict[str, Any], uncertainty: UncertaintyEstimate, ood_score: float
    ) -> MitigationState:
        """
        Execute one control step to determine mitigation state.

        Args:
            state: Current system state.
            uncertainty: Uncertainty estimate from the model.
            ood_score: Out-of-distribution score (higher is more OOD).

        Returns:
            New MitigationState.
        """
        # 1. Check Monitors
        monitor_outputs = [m.check(state) for m in self.monitors]
        max_severity = max([m.severity for m in monitor_outputs]) if monitor_outputs else 0.0

        # 2. Determine State Transition
        new_state = MitigationState.NOMINAL

        # Critical Safety Failure -> SAFE STOP
        if max_severity >= 1.0:
            new_state = MitigationState.SAFE_STOP

        # OOD or Soft Monitor Violation -> FALLBACK
        elif ood_score > self.ood_threshold or max_severity > 0.1:
            new_state = MitigationState.FALLBACK

        # High Uncertainty -> CAUTIOUS
        elif uncertainty.epistemic_score > self.uncertainty_threshold:
            new_state = MitigationState.CAUTIOUS

        self.current_state = new_state
        return new_state
