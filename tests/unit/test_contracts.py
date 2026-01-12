from opentlu.foundations.contracts import UncertaintyEstimate, UncertaintyType


def test_contract_instantiation():
    """Verify that pydantic models instantiate correctly."""
    unc = UncertaintyEstimate(
        confidence=0.9, aleatoric_score=0.1, epistemic_score=0.01, source="unit_test"
    )
    assert unc.confidence == 0.9
    assert unc.source == "unit_test"


def test_enums():
    assert UncertaintyType.ALEATORIC == "aleatoric"
