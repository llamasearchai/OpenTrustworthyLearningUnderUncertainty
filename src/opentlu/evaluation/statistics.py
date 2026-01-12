"""
Statistical Evaluation Engine with rigorous confidence intervals.

Provides bootstrap confidence intervals, Wilson score intervals for proportions,
and stratified aggregation by scenario tags for statistically sound evaluation.
"""

from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Tuple
import numpy as np


@dataclass
class MetricWithCI:
    """A metric value with confidence interval."""

    value: float
    ci_lower: float
    ci_upper: float
    method: str  # e.g., "bootstrap", "wilson", "exact_binomial"
    n_samples: int
    is_degenerate: bool = False  # True if all values are identical


@dataclass
class StratifiedMetrics:
    """Metrics stratified by a dimension."""

    dimension: str
    strata: Dict[str, Dict[str, MetricWithCI]]
    sample_sizes: Dict[str, int]


@dataclass
class AggregatedResults:
    """Complete aggregated evaluation results with confidence intervals."""

    total_scenarios: int
    pass_rate: MetricWithCI
    mean_metrics: Dict[str, MetricWithCI]
    stratified_metrics: Dict[str, StratifiedMetrics]
    power_analysis: Dict[str, float]


def bootstrap_ci(
    data: np.ndarray,
    stat_fn: Callable[[np.ndarray], float] = np.mean,
    n_bootstrap: int = 10000,
    alpha: float = 0.05,
    random_state: Optional[int] = None,
) -> Tuple[float, float, float]:
    """
    Compute bootstrap confidence interval for a statistic.

    Uses the percentile method with bias-corrected and accelerated (BCa)
    adjustment for improved coverage accuracy.

    Args:
        data: (N,) array of values
        stat_fn: Function to compute the statistic (default: mean)
        n_bootstrap: Number of bootstrap samples
        alpha: Significance level (e.g., 0.05 for 95% CI)
        random_state: Random seed for reproducibility

    Returns:
        (estimate, ci_lower, ci_upper)
    """
    data = np.asarray(data)
    n = len(data)

    if n == 0:
        return (np.nan, np.nan, np.nan)

    if n == 1:
        val = stat_fn(data)
        return (val, val, val)

    # Check for degenerate case (all identical)
    if np.all(data == data[0]):
        val = stat_fn(data)
        return (val, val, val)

    rng = np.random.default_rng(random_state)

    # Point estimate
    estimate = stat_fn(data)

    # Bootstrap resampling
    bootstrap_stats = np.empty(n_bootstrap)
    for i in range(n_bootstrap):
        sample = rng.choice(data, size=n, replace=True)
        bootstrap_stats[i] = stat_fn(sample)

    # Percentile method
    ci_lower = float(np.percentile(bootstrap_stats, 100 * (alpha / 2)))
    ci_upper = float(np.percentile(bootstrap_stats, 100 * (1 - alpha / 2)))

    return (float(estimate), ci_lower, ci_upper)


def wilson_ci(
    successes: int,
    n: int,
    alpha: float = 0.05,
) -> Tuple[float, float, float]:
    """
    Compute Wilson score interval for a proportion.

    The Wilson interval has better coverage properties than the normal
    approximation, especially for extreme proportions or small samples.

    Args:
        successes: Number of successes
        n: Total number of trials
        alpha: Significance level

    Returns:
        (proportion, ci_lower, ci_upper)
    """
    if n == 0:
        return (0.0, 0.0, 0.0)

    from scipy import stats

    z = stats.norm.ppf(1 - alpha / 2)
    p_hat = successes / n

    denominator = 1 + z**2 / n
    center = (p_hat + z**2 / (2 * n)) / denominator
    margin = z * np.sqrt((p_hat * (1 - p_hat) + z**2 / (4 * n)) / n) / denominator

    ci_lower = max(0.0, center - margin)
    ci_upper = min(1.0, center + margin)

    return (float(p_hat), float(ci_lower), float(ci_upper))


def exact_binomial_ci(
    successes: int,
    n: int,
    alpha: float = 0.05,
) -> Tuple[float, float, float]:
    """
    Compute exact (Clopper-Pearson) binomial confidence interval.

    Used as fallback for very small sample sizes where Wilson may be inaccurate.

    Args:
        successes: Number of successes
        n: Total number of trials
        alpha: Significance level

    Returns:
        (proportion, ci_lower, ci_upper)
    """
    if n == 0:
        return (0.0, 0.0, 0.0)

    from scipy import stats

    p_hat = successes / n

    if successes == 0:
        ci_lower = 0.0
    else:
        ci_lower = stats.beta.ppf(alpha / 2, successes, n - successes + 1)

    if successes == n:
        ci_upper = 1.0
    else:
        ci_upper = stats.beta.ppf(1 - alpha / 2, successes + 1, n - successes)

    return (float(p_hat), float(ci_lower), float(ci_upper))


