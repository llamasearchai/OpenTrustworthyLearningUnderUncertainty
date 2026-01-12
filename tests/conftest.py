"""
Pytest configuration and fixtures for OpenTLU tests.
"""

import sys
from pathlib import Path

# Ensure src is in path for imports (fallback if not installed in editable mode)
src_path = Path(__file__).parent.parent / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

import pytest  # noqa: E402
import numpy as np  # noqa: E402


@pytest.fixture
def rng() -> np.random.Generator:
    """Provide a seeded random generator for reproducible tests."""
    return np.random.default_rng(42)


@pytest.fixture
def sample_ensemble_probs() -> np.ndarray:
    """Provide sample ensemble probabilities for testing uncertainty decomposition."""
    # 3 ensemble members, 10 samples, 4 classes
    return np.random.default_rng(42).dirichlet(alpha=[1, 1, 1, 1], size=(3, 10))
