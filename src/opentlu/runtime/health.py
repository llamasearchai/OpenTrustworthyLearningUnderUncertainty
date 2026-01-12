"""
System Health Monitoring and Alerting.

Implements latency tracking, throughput monitoring, error rate computation,
and configurable alerting rules with multiple notification channels.
"""

import time
import threading
from abc import ABC, abstractmethod
from collections import deque
from dataclasses import dataclass, field
from typing import Any, Callable, Deque, Dict, List, Optional, Tuple
import numpy as np


@dataclass
class Alert:
    """Represents a triggered alert."""

    rule_name: str
    metric: str
    severity: str  # "warning", "critical"
    message: str
    value: float
    threshold: float
    timestamp: float


@dataclass
class HealthStatus:
    """Current system health status."""

    latency_p50: float
    latency_p95: float
    latency_p99: float
    throughput: float  # operations per second
    error_rate: float  # errors / total
    total_operations: int
    total_errors: int
    alerts: List[Alert]
    uptime_seconds: float


class RollingStatistics:
    """
    Efficient rolling statistics computation using reservoir sampling
    and approximate quantiles (T-Digest like approach for simplicity).
    """

    def __init__(self, window_seconds: float = 60.0, max_samples: int = 10000):
        """
        Initialize rolling statistics.

        Args:
            window_seconds: Time window for statistics
            max_samples: Maximum samples to keep in memory
        """
        self.window_seconds = window_seconds
        self.max_samples = max_samples

        self._lock = threading.Lock()
        self._values: Deque[Tuple[float, float]] = deque()  # (timestamp, value)
        self._error_count = 0
        self._total_count = 0
        self._start_time = time.monotonic()

    def record(self, value: float, success: bool = True) -> None:
        """Record a new observation."""
        now = time.monotonic()

        with self._lock:
            self._values.append((now, value))
            self._total_count += 1
            if not success:
                self._error_count += 1

            # Trim old values
            cutoff = now - self.window_seconds
            while self._values and self._values[0][0] < cutoff:
                self._values.popleft()

            # Limit size
            while len(self._values) > self.max_samples:
                self._values.popleft()

    def get_percentile(self, p: float) -> float:
        """Get the p-th percentile (0-100)."""
        with self._lock:
            if not self._values:
                return 0.0
            values = [v for _, v in self._values]
            return float(np.percentile(values, p))

    def get_mean(self) -> float:
        """Get mean value."""
        with self._lock:
            if not self._values:
                return 0.0
            return float(np.mean([v for _, v in self._values]))

    def get_throughput(self) -> float:
        """Get operations per second in the window."""
        with self._lock:
            if not self._values:
                return 0.0

            now = time.monotonic()
            window_start = now - self.window_seconds
            count = sum(1 for t, _ in self._values if t >= window_start)

            # Effective window duration
            if self._values:
                actual_start = max(self._values[0][0], window_start)
                duration = now - actual_start
                if duration > 0:
                    return count / duration
            return 0.0

    def get_error_rate(self) -> float:
        """Get error rate."""
        with self._lock:
            if self._total_count == 0:
                return 0.0
            return self._error_count / self._total_count

    def get_total_count(self) -> Tuple[int, int]:
        """Get (total, errors) counts."""
        with self._lock:
            return self._total_count, self._error_count

    def get_uptime(self) -> float:
        """Get uptime in seconds."""
        return time.monotonic() - self._start_time


class NotificationChannel(ABC):
    """Abstract notification channel."""

    @abstractmethod
    def send(self, alert: Alert) -> bool:
        """
        Send an alert through this channel.

        Returns True if successful.
        """
        pass


class LogChannel(NotificationChannel):
    """Notification via structured logging."""

    def __init__(self, logger: Optional[Any] = None):
        self.logger = logger

    def send(self, alert: Alert) -> bool:
        if self.logger:
            self.logger.warning(
                "alert_triggered",
                rule=alert.rule_name,
                metric=alert.metric,
                severity=alert.severity,
                value=alert.value,
                threshold=alert.threshold,
            )
        else:
            print(f"ALERT [{alert.severity}] {alert.rule_name}: {alert.message}")
        return True