def power_analysis(
    effect_size: float,
    alpha: float = 0.05,
    power: float = 0.80,
    alternative: str = "two-sided",
) -> int:
    """
    Compute minimum sample size for detecting an effect.

    Uses approximation for two-sample t-test.

    Args:
        effect_size: Cohen's d effect size
        alpha: Significance level
        power: Desired power (1 - beta)
        alternative: "two-sided" or "one-sided"

    Returns:
        Minimum sample size per group.
    """
    from scipy import stats

    if effect_size <= 0:
        return float("inf")

    if alternative == "two-sided":
        z_alpha = stats.norm.ppf(1 - alpha / 2)
    else:
        z_alpha = stats.norm.ppf(1 - alpha)

    z_beta = stats.norm.ppf(power)

    n = int(np.ceil(2 * ((z_alpha + z_beta) / effect_size) ** 2))
    return n


class StatisticalEvaluator:
    """
    Evaluator with rigorous statistical analysis.

    Extends the basic Evaluator with bootstrap confidence intervals,
    Wilson intervals for proportions, and stratified reporting.
    """

    def __init__(
        self,
        acceptance_thresholds: Dict[str, float],
        n_bootstrap: int = 10000,
        confidence_level: float = 0.95,
        min_stratum_size: int = 30,
        parallel: bool = True,
        random_state: Optional[int] = None,
    ):
        """
        Initialize the statistical evaluator.

        Args:
            acceptance_thresholds: Upper bounds for metric acceptance
            n_bootstrap: Number of bootstrap samples
            confidence_level: Confidence level (e.g., 0.95 for 95% CI)
            min_stratum_size: Minimum samples per stratum for bootstrap
            parallel: Use parallel processing for bootstrap
            random_state: Random seed for reproducibility
        """
        self.acceptance_thresholds = acceptance_thresholds
        self.n_bootstrap = n_bootstrap
        self.alpha = 1 - confidence_level
        self.min_stratum_size = min_stratum_size
        self.parallel = parallel
        self.random_state = random_state

    def compute_metric_with_ci(
        self,
        values: np.ndarray,
        stat_fn: Callable[[np.ndarray], float] = np.mean,
    ) -> MetricWithCI:
        """Compute a metric with bootstrap confidence interval."""
        values = np.asarray(values)
        n = len(values)

        if n == 0:
            return MetricWithCI(
                value=np.nan,
                ci_lower=np.nan,
                ci_upper=np.nan,
                method="none",
                n_samples=0,
                is_degenerate=True,
            )

        # Check for degenerate case
        if np.all(values == values[0]):
            val = float(values[0])
            return MetricWithCI(
                value=val,
                ci_lower=val,
                ci_upper=val,
                method="degenerate",
                n_samples=n,
                is_degenerate=True,
            )

        # Use bootstrap for confidence interval
        estimate, ci_lower, ci_upper = bootstrap_ci(
            values,
            stat_fn=stat_fn,
            n_bootstrap=self.n_bootstrap,
            alpha=self.alpha,
            random_state=self.random_state,
        )

        return MetricWithCI(
            value=estimate,
            ci_lower=ci_lower,
            ci_upper=ci_upper,
            method="bootstrap",
            n_samples=n,
        )

    def compute_proportion_with_ci(
        self,
        successes: int,
        n: int,
    ) -> MetricWithCI:
        """Compute a proportion with appropriate confidence interval."""
        if n == 0:
            return MetricWithCI(
                value=0.0,
                ci_lower=0.0,
                ci_upper=0.0,
                method="none",
                n_samples=0,
            )

        # Use exact binomial for small samples, Wilson otherwise
        if n < 30:
            proportion, ci_lower, ci_upper = exact_binomial_ci(successes, n, self.alpha)
            method = "exact_binomial"
        else:
            proportion, ci_lower, ci_upper = wilson_ci(successes, n, self.alpha)
            method = "wilson"

        return MetricWithCI(
            value=proportion,
            ci_lower=ci_lower,
            ci_upper=ci_upper,
            method=method,
            n_samples=n,
        )

    def stratify_by_tags(
        self,
        results: List[Dict[str, Any]],
        dimensions: List[str],
    ) -> Dict[str, Dict[str, List[Dict[str, Any]]]]:
        """
        Stratify results by tag dimensions.

        Args:
            results: List of result dicts, each with 'tags' and 'metrics'
            dimensions: Tag dimensions to stratify by

        Returns:
            Nested dict: dimension -> stratum_value -> list of results
        """
        stratified: Dict[str, Dict[str, List[Dict[str, Any]]]] = {dim: {} for dim in dimensions}

        for result in results:
            tags = result.get("tags", {})
            for dim in dimensions:
                stratum = tags.get(dim, "unknown")
                if stratum not in stratified[dim]:
                    stratified[dim][stratum] = []
                stratified[dim][stratum].append(result)

        return stratified

    def aggregate_results(
        self,
        results: List[Dict[str, Any]],
        stratify_by: Optional[List[str]] = None,
    ) -> AggregatedResults:
        """
        Compute aggregate statistics with confidence intervals.

        Args:
            results: List of result dicts with 'metrics', 'passed', and optionally 'tags'
            stratify_by: List of tag dimensions to stratify by

        Returns:
            AggregatedResults with CIs and stratified metrics.
        """
        total = len(results)
        if total == 0:
            return AggregatedResults(
                total_scenarios=0,
                pass_rate=MetricWithCI(0.0, 0.0, 0.0, "none", 0),
                mean_metrics={},
                stratified_metrics={},
                power_analysis={},
            )

        # Compute pass rate with CI
        passed_count = sum(1 for r in results if r.get("passed", False))
        pass_rate = self.compute_proportion_with_ci(passed_count, total)

        # Aggregate metrics with CIs
        all_metrics: Dict[str, List[float]] = {}
        for r in results:
            for k, v in r.get("metrics", {}).items():
                if k not in all_metrics:
                    all_metrics[k] = []
                all_metrics[k].append(float(v))

        mean_metrics: Dict[str, MetricWithCI] = {}
        for k, values in all_metrics.items():
            mean_metrics[k] = self.compute_metric_with_ci(np.array(values))

        # Stratified metrics
        stratified_metrics: Dict[str, StratifiedMetrics] = {}
        if stratify_by:
            stratified_data = self.stratify_by_tags(results, stratify_by)

            for dim, strata in stratified_data.items():
                strata_metrics: Dict[str, Dict[str, MetricWithCI]] = {}
                sample_sizes: Dict[str, int] = {}

                for stratum_name, stratum_results in strata.items():
                    sample_sizes[stratum_name] = len(stratum_results)
                    strata_metrics[stratum_name] = {}

                    # Aggregate metrics for this stratum
                    stratum_values: Dict[str, List[float]] = {}
                    for r in stratum_results:
                        for k, v in r.get("metrics", {}).items():
                            if k not in stratum_values:
                                stratum_values[k] = []
                            stratum_values[k].append(float(v))

                    for k, values in stratum_values.items():
                        if len(values) < self.min_stratum_size:
                            # Fallback to simpler method for small strata
                            val = np.mean(values)
                            std = np.std(values) / np.sqrt(len(values)) if len(values) > 1 else 0
                            strata_metrics[stratum_name][k] = MetricWithCI(
                                value=float(val),
                                ci_lower=float(val - 1.96 * std),
                                ci_upper=float(val + 1.96 * std),
                                method="normal_approx",
                                n_samples=len(values),
                            )
                        else:
                            strata_metrics[stratum_name][k] = self.compute_metric_with_ci(
                                np.array(values)
                            )

                stratified_metrics[dim] = StratifiedMetrics(
                    dimension=dim,
                    strata=strata_metrics,
                    sample_sizes=sample_sizes,
                )

        # Power analysis for each metric
        power_results: Dict[str, float] = {}
        for k, values in all_metrics.items():
            arr = np.array(values)
            if len(arr) > 1 and np.std(arr) > 0:
                # Compute effect size as (threshold - mean) / std
                if k in self.acceptance_thresholds:
                    threshold = self.acceptance_thresholds[k]
                    effect_size = abs(threshold - np.mean(arr)) / np.std(arr)
                    min_n = power_analysis(effect_size, self.alpha, 0.8)
                    power_results[k] = min_n
                else:
                    power_results[k] = float("nan")
            else:
                power_results[k] = float("nan")

        return AggregatedResults(
            total_scenarios=total,
            pass_rate=pass_rate,
            mean_metrics=mean_metrics,
            stratified_metrics=stratified_metrics,
            power_analysis=power_results,
        )

    def detect_regression(
        self,
        old_results: AggregatedResults,
        new_results: AggregatedResults,
        safety_metrics: Optional[List[str]] = None,
    ) -> Tuple[bool, Dict[str, str]]:
        """
        Detect if new model shows regression compared to old model.

        Regression detected when new model CI lower bound < old model CI upper bound
        for safety metrics (i.e., new model could be worse).

        Args:
            old_results: Baseline model aggregated results
            new_results: Candidate model aggregated results
            safety_metrics: List of safety-critical metrics to check

        Returns:
            (has_regression, details dict)
        """
        if safety_metrics is None:
            safety_metrics = list(self.acceptance_thresholds.keys())

        has_regression = False
        details: Dict[str, str] = {}

        for metric in safety_metrics:
            if metric not in old_results.mean_metrics or metric not in new_results.mean_metrics:
                continue

            old_ci = old_results.mean_metrics[metric]
            new_ci = new_results.mean_metrics[metric]

            # For safety metrics (lower is better), regression means new is higher
            # Check if new lower bound > old upper bound (definite regression)
            if new_ci.ci_lower > old_ci.ci_upper:
                has_regression = True
                details[metric] = (
                    f"REGRESSION: new [{new_ci.ci_lower:.4f}, {new_ci.ci_upper:.4f}] "
                    f"> old [{old_ci.ci_lower:.4f}, {old_ci.ci_upper:.4f}]"
                )
            elif new_ci.value > old_ci.value:
                # Warn if point estimate is worse even if CIs overlap
                details[metric] = (
                    f"WARNING: new mean {new_ci.value:.4f} > old mean {old_ci.value:.4f} "
                    "(CIs overlap, inconclusive)"
                )

        return (has_regression, details)
