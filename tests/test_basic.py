"""
Basic tests to verify the testing setup works
"""

def test_addition():
    """Simple test to verify pytest works"""
    assert 1 + 1 == 2

def test_string():
    """Another simple test"""
    assert "hello".upper() == "HELLO"

def test_list():
    """Test list operations"""
    items = [1, 2, 3]
    assert len(items) == 3
    assert 2 in items