from opentlu.safety.monitors import ConstraintMonitor, GeofenceMonitor


def test_constraint_monitor():
    monitor = ConstraintMonitor("speed_limit", limit=10.0, metric_key="speed")

    # Safe state
    out = monitor.check({"speed": 5.0})
    assert not out.triggered
    assert out.severity == 0.0

    # Unsafe state
    out = monitor.check({"speed": 15.0})
    assert out.triggered
    assert out.severity == 0.5  # (15-10)/10 = 0.5


def test_geofence_monitor():
    bounds = (0, 0, 10, 10)
    monitor = GeofenceMonitor("geo", bounds)

    # Inside
    out = monitor.check({"x": 5, "y": 5})
    assert not out.triggered

    # Outside
    out = monitor.check({"x": -1, "y": 5})
    assert out.triggered
    assert out.severity == 1.0
