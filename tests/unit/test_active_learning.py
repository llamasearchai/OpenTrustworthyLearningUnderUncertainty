from opentlu.active_learning.acquisition import (
    DataAcquisitionPolicy,
    AcquisitionConfig,
    SampleMetadata,
)
from opentlu.foundations.contracts import UncertaintyEstimate, RiskAssessment


def create_sample(id, ep_score, risk_val, novelty):
    unc = UncertaintyEstimate(
        confidence=0.5, aleatoric_score=0.1, epistemic_score=ep_score, source="test"
    )
    risk = RiskAssessment(
        expected_risk=risk_val, tail_risk_cvar=0.1, violation_probability=0.1, is_acceptable=True
    )
    return SampleMetadata(id, unc, risk, novelty)


def test_acquisition_scoring():
    config = AcquisitionConfig(weight_uncertainty=1.0, weight_risk=1.0, weight_novelty=1.0)
    policy = DataAcquisitionPolicy(config)

    # S1: High Uncertainty (1.0), Low Risk (0.0), Low Novelty (0.0) -> Score 1.0
    s1 = create_sample("s1", 1.0, 0.0, 0.0)
    # S2: Low Uncertainty (0.0), High Risk (1.0), Low Novelty (0.0) -> Score 1.0
    s2 = create_sample("s2", 0.0, 1.0, 0.0)
    # S3: All High -> Score 3.0
    s3 = create_sample("s3", 1.0, 1.0, 1.0)

    scores = policy.compute_scores([s1, s2, s3])
    assert scores == [1.0, 1.0, 3.0]


def test_selection():
    config = AcquisitionConfig(weight_uncertainty=1.0, weight_risk=1.0, weight_novelty=1.0)
    policy = DataAcquisitionPolicy(config)

    s1 = create_sample("s1", 0.5, 0.0, 0.0)  # 0.5
    s2 = create_sample("s2", 1.0, 0.0, 0.0)  # 1.0
    s3 = create_sample("s3", 2.0, 0.0, 0.0)  # 2.0 (Highest)

    batch = policy.select_batch([s1, s2, s3], batch_size=2)
    assert batch == ["s3", "s2"]