class WebhookChannel(NotificationChannel):
    """Notification via HTTP webhook."""

    def __init__(self, url: str, timeout: float = 5.0):
        self.url = url
        self.timeout = timeout

    def send(self, alert: Alert) -> bool:
        try:
            import urllib.request
            import json

            payload = {
                "rule_name": alert.rule_name,
                "metric": alert.metric,
                "severity": alert.severity,
                "message": alert.message,
                "value": alert.value,
                "threshold": alert.threshold,
                "timestamp": alert.timestamp,
            }

            data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(
                self.url,
                data=data,
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(req, timeout=self.timeout)
            return True

        except Exception:
            return False


@dataclass
class AlertRule:
    """Rule for triggering alerts."""

    name: str
    metric: str  # "latency_p99", "error_rate", "throughput"
    condition: Callable[[float], bool]  # Returns True if alert should fire
    threshold: float  # For display purposes
    severity: str = "warning"  # "warning" or "critical"
    channels: List[NotificationChannel] = field(default_factory=list)
    cooldown_seconds: float = 300.0  # Minimum time between alerts
    min_samples: int = 10  # Minimum samples before alerting


class AlertEngine:
    """
    Engine for evaluating alert rules and dispatching notifications.

    Includes deduplication and rate limiting.
    """

    def __init__(self, rules: Optional[List[AlertRule]] = None):
        self.rules = rules or []
        self._lock = threading.Lock()
        self._last_alert: Dict[str, float] = {}  # rule_name -> last alert time
        self._alert_history: Deque[Alert] = deque(maxlen=1000)

    def add_rule(self, rule: AlertRule) -> None:
        """Add an alert rule."""
        with self._lock:
            self.rules.append(rule)

    def evaluate(
        self,
        metrics: Dict[str, float],
        sample_counts: Dict[str, int],
    ) -> List[Alert]:
        """
        Evaluate all rules and dispatch alerts.

        Args:
            metrics: Current metric values
            sample_counts: Sample counts per metric

        Returns:
            List of triggered alerts.
        """
        now = time.time()
        triggered: List[Alert] = []

        with self._lock:
            for rule in self.rules:
                # Check if metric exists
                if rule.metric not in metrics:
                    continue

                value = metrics[rule.metric]
                count = sample_counts.get(rule.metric, 0)

                # Check minimum samples
                if count < rule.min_samples:
                    continue

                # Check condition
                if not rule.condition(value):
                    continue

                # Check cooldown
                last = self._last_alert.get(rule.name, 0)
                if now - last < rule.cooldown_seconds:
                    continue

                # Create and dispatch alert
                alert = Alert(
                    rule_name=rule.name,
                    metric=rule.metric,
                    severity=rule.severity,
                    message=f"{rule.metric} = {value:.4f} exceeds threshold {rule.threshold:.4f}",
                    value=value,
                    threshold=rule.threshold,
                    timestamp=now,
                )

                # Send to channels
                for channel in rule.channels:
                    try:
                        channel.send(alert)
                    except Exception:
                        pass  # Log failure but continue

                self._last_alert[rule.name] = now
                self._alert_history.append(alert)
                triggered.append(alert)

        return triggered

    def get_history(self, limit: int = 100) -> List[Alert]:
        """Get recent alert history."""
        with self._lock:
            return list(self._alert_history)[-limit:]


class HealthMonitor:
    """
    Main system health monitor.

    Tracks latency, throughput, errors, and triggers alerts.
    """

    def __init__(
        self,
        latency_threshold_p99_ms: float = 50.0,
        error_rate_threshold: float = 0.01,
        window_seconds: float = 60.0,
        alert_engine: Optional[AlertEngine] = None,
    ):
        """
        Initialize health monitor.

        Args:
            latency_threshold_p99_ms: P99 latency threshold in ms
            error_rate_threshold: Error rate threshold (0-1)
            window_seconds: Rolling window for statistics
            alert_engine: Alert engine (created with defaults if None)
        """
        self.latency_threshold = latency_threshold_p99_ms
        self.error_rate_threshold = error_rate_threshold

        self._stats: Dict[str, RollingStatistics] = {}
        self._default_stats = RollingStatistics(window_seconds)
        self._lock = threading.Lock()
        self._start_time = time.monotonic()

        # Set up alert engine with default rules
        if alert_engine is None:
            log_channel = LogChannel()
            self.alert_engine = AlertEngine(
                [
                    AlertRule(
                        name="high_latency_p99",
                        metric="latency_p99",
                        condition=lambda v: v > latency_threshold_p99_ms,
                        threshold=latency_threshold_p99_ms,
                        severity="warning",
                        channels=[log_channel],
                    ),
                    AlertRule(
                        name="high_error_rate",
                        metric="error_rate",
                        condition=lambda v: v > error_rate_threshold,
                        threshold=error_rate_threshold,
                        severity="critical",
                        channels=[log_channel],
                    ),
                ]
            )
        else:
            self.alert_engine = alert_engine

    def record(
        self,
        operation: str,
        latency_ms: float,
        success: bool = True,
    ) -> None:
        """
        Record an operation.

        Args:
            operation: Operation name (e.g., "inference", "monitor_check")
            latency_ms: Operation latency in milliseconds
            success: Whether operation succeeded
        """
        with self._lock:
            if operation not in self._stats:
                self._stats[operation] = RollingStatistics()
            self._stats[operation].record(latency_ms, success)
            self._default_stats.record(latency_ms, success)

    def get_health(self, operation: Optional[str] = None) -> HealthStatus:
        """
        Get current health status.

        Args:
            operation: Specific operation (or all if None)

        Returns:
            HealthStatus with metrics and alerts.
        """
        with self._lock:
            if operation and operation in self._stats:
                stats = self._stats[operation]
            else:
                stats = self._default_stats

            p50 = stats.get_percentile(50)
            p95 = stats.get_percentile(95)
            p99 = stats.get_percentile(99)
            throughput = stats.get_throughput()
            error_rate = stats.get_error_rate()
            total, errors = stats.get_total_count()
            uptime = stats.get_uptime()

        # Evaluate alerts
        metrics = {
            "latency_p50": p50,
            "latency_p95": p95,
            "latency_p99": p99,
            "throughput": throughput,
            "error_rate": error_rate,
        }
        sample_counts = {"latency_p99": total, "error_rate": total}
        alerts = self.alert_engine.evaluate(metrics, sample_counts)

        return HealthStatus(
            latency_p50=p50,
            latency_p95=p95,
            latency_p99=p99,
            throughput=throughput,
            error_rate=error_rate,
            total_operations=total,
            total_errors=errors,
            alerts=alerts,
            uptime_seconds=uptime,
        )

    def get_metrics_dict(self) -> Dict[str, float]:
        """Get all metrics as a dict for external monitoring."""
        status = self.get_health()
        return {
            "latency_p50_ms": status.latency_p50,
            "latency_p95_ms": status.latency_p95,
            "latency_p99_ms": status.latency_p99,
            "throughput_ops": status.throughput,
            "error_rate": status.error_rate,
            "total_operations": float(status.total_operations),
            "total_errors": float(status.total_errors),
            "uptime_seconds": status.uptime_seconds,
        }

    def add_alert_rule(self, rule: AlertRule) -> None:
        """Add a custom alert rule."""
        self.alert_engine.add_rule(rule)
