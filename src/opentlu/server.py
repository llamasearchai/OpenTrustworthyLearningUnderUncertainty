"""
FastAPI Server for OpenTLU Backend

Provides REST API endpoints for the frontend application.
"""

import random
import uuid
import os
from datetime import datetime
from typing import Any, Dict, List

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from opentlu.schemas import (
    AcquisitionConfig,
    AggregatedResults,
    BatchSelectionResult,
    EvaluationResult,
    MitigationStateResponse,
    MonitorOutput,
    PaginatedResponse,
    SafetyTimelineEntry,
    Scenario,
    UncertaintyEstimate,
)
from opentlu.mocks import (
    generate_monitor,
    generate_sample,
    generate_scenario,
    generate_uncertainty_estimate,
)

app = FastAPI(
    title="OpenTLU API",
    description="Trustworthy Learning in Uncertainty API",
    version="0.1.0",
)

# CORS middleware for frontend - allow all localhost ports for development
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|0\.0\.0\.0):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# API Endpoints
# ============================================================================


@app.get("/api/uncertainty/estimate")
async def get_uncertainty_estimate(model_id: str = "default") -> UncertaintyEstimate:
    return generate_uncertainty_estimate(model_id)


@app.get("/api/monitors")
async def get_monitors() -> List[MonitorOutput]:
    monitor_ids = ["safety_envelope", "ood_detector", "drift_monitor", "constraint_checker"]
    return [generate_monitor(mid) for mid in monitor_ids]


@app.get("/api/monitors/{monitor_id}")
async def get_monitor(monitor_id: str) -> MonitorOutput:
    return generate_monitor(monitor_id)


@app.get("/api/mitigation/state")
async def get_mitigation_state() -> MitigationStateResponse:
    states = ["nominal", "cautious", "fallback", "safe_stop", "human_escalation"]
    weights = [0.6, 0.2, 0.1, 0.05, 0.05]
    state = random.choices(states, weights=weights)[0]
    return MitigationStateResponse(state=state)


@app.get("/api/scenarios")
async def list_scenarios(page: int = 1, page_size: int = 10) -> PaginatedResponse:
    total = 25
    scenarios = [generate_scenario(str(uuid.uuid4())) for _ in range(min(page_size, total))]
    return PaginatedResponse(
        items=[s.model_dump() for s in scenarios],
        total=total,
        page=page,
        page_size=page_size,
        has_more=page * page_size < total,
    )


@app.get("/api/scenarios/{scenario_id}")
async def get_scenario(scenario_id: str) -> Scenario:
    return generate_scenario(scenario_id)


@app.post("/api/scenarios")
async def create_scenario(scenario: Dict[str, Any]) -> Scenario:
    return Scenario(
        id=str(uuid.uuid4()),
        name=scenario.get("name", "New Scenario"),
        description=scenario.get("description", ""),
        tags=scenario.get("tags", {}),
        created_at=datetime.now().timestamp(),
        updated_at=datetime.now().timestamp(),
    )


@app.delete("/api/scenarios/{scenario_id}")
async def delete_scenario(scenario_id: str) -> Dict[str, bool]:
    return {"success": True}


@app.post("/api/evaluate")
async def run_evaluation(request: Dict[str, Any]) -> EvaluationResult:
    return EvaluationResult(
        scenario_id=request.get("scenario_id", "unknown"),
        timestamp=datetime.now().timestamp(),
        metrics={
            "accuracy": random.uniform(0.8, 0.99),
            "calibration_error": random.uniform(0.01, 0.1),
            "coverage": random.uniform(0.9, 0.99),
        },
        summary="Evaluation completed successfully",
    )


@app.post("/api/evaluation/aggregate")
async def aggregate_evaluation(request: Dict[str, Any] | None = None) -> AggregatedResults:
    return AggregatedResults(
        total_scenarios=random.randint(5, 50),
        avg_uncertainty=random.uniform(0.1, 0.3),
        avg_risk=random.uniform(0.1, 0.4),
        safety_compliance=random.uniform(0.9, 0.99),
    )


