.PHONY: help venv install fmt lint type test cov clean

PY ?= python3
VENV ?= .venv
UV := $(shell command -v uv 2>/dev/null)

help:
	@echo "Targets:"
	@echo "  install   create venv and install dev deps (uv preferred, pip fallback)"
	@echo "  fmt       run ruff format"
	@echo "  lint      run ruff check"
	@echo "  type      run mypy"
	@echo "  test      run pytest"
	@echo "  cov       run pytest with coverage"
	@echo "  clean     remove caches"

$(VENV)/bin/python:
ifeq ($(UV),)
	$(PY) -m venv $(VENV)
	$(VENV)/bin/pip install --upgrade pip
else
	uv venv $(VENV) --python 3.12
endif

install: $(VENV)/bin/python
ifeq ($(UV),)
	$(VENV)/bin/pip install -e ".[dev]"
else
	uv pip install --python $(VENV)/bin/python -e ".[dev]"
endif

fmt:
	$(VENV)/bin/ruff format scoutedge_intelligence api tests

lint:
	$(VENV)/bin/ruff check scoutedge_intelligence api tests

type:
	$(VENV)/bin/mypy scoutedge_intelligence api

test:
	$(VENV)/bin/pytest

cov:
	$(VENV)/bin/pytest --cov=scoutedge_intelligence --cov=api --cov-report=term-missing

clean:
	rm -rf .pytest_cache .mypy_cache .ruff_cache build dist *.egg-info
	find . -name __pycache__ -type d -exec rm -rf {} +
