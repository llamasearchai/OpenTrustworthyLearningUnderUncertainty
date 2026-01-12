from enum import Enum
from typing import List
from pydantic import BaseModel, Field


class UncertaintyType(str, Enum):
    """Types of uncertainty in learning-based models."""

    ALEATORIC = "aleatoric"  # Irreducible noise
    EPISTEMIC = "epistemic"  # Lack of knowledge


class MitigationState(str, Enum):
    """Operational states for the runtime mitigation controller."""

    NOMINAL = "nominal"
    CAUTIOUS = "cautious"
    FALLBACK = "fallback"
    SAFE_STOP = "safe_stop"
    HUMAN_ESCALATION = "human_escalation"


class UncertaintyEstimate(BaseModel):
    """Standardized output for model uncertainty."""

    confidence: float = Field(..., ge=0.0, le=1.0, description="Overall model confidence")
    aleatoric_score: float = Field(..., ge=0.0, description="Estimate of irreducible noise")
    epistemic_score: float = Field(..., ge=0.0, description="Estimate of knowledge gap")
    source: str = Field(..., description="Method used for estimation, e.g., 'ensemble_variance'")

    # Conformal prediction fields (optional, populated when conformal predictor is used)
    conformal_set_size: int = Field(default=0, ge=0, description="Size of conformal prediction set")
    coverage_probability: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Target coverage probability for conformal set"
    )
    prediction_set: List[int] = Field(
        default_factory=list, description="Conformal prediction set (class indices)"
    )


class RiskAssessment(BaseModel):
    """Operational risk profile for a candidate action."""

    expected_risk: float = Field(..., ge=0.0)
    tail_risk_cvar: float = Field(..., ge=0.0, description="Conditional Value at Risk (tail risk)")
    violation_probability: float = Field(..., ge=0.0, le=1.0)
    is_acceptable: bool = Field(
        ..., description="Whether the risk is within safety acceptance bounds"
    )


class SafetyEnvelope(BaseModel):
    """Constraints that must be respected by the LBM."""

    hard_constraints: List[str] = Field(
        default_factory=list, description="Constraints that cannot be violated"
    )
    soft_constraints: List[str] = Field(
        default_factory=list, description="Constraints that should be minimized"
    )
    violation_threshold: float = Field(
        0.01, ge=0.0, le=1.0, description="Max allowed probability of violation"
    )


class MonitorOutput(BaseModel):
    """Output from a runtime safety monitor."""

    monitor_id: str
    triggered: bool
    severity: float = Field(..., ge=0.0, le=1.0)
    message: str
    timestamp: float
