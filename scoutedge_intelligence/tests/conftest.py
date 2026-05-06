"""Shared pytest fixtures."""

import pytest


@pytest.fixture
def fixtures_dir() -> str:
    import pathlib

    return str(pathlib.Path(__file__).parent / "fixtures")
