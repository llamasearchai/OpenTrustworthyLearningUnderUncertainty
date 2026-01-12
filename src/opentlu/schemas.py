"""
API Schemas for OpenTLU.

This module contains the Pydantic models used by the API endpoints.
"""

from typing import Any, List, Dict, Optional
from pydantic import BaseModel


class UncertaintyEstimate(BaseModel):
    model_id: str
    timestamp: float
    confidence: float
    aleatoric_score: float
    epistemic_score: float
    total_uncertainty: float
    prediction: List[float]
    prediction_set: Optional[List[int]] = None


class MonitorOutput(BaseModel):
    monitor_id: str
    timestamp: float
    triggered: bool
    severity: float
    message: str
    details: Optional[Dict[str, Any]] = None


class MitigationStateResponse(BaseModel):
    state: str


class Scenario(BaseModel):
    id: str
    name: str
    description: str
    tags: Dict[str, str]
    created_at: float
    updated_at: float


class EvaluationResult(BaseModel):
    scenario_id: str
    timestamp: float
    metrics: Dict[str, float]
    summary: str


class AggregatedResults(BaseModel):
    total_scenarios: int
    avg_uncertainty: float
    avg_risk: float
    safety_compliance: float


class SampleMetadata(BaseModel):
    id: str
    uncertainty: Dict[str, float]
    risk: Dict[str, float]
    novelty_score: float


class AcquisitionConfig(BaseModel):
    weight_uncertainty: float = 1.0
    weight_risk: float = 2.0
    weight_novelty: float = 0.5


class BatchSelectionResult(BaseModel):
    selected_ids: List[str]
    scores: List[float]
    acquisition_values: List[float]


class SafetyTimelineEntry(BaseModel):
    timestamp: float
    mitigation_state: str
    severity: float
    ood_score: float


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    page_size: int
    has_more: bool
