from typing import Any, List
from opentlu.evaluation.engine import Evaluator


class ReplayBuffer:
    """
    Manages data for continual learning to prevent catastrophic forgetting.
    """

    def __init__(self, capacity: int = 1000):
        self.capacity = capacity
        self.buffer: List[Any] = []

    def add(self, sample: Any) -> None:
        if len(self.buffer) >= self.capacity:
            # Simple FIFO for now, but should be stratified
            self.buffer.pop(0)
        self.buffer.append(sample)

    def sample(self, batch_size: int) -> List[Any]:
        import random

        if not self.buffer:
            return []
        count = min(batch_size, len(self.buffer))
        return random.sample(self.buffer, count)


class ContinualLearner:
    """
    Manager for safe model updates.
    """

    def __init__(self, replay_buffer: ReplayBuffer, evaluator: Evaluator):
        self.replay_buffer = replay_buffer
        self.evaluator = evaluator

    def validate_update(self, candidate_model: Any, test_scenarios: List[Any]) -> bool:
        """
        Gate a model update: must pass evaluation suite.
        """
        # Pseudo-code logic for simulation
        results = [
            self.evaluator.evaluate_scenario(s, {"loss": 0.1})  # Mock evaluation
            for s in test_scenarios
        ]
        agg = self.evaluator.aggregate_results(results)

        # Explicit bool cast for strict typing
        return bool(agg["pass_rate"] == 1.0)
