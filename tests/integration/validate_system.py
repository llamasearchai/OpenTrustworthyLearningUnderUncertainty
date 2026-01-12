"""
System Validation Script for OpenTLU.

This script verifies that the core components (mocks and schemas) represent
a valid end-to-end flow for the system using mock data.
"""

import sys
from pathlib import Path

# Ensure src is in path
src_path = Path(__file__).parent.parent.parent / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from opentlu.mocks import (  # noqa: E402
    generate_monitor,
    generate_sample,
    generate_scenario,
    generate_uncertainty_estimate,
)  # noqa: E402
from opentlu.schemas import (  # noqa: E402
    MonitorOutput,
    SampleMetadata,
    Scenario,
    UncertaintyEstimate,
)  # noqa: E402


def validate_uncertainty_flow():
    """Validate uncertainty estimation flow."""
    print("Validating Uncertainty Flow...")
    est = generate_uncertainty_estimate("test_model")
    assert isinstance(est, UncertaintyEstimate)
    assert 0.0 <= est.confidence <= 1.0
    assert est.model_id == "test_model"
    print("  [OK] Uncertainty Estimate structure valid.")


def validate_monitor_flow():
    """Validate safety monitor flow."""
    print("Validating Monitor Flow...")
    monitor = generate_monitor("safety_check")
    assert isinstance(monitor, MonitorOutput)
    assert monitor.monitor_id == "safety_check"
    assert "status" in monitor.message
    print("  [OK] Monitor Output structure valid.")


def validate_scenario_flow():
    """Validate scenario management flow."""
    print("Validating Scenario Flow...")
    scenario = generate_scenario("scn_123")
    assert isinstance(scenario, Scenario)
    assert scenario.id == "scn_123"
    assert "priority" in scenario.tags
    print("  [OK] Scenario structure valid.")


def validate_acquisition_flow():
    """Validate data acquisition flow."""
    print("Validating Acquisition Flow...")
    sample = generate_sample("sample_001")
    assert isinstance(sample, SampleMetadata)
    assert sample.id == "sample_001"
    assert "aleatoric_score" in sample.uncertainty
    assert "expected_risk" in sample.risk
    print("  [OK] Sample Metadata structure valid.")


def main():
    """Run all validations."""
    print("Starting OpenTLU System Validation with Mock Data...")
    try:
        validate_uncertainty_flow()
        validate_monitor_flow()
        validate_scenario_flow()
        validate_acquisition_flow()
        print("\nSUCCESS: All mock data flows validated successfully.")
    except AssertionError as e:
        print(f"\nFAILURE: Validation failed with assertion error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nFAILURE: Validation failed with unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
