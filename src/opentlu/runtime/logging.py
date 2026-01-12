"""
Intervention Logger and Replay System for debugging and analysis.

Provides structured logging of mitigation decisions with full state capture
and offline replay capability for counterfactual analysis.
"""

import gzip
import json
import time
import uuid
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Callable, Dict, Iterator, List, Optional
from queue import Queue

import numpy as np

from opentlu.foundations.contracts import (
    MitigationState,
    UncertaintyEstimate,
    MonitorOutput,
)


@dataclass
class InterventionRecord:
    """Record of a single intervention/decision point."""

    id: str
    timestamp: float
    trace_id: str

    # State information
    observation: Dict[str, Any]
    mitigation_state: str
    previous_state: str

    # Uncertainty and OOD
    uncertainty: Dict[str, Any]  # Serialized UncertaintyEstimate
    ood_score: float

    # Action and monitors
    action_taken: List[float]
    monitor_outputs: List[Dict[str, Any]]  # Serialized MonitorOutput list

    # Metadata
    step_number: int = 0
    session_id: str = ""
    version: str = "1.0"


class LogSink(ABC):
    """Abstract base class for log sinks."""

    @abstractmethod
    def write(self, record: InterventionRecord) -> None:
        """Write a record to the sink."""
        pass

    @abstractmethod
    def flush(self) -> None:
        """Flush any buffered writes."""
        pass

    @abstractmethod
    def close(self) -> None:
        """Close the sink."""
        pass


