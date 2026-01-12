from opentlu.foundations.contracts import UncertaintyEstimate, MitigationState
from opentlu.safety.monitors import ConstraintMonitor
from opentlu.runtime.controller import MitigationController
from opentlu.runtime.ood import MahalanobisDetector
import numpy as np


def test_full_mitigation_loop():
    """
    Verify the entire pipeline:
    Monitor Check -> OOD Check -> Uncertainty Check -> Controller Decision.
    """
    # 1. Setup Components
    # Monitor: Speed limit 10
    speed_monitor = ConstraintMonitor("speed", limit=10.0, metric_key="speed")

    # OOD Detector: 1D Gaussian N(0, 1)
    ood_detector = MahalanobisDetector(mean=np.array([0.0]), precision=np.array([[1.0]]))

    # Controller
    controller = MitigationController(
        monitors=[speed_monitor],
        uncertainty_threshold=0.5,
        ood_threshold=2.0,  # > 2 std devs
    )

    # 2. Scenario A: Nominal
    # Speed 5 (OK), Input 0.1 (In-dist), Uncertainty Low
    state = {"speed": 5.0}
    inputs = np.array([0.1])
    unc = UncertaintyEstimate(
        confidence=0.9, aleatoric_score=0.1, epistemic_score=0.1, source="model"
    )

    ood_score = ood_detector.score(inputs)
    decision = controller.step(state, unc, ood_score)
    assert decision == MitigationState.NOMINAL

    # 3. Scenario B: High Uncertainty -> Cautious
    unc_high = UncertaintyEstimate(
        confidence=0.4, aleatoric_score=0.1, epistemic_score=0.6, source="model"
    )
    decision = controller.step(state, unc_high, ood_score)
    assert decision == MitigationState.CAUTIOUS

    # 4. Scenario C: OOD -> Fallback
    # Input 3.0 (3 std devs out)
    inputs_ood = np.array([3.0])
    ood_score_high = ood_detector.score(inputs_ood)
    decision = controller.step(state, unc, ood_score_high)
    assert decision == MitigationState.FALLBACK

    # 5. Scenario D: Safety Violation -> Safe Stop
    # Speed 15 (Likely severe) or at least Fallback/SafeStop
    # Monitor Severity: (15-10)/10 = 0.5. Map says max_severity > 0.1 -> Fallback.
    # If severity >= 1.0 (limit=10, val=20) -> Safe Stop.
    state_unsafe = {"speed": 20.0}
    decision = controller.step(state_unsafe, unc, ood_score)
    assert decision == MitigationState.SAFE_STOP