@app.get("/api/samples")
async def get_samples(
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "uncertainty",
    sort_order: str = "desc",
) -> PaginatedResponse:
    total = 100
    samples = [generate_sample(str(uuid.uuid4())) for _ in range(min(page_size, total))]
    return PaginatedResponse(
        items=[s.model_dump() for s in samples],
        total=total,
        page=page,
        page_size=page_size,
        has_more=page * page_size < total,
    )


@app.post("/api/acquisition/select")
async def select_batch(request: Dict[str, Any]) -> BatchSelectionResult:
    sample_ids = request.get("sample_ids", [])
    batch_size = request.get("batch_size", 10)
    selected = (
        sample_ids[:batch_size] if sample_ids else [str(uuid.uuid4()) for _ in range(batch_size)]
    )
    return BatchSelectionResult(
        selected_ids=selected,
        scores=[random.uniform(0.5, 1.0) for _ in selected],
        acquisition_values=[random.uniform(0.3, 0.9) for _ in selected],
    )


@app.get("/api/acquisition/config")
async def get_acquisition_config() -> AcquisitionConfig:
    return AcquisitionConfig()


@app.patch("/api/acquisition/config")
async def update_acquisition_config(config: Dict[str, Any]) -> AcquisitionConfig:
    return AcquisitionConfig(**config)


@app.get("/api/safety/timeline")
async def get_safety_timeline(limit: int = 100) -> List[SafetyTimelineEntry]:
    states = ["nominal", "cautious", "fallback"]
    entries = []
    base_time = datetime.now().timestamp()
    for i in range(min(limit, 50)):
        entries.append(
            SafetyTimelineEntry(
                timestamp=base_time - i * 60,
                mitigation_state=random.choice(states),
                severity=random.uniform(0, 0.5),
                ood_score=random.uniform(0, 0.3),
            )
        )
    return entries


@app.post("/api/conformal/configure")
async def configure_conformal(config: Dict[str, Any]) -> Dict[str, bool]:
    return {"success": True}


@app.post("/api/conformal/predict")
async def conformal_predict(request: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "prediction_set": [0, 1],
        "coverage": 0.95,
        "set_size": 2,
    }


@app.post("/api/ood/detect")
async def detect_ood(request: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "is_ood": random.random() < 0.1,
        "score": random.uniform(0, 1),
        "threshold": 0.5,
    }


@app.get("/api/calibration/metrics")
async def get_calibration_metrics(model_id: str = "default") -> Dict[str, Any]:
    return {
        "ece": random.uniform(0.01, 0.1),
        "mce": random.uniform(0.05, 0.2),
        "brier_score": random.uniform(0.1, 0.3),
        "reliability_diagram": {
            "bins": [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
            "accuracy": [random.uniform(0.05, 0.95) for _ in range(10)],
            "confidence": [0.05 + i * 0.1 for i in range(10)],
        },
    }


# Health check endpoint
@app.get("/api/health")
async def health_check() -> Dict[str, str]:
    return {"status": "healthy", "version": "0.1.0"}


if __name__ == "__main__":
    import socket
    import uvicorn

    def find_free_port(start_port: int = 8000, max_tries: int = 200) -> int:
        """Find a free TCP port starting at start_port."""
        for port in range(start_port, start_port + max_tries):
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                    s.bind(("0.0.0.0", port))
                return port
            except OSError:
                continue
        raise RuntimeError(f"Failed to find free port in range {start_port}-{start_port + max_tries - 1}")

    port_env = os.environ.get("PORT")
    port = int(port_env) if port_env else find_free_port(8000)
    print(f"\n{'='*60}")
    print("OpenTLU Backend Server")
    print(f"{'='*60}")
    print(f"  API:     http://localhost:{port}")
    print(f"  Docs:    http://localhost:{port}/docs")
    print(f"  Port:    {port}")
    print(f"{'='*60}\n")

    uvicorn.run(app, host="0.0.0.0", port=port)
