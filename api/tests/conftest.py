"""Top-level conftest to ensure sys.path is set up before pytest-xdist workers import test modules.

This is specifically needed for tests with top-level module imports (like test_human_input_form.py)
when running with pytest-xdist parallel execution (-n auto). The unit_tests/conftest.py also sets
this up, but pytest-xdist worker processes might not inherit it properly during test collection.
"""

import os
import sys


def pytest_configure(config):
    """Ensure sys.path is configured before test collection in all worker processes."""
    api_dir = os.path.abspath(os.path.dirname(__file__) + "/..")
    if api_dir not in sys.path:
        sys.path.insert(0, api_dir)
