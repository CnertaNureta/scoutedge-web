"""Database URL normalization helpers.

Supabase and managed Postgres providers commonly expose URLs as either
``postgresql://`` or the legacy ``postgres://`` alias. SQLAlchemy needs an
explicit async driver for ``create_async_engine`` and an installed sync driver
for ``create_engine``.
"""

from __future__ import annotations


def coerce_async_database_url(url: str) -> str:
    """Return a SQLAlchemy URL suitable for ``create_async_engine``."""
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://") :]
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://") :]
    return url


def coerce_sync_database_url(url: str) -> str:
    """Return a SQLAlchemy URL suitable for ``create_engine``."""
    if url.startswith("postgresql+asyncpg://"):
        return "postgresql+psycopg://" + url[len("postgresql+asyncpg://") :]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url[len("postgresql://") :]
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url[len("postgres://") :]
    return url.replace("+aiosqlite", "")
