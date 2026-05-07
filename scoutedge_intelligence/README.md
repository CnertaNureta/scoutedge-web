# scoutedge-intelligence

Triple-layer probability prediction engine for ScoutEdge WC2026.

- **Layer A (ML)**: ELO + Dixon-Coles + Player λ + WC adjustments + Football Four Factors
- **Layer B (Polymarket)**: Gamma API crowd intelligence (read-only)
- **Layer C (Sportsbook)**: The Odds API consensus, vig-removed
- **Synthesis**: Claude Sonnet (Divergence Analyst + JSON Synthesizer) + Haiku (Feature Generator + Translator)

## Quickstart

```bash
cd scoutedge_intelligence
make install
cp .env.example .env  # fill in keys
make test
```

## Layout

See `pyproject.toml` and the directory tree below — each module corresponds to a section in
`scoutedge_wc2026_prediction_system.md`:

```
scoutedge_intelligence/  # core package
├── models/              # ELO, Dixon-Coles, Player λ, WC adjustments, in-play
├── features/            # four_factors, fatigue, divergence, rolling
├── sources/             # polymarket, sportsbook (Odds API), fbref, api_football, fifa
├── claude/              # Role 1 (Feature Gen), Role 4 (Translator), prompts/
├── analyst/             # Role 2 (Divergence Analyst) + triggers
├── synthesis/           # Role 3 (JSON Synthesizer) + weights + engine
├── audit/               # Brier/ECE, attribution, calibration, walk-forward
├── experiments/         # A/B framework
├── db/                  # SQLAlchemy + Pydantic models, queries, migrations
├── scripts/             # cron jobs (poly_snapshot, attribution, etc.)
└── utils/               # time, logging, caching helpers

api/                     # FastAPI service
└── routes/              # predict, duel, remix, bracket, ws_live, og, divergence_feedback

tests/{unit,integration,fixtures}/
```

## Development workflow

- `make fmt`  — ruff format
- `make lint` — ruff check
- `make type` — mypy --strict
- `make test` — pytest
- `make cov`  — pytest with coverage (≥80% target)

## Deployment

Deployed standalone to Fly.io. Frontend Next.js calls into FastAPI via
`src/lib/prediction-bridge.ts`.
