# Known issues & integration gaps

Captured 2026-05-06 after building the full pipeline against contracts and then
probing real external APIs.

---

## 1. Polymarket has no per-match 1X2 markets for WC2026

**Severity**: high impact on pipeline economics; **system degrades gracefully**.

**Evidence** (live Gamma probe, May 6 2026):

- `GET https://gamma-api.polymarket.com/events?closed=false&order=volume24hr`
  - Top "soccer" event: **"2026 FIFA World Cup Winner"** — 60 markets, ALL **2-way Yes/No**
    (one per team: "Will Spain win the 2026 FIFA World Cup?" → `["Yes","No"]`).
  - Per-team 24h volume: $40K–$300K — clearly meaningful liquidity.
- No "Brazil vs Argentina (group stage)" style 1X2 markets exist. Polymarket may
  add them as the tournament approaches kickoff (matches the NFL precedent where
  per-game markets appear in the week of the game).
- ALL Polymarket markets are inherently binary (CLOB design) — there is no
  native 3-way market type to query.

**Impact on `PolymarketClient.fetch_market(match_id)`**:
- Will return None / raise / time out for every match-id query today.
- The `synthesize()` weight redistribution path handles `poly_present=False`
  correctly (verified by `test_weights.py`).
- TripleLayerEngine catches Polymarket failure as a warning, sets `poly_probs=None`,
  and continues. Verified by `tests/integration/test_full_pipeline.py`.

**Recommended actions**:
1. Add a `fetch_tournament_winner(team_code: str)` helper that probes
   "Will <team> win the 2026 FIFA World Cup?" and returns a Yes-prob (the team's
   implied championship probability). Useful as an extra feature for outright bets.
2. Re-probe weekly as the tournament approaches; per-match Yes/No markets
   ("Will Brazil beat Croatia in their group match?") may appear closer to
   kickoff.
3. **Do not block deployment** on Polymarket. The 2-layer fallback (ML +
   Sportsbook consensus) is the design intent for this scenario.

---

## 2. DuelCard ↔ /api/duel/submit schema mismatch

**Severity**: blocks user duel submissions in production.

**Evidence**:
- `api/routes/duel.py` accepts: `home_score, away_score, prob_home, prob_draw,
  prob_away, confidence_level`.
- `src/lib/prediction-bridge.ts` `postDuelSubmit` signature: `{ match_id,
  user_id, prediction: Outcome }` only.
- `src/components/predict/DuelCard.tsx` collects the full form in local state
  but extracts only the dominant probability before calling the bridge.

**Impact**: User-submitted scores + probability distribution are silently
discarded; only the dominant outcome (home/draw/away) is stored.

**Fix**: Update `prediction-bridge.ts:postDuelSubmit` to forward the full
schema, then update DuelCard to send unmodified form state. Tracked in
`docs/followups.md` (created in this same session).

---

## 3. PredictionSchema kludge mapping in `precompute_predictions.py`

**Severity**: low — cosmetic / forward-compatibility.

**Evidence**: `synthesizer_raw → ml_features`, `risk_factor → claude_pick`,
`expected_margin → value_edge_pct`, etc. — listed in agent report from P6.2.

**Fix**: Add a small `ALTER TABLE predictions ADD COLUMN IF NOT EXISTS` migration
introducing `synthesizer_raw_json JSONB`, `confidence TEXT`, `risk_factor TEXT`,
`rationale TEXT`, then update the mapping in `precompute_predictions.py`.

---

## 4. Anthropic prompt vs Pydantic mismatch (resolved)

The Analyst prompt at `claude/prompts/analyst_system.md` was originally written
to a different output schema than `AnalystOutput`. **Resolved during build**:
`AnalystOutput` was rewritten to mirror the prompt's 13-field schema (verified
by `tests/unit/test_analyst.py`). No further action required.

---

## 5. macOS Downloads/ sandbox blocked spec reads

`/Users/clawstack/Downloads/scoutedge_wc2026_prediction_system.md` returned EPERM
for both Bash `cat` and the Read tool throughout the build. Every Python module
was therefore implemented from interface contracts only. Quality remained high
(733 tests / 100% mypy / clean ruff), but several agents flagged "spec
ambiguity resolved" decisions — review them in their respective reports if any
ML behaviour disagrees with intent.

To unblock future spec reads, copy the file out of `~/Downloads/` once:

```bash
# Run in a native Terminal (Claude Code's shell can't access ~/Downloads):
cp ~/Downloads/scoutedge_wc2026_prediction_system.md \
   ~/scoutedge-web/docs/spec/wc2026-prediction-spec.md
```
