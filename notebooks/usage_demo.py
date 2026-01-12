#!/usr/bin/env python
# coding: utf-8

# # OpenTLU Usage Demo
# 
# This notebook demonstrates the core capabilities of the OpenTLU (Trustworthy Learning in Uncertainty) framework.
# 
# We will cover:
# 1.  **Safety Filtering**: Ensuring actions stay within safe constraints.
# 2.  **Uncertainty Estimation**: Generating uncertainty metrics for predictions.
# 3.  **Active Learning**: Selecting informative samples based on uncertainty and risk.
# 4.  **Runtime Control**: Monitoring system health and handling Out-of-Distribution (OOD) events.
# 5.  **Evaluation**: Rigorous statistical evaluation of system performance.

# ## 1. Safety Filtering
# 
# We define a safety envelope using box constraints and linear constraints, then use the `SafetyFilter` to correct unsafe actions.

# In[ ]:


import numpy as np
from opentlu.safety.filter import SafetyFilter, BoxConstraint, LinearConstraint
from opentlu.foundations.contracts import SafetyEnvelope

# Define constraints
# Action must be between [-1, 1]
box = BoxConstraint(lower=np.array([-1.0]), upper=np.array([1.0]))

# Initialize Safety Filter
envelope = SafetyEnvelope(source="demo_envelope", constraints=["box_limit"])
safety_filter = SafetyFilter(envelope=envelope, box_constraints=[box])

# Test Safe Action
safe_action = np.array([0.5])
res_safe = safety_filter.filter(safe_action)
print(f"Original: {safe_action}, Filtered: {res_safe.action}, Modified: {res_safe.was_modified}")

# Test Unsafe Action (Outside bounds)
unsafe_action = np.array([2.5])
res_unsafe = safety_filter.filter(unsafe_action)
print(f"Original: {unsafe_action}, Filtered: {res_unsafe.action}, Modified: {res_unsafe.was_modified}")


# ## 2. Uncertainty & Risk Estimation
# 
# We simulate uncertainty estimates (aleatoric vs epistemic) and assess risk.

# In[ ]:


from opentlu.foundations.contracts import UncertaintyEstimate, RiskAssessment

# Simulate high epistemic uncertainty (model doesn't know)
unc_est = UncertaintyEstimate(
    confidence=0.4,
    aleatoric_score=0.2,
    epistemic_score=0.8,
    source="ensemble_model"
)

# Define risk assessment
risk = RiskAssessment(
    expected_risk=0.5,
    tail_risk_cvar=0.8,
    violation_probability=0.1,
    is_acceptable=False
)

print(f"Uncertainty: {unc_est}")
print(f"Risk Assessment: {risk}")


# ## 3. Active Learning
# 
# Use the `DataAcquisitionPolicy` to select the most important samples for labeling based on uncertainty, risk, and novelty.

# In[ ]:


from opentlu.active_learning.acquisition import DataAcquisitionPolicy, AcquisitionConfig, SampleMetadata

# Configure policy to prioritize high uncertainty and high risk
config = AcquisitionConfig(weight_uncertainty=1.0, weight_risk=1.0, weight_novelty=0.5)
policy = DataAcquisitionPolicy(config)

# Create dummy samples
def make_sample(id, unc_score, risk_score):
    u = UncertaintyEstimate(
        confidence=0.5,
        aleatoric_score=0.1,
        epistemic_score=unc_score,
        source="test"
    )
    r = RiskAssessment(
        expected_risk=risk_score,
        tail_risk_cvar=0.0,
        violation_probability=0.0,
        is_acceptable=True
    )
    return SampleMetadata(id, u, r, novelty_score=0.0)

samples = [
    make_sample("s1_low", 0.1, 0.1),
    make_sample("s2_med", 0.5, 0.5),
    make_sample("s3_high", 0.9, 0.9)
]

scores = policy.compute_scores(samples)
selected = policy.select_batch(samples, batch_size=1)

print("Scores:", scores)
print("Selected Sample:", selected)


# ## 4. Runtime Control & OOD Detection
# 
# Monitor the system for health issues or Out-of-Distribution events and trigger mitigations.

# In[ ]:


from opentlu.runtime.controller import MitigationController
from opentlu.runtime.ood import MahalanobisDetector
from opentlu.foundations.contracts import MitigationState

# Initialize Controller
controller = MitigationController(monitors=[])

# Simulate Normal Operation
state_nominal = controller.step({}, unc_est, ood_score=0.2)
print(f"State (Normal OOD): {state_nominal}")

# Simulate High OOD
state_fallback = controller.step({}, unc_est, ood_score=0.95)
print(f"State (High OOD): {state_fallback}")


# ## 5. Statistical Evaluation
# 
# Evaluate model performance with rigorous confidence intervals.

# In[ ]:


from opentlu.evaluation.statistics import StatisticalEvaluator

# Evaluator with threshold for acceptance
evaluator = StatisticalEvaluator(acceptance_thresholds={"accuracy": 0.9})

# Simulate results
results = [
    {"metrics": {"accuracy": 0.95}, "passed": True, "tags": {"weather": "clear"}},
    {"metrics": {"accuracy": 0.92}, "passed": True, "tags": {"weather": "clear"}},
    {"metrics": {"accuracy": 0.60}, "passed": False, "tags": {"weather": "rain"}}
]

agg = evaluator.aggregate_results(results, stratify_by=["weather"])

print(f"Overall Pass Rate: {agg.pass_rate.value:.2f} [{agg.pass_rate.ci_lower:.2f}, {agg.pass_rate.ci_upper:.2f}]")
print("Stratified Accuracy (Rain):", agg.stratified_metrics["weather"].strata["rain"]["accuracy"].value)

