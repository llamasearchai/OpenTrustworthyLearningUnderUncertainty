from opentlu.evaluation.engine import Evaluator, Scenario, EvaluationResult


def test_evaluation_pass():
    evaluator = Evaluator(acceptance_thresholds={"collision_rate": 0.1})

    scenario = Scenario(id="s1", tags={}, data=None)
    metrics = {"collision_rate": 0.05, "efficiency": 0.9}

    result = evaluator.evaluate_scenario(scenario, metrics)
    assert result.passed
    assert result.metrics == metrics


def test_evaluation_fail():
    evaluator = Evaluator(acceptance_thresholds={"collision_rate": 0.1})

    scenario = Scenario(id="s1", tags={}, data=None)
    metrics = {"collision_rate": 0.2}

    result = evaluator.evaluate_scenario(scenario, metrics)
    assert not result.passed


def test_aggregation():
    evaluator = Evaluator({})
    results = [
        EvaluationResult("s1", {"score": 10.0}, True),
        EvaluationResult("s2", {"score": 20.0}, False),  # Passed flag doesn't affect metric mean
    ]

    agg = evaluator.aggregate_results(results)
    assert agg["total_scenarios"] == 2
    assert agg["pass_rate"] == 0.5
    assert agg["mean_metrics"]["score"] == 15.0
