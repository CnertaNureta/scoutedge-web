"""Smoke test that verifies package import and version."""

import scoutedge_intelligence


def test_version_present() -> None:
    assert scoutedge_intelligence.__version__ == "0.1.0"


def test_subpackages_importable() -> None:
    import importlib

    for sub in [
        "scoutedge_intelligence.models",
        "scoutedge_intelligence.features",
        "scoutedge_intelligence.sources",
        "scoutedge_intelligence.claude",
        "scoutedge_intelligence.analyst",
        "scoutedge_intelligence.synthesis",
        "scoutedge_intelligence.audit",
        "scoutedge_intelligence.experiments",
        "scoutedge_intelligence.db",
        "scoutedge_intelligence.scripts",
        "scoutedge_intelligence.utils",
        "api",
        "api.routes",
    ]:
        importlib.import_module(sub)
