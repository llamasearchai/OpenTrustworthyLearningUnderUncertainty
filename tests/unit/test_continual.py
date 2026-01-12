from opentlu.active_learning.continual import ReplayBuffer


def test_replay_buffer():
    buffer = ReplayBuffer(capacity=2)
    buffer.add("a")
    buffer.add("b")
    assert len(buffer.buffer) == 2

    buffer.add("c")
    assert len(buffer.buffer) == 2
    assert "a" not in buffer.buffer
    assert "c" in buffer.buffer

    sample = buffer.sample(1)
    assert len(sample) == 1
    assert sample[0] in ["b", "c"]
