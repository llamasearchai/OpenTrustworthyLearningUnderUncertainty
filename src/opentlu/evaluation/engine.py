from typing import Any, Dict, List
from dataclasses import dataclass
import numpy as np


@dataclass
class Scenario:
    id: str
    tags: Dict[str, str]  # e.g. {"lighting": "night", "density": "high"}
    data: Any


@dataclass
class EvaluationResult:
    scenario_id: str
    metrics: Dict[str, float]
    passed: bool


class Evaluator:
    """
    Harness for rigorous policy evaluation.
    """

    def __init__(self, acceptance_thresholds: Dict[str, float]):
        self.acceptance_thresholds = acceptance_thresholds

    def evaluate_scenario(self, scenario: Scenario, metrics: Dict[str, float]) -> EvaluationResult:
        """
        Evaluate a single scenario against thresholds.
        """
        passed = True
        for metric, value in metrics.items():
            if metric in self.acceptance_thresholds:
                threshold = self.acceptance_thresholds[metric]
                # Assuming all thresholds are Upper Bounds (e.g. max collision rate)
                if value > threshold:
                    passed = False

        return EvaluationResult(scenario_id=scenario.id, metrics=metrics, passed=passed)

    def aggregate_results(self, results: List[EvaluationResult]) -> Dict[str, Any]:
        """
        Compute aggregate and stratified metrics.
        """
        total = len(results)
        passed_count = sum(1 for r in results if r.passed)

        # Simple aggregation
        agg_metrics: Dict[str, List[float]] = {}
        for r in results:
            for k, v in r.metrics.items():
                if k not in agg_metrics:
                    agg_metrics[k] = []
                agg_metrics[k].append(v)

        means = {k: float(np.mean(v)) for k, v in agg_metrics.items()}

        return {
            "total_scenarios": total,
            "pass_rate": passed_count / total if total > 0 else 0.0,
            "mean_metrics": means,
        }