class FileLogSink(LogSink):
    """File-based log sink with async batched writes."""

    def __init__(
        self,
        path: Path,
        buffer_size: int = 100,
        compress: bool = False,
    ):
        """
        Initialize file log sink.

        Args:
            path: Path to log file
            buffer_size: Number of records to buffer before writing
            compress: Whether to gzip compress the output
        """
        self.path = Path(path)
        self.buffer_size = buffer_size
        self.compress = compress

        self._buffer: List[InterventionRecord] = []
        self._lock = threading.Lock()
        self._write_queue: Queue[List[InterventionRecord]] = Queue()
        self._closed = False

        # Start background writer thread
        self._writer_thread = threading.Thread(target=self._writer_loop, daemon=True)
        self._writer_thread.start()

    def _writer_loop(self) -> None:
        """Background thread for writing records."""
        while not self._closed or not self._write_queue.empty():
            try:
                records = self._write_queue.get(timeout=1.0)
                self._write_batch(records)
            except Exception:
                pass  # Queue timeout or error

    def _write_batch(self, records: List[InterventionRecord]) -> None:
        """Write a batch of records to file."""
        open_fn = gzip.open if self.compress else open
        mode = "at" if not self.compress else "at"

        suffix = ".gz" if self.compress else ""
        path = self.path.with_suffix(self.path.suffix + suffix)

        with open_fn(path, mode) as f:
            for record in records:
                # Convert numpy arrays to lists for JSON serialization
                record_dict = self._serialize_record(record)
                f.write(json.dumps(record_dict) + "\n")

    def _serialize_record(self, record: InterventionRecord) -> Dict[str, Any]:
        """Serialize record to JSON-compatible dict."""
        data = asdict(record)

        # Convert any numpy arrays in observation
        if "observation" in data:
            data["observation"] = self._convert_numpy(data["observation"])

        return data

    def _convert_numpy(self, obj: Any) -> Any:
        """Recursively convert numpy types to Python types."""
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.integer, np.floating)):
            return float(obj)
        elif isinstance(obj, dict):
            return {k: self._convert_numpy(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_numpy(v) for v in obj]
        return obj

    def write(self, record: InterventionRecord) -> None:
        """Buffer a record for writing."""
        with self._lock:
            self._buffer.append(record)
            if len(self._buffer) >= self.buffer_size:
                self._write_queue.put(self._buffer)
                self._buffer = []

    def flush(self) -> None:
        """Flush buffered records."""
        with self._lock:
            if self._buffer:
                self._write_queue.put(self._buffer)
                self._buffer = []

    def close(self) -> None:
        """Close the sink."""
        self.flush()
        self._closed = True
        self._writer_thread.join(timeout=5.0)


class MemoryLogSink(LogSink):
    """In-memory log sink for testing and short sessions."""

    def __init__(self, max_records: int = 10000):
        self.max_records = max_records
        self._records: List[InterventionRecord] = []
        self._lock = threading.Lock()

    def write(self, record: InterventionRecord) -> None:
        with self._lock:
            self._records.append(record)
            if len(self._records) > self.max_records:
                self._records.pop(0)

    def flush(self) -> None:
        pass

    def close(self) -> None:
        pass

    def get_records(self) -> List[InterventionRecord]:
        with self._lock:
            return list(self._records)


class InterventionLogger:
    """
    Logger for intervention/mitigation decisions.

    Captures full state snapshots for later analysis and replay.
    """

    def __init__(
        self,
        sink: LogSink,
        session_id: Optional[str] = None,
        log_all: bool = False,
        field_filters: Optional[List[str]] = None,
    ):
        """
        Initialize intervention logger.

        Args:
            sink: Where to write logs
            session_id: Unique session identifier
            log_all: If True, log every step. Otherwise only non-nominal states.
            field_filters: List of observation keys to exclude (for privacy)
        """
        self.sink = sink
        self.session_id = session_id or str(uuid.uuid4())
        self.log_all = log_all
        self.field_filters = set(field_filters or [])

        self._trace_id = str(uuid.uuid4())
        self._step_number = 0
        self._previous_state = MitigationState.NOMINAL.value

    def log(
        self,
        observation: Dict[str, Any],
        mitigation_state: MitigationState,
        uncertainty: UncertaintyEstimate,
        ood_score: float,
        action_taken: np.ndarray,
        monitor_outputs: Optional[List[MonitorOutput]] = None,
    ) -> None:
        """
        Log an intervention record.

        Args:
            observation: Current system observation/state
            mitigation_state: Current mitigation state
            uncertainty: Uncertainty estimate
            ood_score: OOD detection score
            action_taken: Action executed
            monitor_outputs: Outputs from safety monitors
        """
        # Check if we should log this step
        should_log = (
            self.log_all
            or mitigation_state != MitigationState.NOMINAL
            or self._previous_state != MitigationState.NOMINAL.value
        )

        if not should_log:
            self._step_number += 1
            return

        # Filter observation fields
        filtered_obs = {k: v for k, v in observation.items() if k not in self.field_filters}

        # Serialize uncertainty estimate
        uncertainty_dict = {
            "confidence": uncertainty.confidence,
            "aleatoric_score": uncertainty.aleatoric_score,
            "epistemic_score": uncertainty.epistemic_score,
            "source": uncertainty.source,
            "conformal_set_size": uncertainty.conformal_set_size,
            "coverage_probability": uncertainty.coverage_probability,
            "prediction_set": uncertainty.prediction_set,
        }

        # Serialize monitor outputs
        monitor_dicts = []
        if monitor_outputs:
            for m in monitor_outputs:
                monitor_dicts.append(
                    {
                        "monitor_id": m.monitor_id,
                        "triggered": m.triggered,
                        "severity": m.severity,
                        "message": m.message,
                        "timestamp": m.timestamp,
                    }
                )

        record = InterventionRecord(
            id=str(uuid.uuid4()),
            timestamp=time.time(),
            trace_id=self._trace_id,
            observation=filtered_obs,
            mitigation_state=mitigation_state.value,
            previous_state=self._previous_state,
            uncertainty=uncertainty_dict,
            ood_score=ood_score,
            action_taken=action_taken.tolist()
            if isinstance(action_taken, np.ndarray)
            else list(action_taken),
            monitor_outputs=monitor_dicts,
            step_number=self._step_number,
            session_id=self.session_id,
        )

        self.sink.write(record)

        self._previous_state = mitigation_state.value
        self._step_number += 1

    def new_trace(self) -> str:
        """Start a new trace (e.g., new episode)."""
        self._trace_id = str(uuid.uuid4())
        self._step_number = 0
        self._previous_state = MitigationState.NOMINAL.value
        return self._trace_id

    def flush(self) -> None:
        """Flush buffered logs."""
        self.sink.flush()

    def close(self) -> None:
        """Close the logger."""
        self.sink.close()


class LogQuery:
    """Query interface for intervention logs."""

    def __init__(self, records: List[InterventionRecord]):
        self._records = records

    @classmethod
    def from_file(cls, path: Path) -> "LogQuery":
        """Load logs from file."""
        records = []
        open_fn = gzip.open if path.suffix == ".gz" else open

        with open_fn(path, "rt") as f:
            for line in f:
                data = json.loads(line)
                records.append(InterventionRecord(**data))

        return cls(records)

    def filter_by_time(
        self,
        start: Optional[float] = None,
        end: Optional[float] = None,
    ) -> "LogQuery":
        """Filter records by timestamp range."""
        filtered = [
            r
            for r in self._records
            if (start is None or r.timestamp >= start) and (end is None or r.timestamp <= end)
        ]
        return LogQuery(filtered)

    def filter_by_state(self, states: List[str]) -> "LogQuery":
        """Filter records by mitigation state."""
        filtered = [r for r in self._records if r.mitigation_state in states]
        return LogQuery(filtered)

    def filter_by_trace(self, trace_id: str) -> "LogQuery":
        """Get all records from a specific trace."""
        filtered = [r for r in self._records if r.trace_id == trace_id]
        return LogQuery(filtered)

    def get_traces(self) -> List[str]:
        """Get all unique trace IDs."""
        return list(set(r.trace_id for r in self._records))

    def to_list(self) -> List[InterventionRecord]:
        """Get records as list."""
        return list(self._records)

    def __iter__(self) -> Iterator[InterventionRecord]:
        return iter(self._records)

    def __len__(self) -> int:
        return len(self._records)


class ReplayEngine:
    """
    Engine for replaying logged interventions.

    Allows re-execution of trajectories with potentially modified
    components for counterfactual analysis.
    """

    def __init__(self, records: List[InterventionRecord]):
        """
        Initialize replay engine.

        Args:
            records: List of intervention records to replay
        """
        self.records = sorted(records, key=lambda r: (r.trace_id, r.step_number))

    @classmethod
    def from_query(cls, query: LogQuery) -> "ReplayEngine":
        """Create from log query results."""
        return cls(query.to_list())

    @classmethod
    def from_file(cls, path: Path) -> "ReplayEngine":
        """Load from log file."""
        query = LogQuery.from_file(path)
        return cls(query.to_list())

    def replay(
        self,
        policy: Optional[Callable[[Dict[str, Any]], np.ndarray]] = None,
        monitors: Optional[List[Any]] = None,
        controller: Optional[Any] = None,
        on_step: Optional[Callable[[InterventionRecord, Any], None]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Replay trajectory with optional component substitution.

        Args:
            policy: Optional new policy to test
            monitors: Optional new monitors
            controller: Optional new controller
            on_step: Callback called after each step

        Returns:
            List of replay results for each step.
        """
        results: List[Dict[str, Any]] = []

        for record in self.records:
            result: Dict[str, Any] = {
                "original_record": record,
                "step": record.step_number,
                "trace_id": record.trace_id,
            }

            # Reconstruct observation
            observation = record.observation

            # If policy provided, get new action
            if policy is not None:
                try:
                    new_action = policy(observation)
                    result["new_action"] = (
                        new_action.tolist() if isinstance(new_action, np.ndarray) else new_action
                    )
                    result["action_divergence"] = float(
                        np.linalg.norm(np.array(new_action) - np.array(record.action_taken))
                    )
                except Exception as e:
                    result["policy_error"] = str(e)

            # If monitors provided, check them
            if monitors is not None:
                result["new_monitor_outputs"] = []
                for monitor in monitors:
                    try:
                        output = monitor.check(observation)
                        result["new_monitor_outputs"].append(
                            {
                                "monitor_id": output.monitor_id,
                                "triggered": output.triggered,
                                "severity": output.severity,
                            }
                        )
                    except Exception as e:
                        result["new_monitor_outputs"].append({"error": str(e)})

            # Callback
            if on_step is not None:
                on_step(record, result)

            results.append(result)

        return results

    def compute_divergence(
        self,
        policy: Callable[[Dict[str, Any]], np.ndarray],
    ) -> Dict[str, float]:
        """
        Compute action divergence statistics for a new policy.

        Returns:
            Dict with mean, max, std divergence.
        """
        divergences = []

        for record in self.records:
            try:
                new_action = policy(record.observation)
                divergence = np.linalg.norm(np.array(new_action) - np.array(record.action_taken))
                divergences.append(float(divergence))
            except Exception:
                pass

        if not divergences:
            return {"mean": 0.0, "max": 0.0, "std": 0.0, "n_samples": 0}

        return {
            "mean": float(np.mean(divergences)),
            "max": float(np.max(divergences)),
            "std": float(np.std(divergences)),
            "n_samples": len(divergences),
        }
