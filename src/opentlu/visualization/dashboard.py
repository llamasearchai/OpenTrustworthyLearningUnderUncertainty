"""
Visualization Dashboard for uncertainty and safety analysis.

Provides matplotlib/plotly backends for uncertainty decomposition,
safety margin timelines, and OOD score distributions.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol, Tuple, Union
import io

import numpy as np


# Colorblind-safe palette (Wong palette)
COLORBLIND_PALETTE = {
    "blue": "#0072B2",
    "orange": "#E69F00",
    "green": "#009E73",
    "red": "#D55E00",
    "purple": "#CC79A7",
    "yellow": "#F0E442",
    "cyan": "#56B4E9",
    "black": "#000000",
}


class Figure(Protocol):
    """Protocol for figure objects (backend-agnostic)."""

    def savefig(self, path: Union[str, Path], **kwargs: Any) -> None:
        """Save figure to file."""
        ...

    def to_html(self) -> str:
        """Convert to HTML string."""
        ...


@dataclass
class UncertaintyData:
    """Data for uncertainty visualization."""

    total: float
    aleatoric: float
    epistemic: float
    confidence: float
    source: str
    timestamp: Optional[float] = None
    label: Optional[str] = None


@dataclass
class SafetyMarginData:
    """Data for safety margin visualization."""

    timestamp: float
    mitigation_state: str
    constraint_margins: Dict[str, float]
    ood_score: float
    severity: float


class PlottingBackend(ABC):
    """Abstract plotting backend."""

    @abstractmethod
    def create_figure(self, figsize: Tuple[int, int] = (10, 6)) -> Any:
        """Create a new figure."""
        pass

    @abstractmethod
    def bar_chart(
        self,
        fig: Any,
        labels: List[str],
        values: List[float],
        title: str,
        colors: Optional[List[str]] = None,
    ) -> Any:
        """Create bar chart."""
        pass

    @abstractmethod
    def line_chart(
        self,
        fig: Any,
        x: List[float],
        y_series: Dict[str, List[float]],
        title: str,
        xlabel: str,
        ylabel: str,
    ) -> Any:
        """Create line chart with multiple series."""
        pass

    @abstractmethod
    def histogram(
        self,
        fig: Any,
        values: List[float],
        title: str,
        bins: int = 50,
        threshold: Optional[float] = None,
    ) -> Any:
        """Create histogram with optional threshold line."""
        pass

    @abstractmethod
    def to_html(self, fig: Any) -> str:
        """Convert figure to HTML."""
        pass


class MatplotlibBackend(PlottingBackend):
    """Matplotlib-based plotting backend."""

    def __init__(self) -> None:
        try:
            import matplotlib

            matplotlib.use("Agg")  # Non-interactive backend
            import matplotlib.pyplot as plt

            self.plt = plt
        except ImportError:
            raise ImportError(
                "matplotlib is required for visualization. Install with: pip install matplotlib"
            )

    def create_figure(self, figsize: Tuple[int, int] = (10, 6)) -> Any:
        return self.plt.figure(figsize=figsize)

    def bar_chart(
        self,
        fig: Any,
        labels: List[str],
        values: List[float],
        title: str,
        colors: Optional[List[str]] = None,
    ) -> Any:
        ax = fig.add_subplot(111)
        if colors is None:
            colors = [COLORBLIND_PALETTE["blue"]] * len(labels)
        ax.bar(labels, values, color=colors)
        ax.set_title(title)
        ax.set_ylabel("Value")
        return fig

    def line_chart(
        self,
        fig: Any,
        x: List[float],
        y_series: Dict[str, List[float]],
        title: str,
        xlabel: str,
        ylabel: str,
    ) -> Any:
        ax = fig.add_subplot(111)
        colors = list(COLORBLIND_PALETTE.values())
        for i, (name, values) in enumerate(y_series.items()):
            ax.plot(x, values, label=name, color=colors[i % len(colors)])
        ax.set_title(title)
        ax.set_xlabel(xlabel)
        ax.set_ylabel(ylabel)
        ax.legend()
        return fig

    def histogram(
        self,
        fig: Any,
        values: List[float],
        title: str,
        bins: int = 50,
        threshold: Optional[float] = None,
    ) -> Any:
        ax = fig.add_subplot(111)
        ax.hist(values, bins=bins, color=COLORBLIND_PALETTE["blue"], alpha=0.7)
        if threshold is not None:
            ax.axvline(
                x=threshold,
                color=COLORBLIND_PALETTE["red"],
                linestyle="--",
                label=f"Threshold: {threshold:.2f}",
            )
            ax.legend()
        ax.set_title(title)
        ax.set_xlabel("Score")
        ax.set_ylabel("Frequency")
        return fig

    def to_html(self, fig: Any) -> str:
        buf = io.BytesIO()
        fig.savefig(buf, format="png", bbox_inches="tight")
        buf.seek(0)
        import base64

        data = base64.b64encode(buf.read()).decode("utf-8")
        self.plt.close(fig)
        return f'<img src="data:image/png;base64,{data}" />'


class PlotlyBackend(PlottingBackend):
    """Plotly-based plotting backend for interactive visualizations."""

    def __init__(self) -> None:
        try:
            import plotly.graph_objects as go
            import plotly.io as pio

            self.go = go
            self.pio = pio
        except ImportError:
            raise ImportError(
                "plotly is required for interactive visualization. Install with: pip install plotly"
            )

    def create_figure(self, figsize: Tuple[int, int] = (10, 6)) -> Any:
        # Plotly handles sizing differently, usually continuously responsive or set in layout
        # We initialized a blank figure
        return self.go.Figure()

    def bar_chart(
        self,
        fig: Any,
        labels: List[str],
        values: List[float],
        title: str,
        colors: Optional[List[str]] = None,
    ) -> Any:
        if colors is None:
            marker_color = COLORBLIND_PALETTE["blue"]
        else:
            marker_color = colors

        fig.add_trace(self.go.Bar(x=labels, y=values, marker_color=marker_color))
        fig.update_layout(title=title, yaxis_title="Value")
        return fig

    def line_chart(
        self,
        fig: Any,
        x: List[float],
        y_series: Dict[str, List[float]],
        title: str,
        xlabel: str,
        ylabel: str,
    ) -> Any:
        colors = list(COLORBLIND_PALETTE.values())
        for i, (name, values) in enumerate(y_series.items()):
            color = colors[i % len(colors)]
            fig.add_trace(
                self.go.Scatter(x=x, y=values, mode="lines", name=name, line=dict(color=color))
            )

        fig.update_layout(title=title, xaxis_title=xlabel, yaxis_title=ylabel)
        return fig

    def histogram(
        self,
        fig: Any,
        values: List[float],
        title: str,
        bins: int = 50,
        threshold: Optional[float] = None,
    ) -> Any:
        fig.add_trace(
            self.go.Histogram(
                x=values,
                nbinsx=bins,
                marker_color=COLORBLIND_PALETTE["blue"],
                opacity=0.7,
                name="Distribution",
            )
        )

        if threshold is not None:
            fig.add_vline(
                x=threshold,
                line_width=2,
                line_dash="dash",
                line_color=COLORBLIND_PALETTE["red"],
                annotation_text=f"Threshold: {threshold:.2f}",
                annotation_position="top right",
            )

        fig.update_layout(title=title, xaxis_title="Score", yaxis_title="Frequency")
        return fig

    def to_html(self, fig: Any) -> str:
        return self.pio.to_html(fig, include_plotlyjs="cdn", full_html=False)


class UncertaintyVisualizer:
    """Visualizer for uncertainty decomposition."""

    def __init__(self, backend: Optional[PlottingBackend] = None):
        self.backend = backend or MatplotlibBackend()

    def plot_decomposition(
        self,
        estimates: List[UncertaintyData],
        title: str = "Uncertainty Decomposition",
    ) -> Any:
        """
        Plot uncertainty decomposition bar chart.

        Args:
            estimates: List of uncertainty data points
            title: Chart title

        Returns:
            Figure object.
        """
        if len(estimates) == 1:
            # Single estimate - show components
            est = estimates[0]
            labels = ["Total", "Aleatoric", "Epistemic"]
            values = [est.total, est.aleatoric, est.epistemic]
            colors = [
                COLORBLIND_PALETTE["purple"],
                COLORBLIND_PALETTE["blue"],
                COLORBLIND_PALETTE["orange"],
            ]
        else:
            # Multiple estimates - show total per sample
            labels = [e.label or f"Sample {i}" for i, e in enumerate(estimates)]
            values = [e.total for e in estimates]
            colors = None

        fig = self.backend.create_figure()
        return self.backend.bar_chart(fig, labels, values, title, colors)

    def plot_decomposition_stacked(
        self,
        estimates: List[UncertaintyData],
        title: str = "Uncertainty Decomposition (Stacked)",
    ) -> Any:
        """Plot stacked bar showing aleatoric vs epistemic per sample."""
        fig = self.backend.create_figure()
        ax = fig.add_subplot(111)

        labels = [e.label or f"Sample {i}" for i, e in enumerate(estimates)]
        aleatoric = [e.aleatoric for e in estimates]
        epistemic = [e.epistemic for e in estimates]

        x = np.arange(len(labels))
        ax.bar(x, aleatoric, label="Aleatoric", color=COLORBLIND_PALETTE["blue"])
        ax.bar(
            x, epistemic, bottom=aleatoric, label="Epistemic", color=COLORBLIND_PALETTE["orange"]
        )
        ax.set_xticks(x)
        ax.set_xticklabels(labels, rotation=45, ha="right")
        ax.set_ylabel("Uncertainty")
        ax.set_title(title)
        ax.legend()

        return fig


class SafetyVisualizer:
    """Visualizer for safety margins and mitigation states."""

    def __init__(self, backend: Optional[PlottingBackend] = None):
        self.backend = backend or MatplotlibBackend()

    def plot_margin_timeline(
        self,
        data: List[SafetyMarginData],
        title: str = "Safety Margin Timeline",
    ) -> Any:
        """
        Plot safety margins over time.

        Args:
            data: List of safety margin data points
            title: Chart title

        Returns:
            Figure object.
        """
        timestamps = [d.timestamp for d in data]

        # Get all constraint names
        all_constraints = set()
        for d in data:
            all_constraints.update(d.constraint_margins.keys())

        y_series: Dict[str, List[float]] = {}
        for constraint in all_constraints:
            y_series[constraint] = [d.constraint_margins.get(constraint, 0.0) for d in data]

        fig = self.backend.create_figure()
        return self.backend.line_chart(
            fig,
            timestamps,
            y_series,
            title=title,
            xlabel="Time",
            ylabel="Margin",
        )

    def plot_state_timeline(
        self,
        data: List[SafetyMarginData],
        title: str = "Mitigation State Timeline",
    ) -> Any:
        """Plot mitigation state changes over time."""
        fig = self.backend.create_figure()
        ax = fig.add_subplot(111)

        timestamps = [d.timestamp for d in data]
        states = [d.mitigation_state for d in data]

        # Map states to numeric values
        state_map = {
            "nominal": 0,
            "cautious": 1,
            "fallback": 2,
            "safe_stop": 3,
            "human_escalation": 4,
        }

        y = [state_map.get(s.lower(), 0) for s in states]

        ax.step(timestamps, y, where="post", color=COLORBLIND_PALETTE["blue"])
        ax.set_yticks(list(state_map.values()))
        ax.set_yticklabels(list(state_map.keys()))
        ax.set_xlabel("Time")
        ax.set_ylabel("State")
        ax.set_title(title)

        return fig


class OODVisualizer:
    """Visualizer for OOD score distributions."""

    def __init__(self, backend: Optional[PlottingBackend] = None):
        self.backend = backend or MatplotlibBackend()

    def plot_score_distribution(
        self,
        scores: List[float],
        threshold: float,
        title: str = "OOD Score Distribution",
        bins: int = 50,
    ) -> Any:
        """
        Plot histogram of OOD scores with threshold.

        Args:
            scores: List of OOD scores
            threshold: OOD detection threshold
            title: Chart title
            bins: Number of histogram bins

        Returns:
            Figure object.
        """
        fig = self.backend.create_figure()
        return self.backend.histogram(fig, scores, title, bins, threshold)

    def plot_detector_comparison(
        self,
        detector_scores: Dict[str, List[float]],
        title: str = "Detector Score Comparison",
    ) -> Any:
        """Plot box plots comparing different detectors."""
        fig = self.backend.create_figure()
        ax = fig.add_subplot(111)

        data = list(detector_scores.values())
        labels = list(detector_scores.keys())

        ax.boxplot(data, labels=labels)
        ax.set_ylabel("Score")
        ax.set_title(title)

        return fig


class Dashboard:
    """
    Combined dashboard for all visualizations.

    Renders multiple components to a single HTML page.
    """

    def __init__(self, backend: Optional[PlottingBackend] = None):
        self.backend = backend or MatplotlibBackend()
        self.uncertainty_viz = UncertaintyVisualizer(self.backend)
        self.safety_viz = SafetyVisualizer(self.backend)
        self.ood_viz = OODVisualizer(self.backend)

    def render_html(
        self,
        components: List[Any],
        title: str = "OpenTLU Dashboard",
        path: Optional[Union[str, Path]] = None,
    ) -> str:
        """
        Render components to HTML.

        Args:
            components: List of figure objects
            title: Page title
            path: Optional path to save HTML file

        Returns:
            HTML string.
        """
        html_parts = [
            "<!DOCTYPE html>",
            "<html>",
            "<head>",
            f"<title>{title}</title>",
            "<style>",
            "body { font-family: Arial, sans-serif; margin: 20px; }",
            ".component { margin: 20px 0; padding: 10px; border: 1px solid #ddd; }",
            "h1 { color: #333; }",
            "</style>",
            "</head>",
            "<body>",
            f"<h1>{title}</h1>",
        ]

        for i, fig in enumerate(components):
            html_parts.append(f'<div class="component" id="component-{i}">')
            html_parts.append(self.backend.to_html(fig))
            html_parts.append("</div>")

        html_parts.extend(
            [
                "</body>",
                "</html>",
            ]
        )

        html = "\n".join(html_parts)

        if path:
            with open(path, "w") as f:
                f.write(html)

        return html
