"""API-Football team-name → canonical-name aliases.

Built from observed mismatches. Extend as the script reports unmatched
team names. Keys are the canonical name as stored in scoutedge_intelligence's
teams.name; values are the API-Football display name(s).
"""

from __future__ import annotations

import unicodedata

ALIASES: dict[str, str] = {
    # Korea
    "korea republic": "south korea",
    "south korea": "south korea",
    # USA / United States
    "usa": "united states",
    "united states": "united states",
    # Iran
    "ir iran": "iran",
    "iran": "iran",
    # Türkiye / Turkey
    "turkiye": "turkey",
    "turkey": "turkey",
    # Côte d'Ivoire / Ivory Coast
    "cote d'ivoire": "ivory coast",
    "ivory coast": "ivory coast",
    # Curaçao
    "curacao": "curacao",
    # Cape Verde
    "cape verde islands": "cape verde",
    "cape verde": "cape verde",
}


def normalise_team_name(name: str) -> str:
    """Lowercase, strip diacritics, collapse whitespace, apply alias."""
    if not name:
        return ""
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_only = nfkd.encode("ascii", "ignore").decode("ascii").lower().strip()
    collapsed = " ".join(ascii_only.split())
    return ALIASES.get(collapsed, collapsed)
