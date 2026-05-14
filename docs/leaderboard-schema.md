# Leaderboard Schema & Rollout Plan

> **Status update (2026-05-12)**: the schema is **already shipped** in the
> existing migration
> `supabase/migrations/20260413_create_prediction_leagues.sql`. Tables
> `user_match_predictions` + `prediction_scores`, plus materialized views
> `league_standings` + `global_leaderboard`, plus `score_match_predictions()`
> and `refresh_leaderboards()` SQL functions are all live.
>
> The magazine adapter `src/lib/leaderboard-data.ts` now reads from
> `global_leaderboard`. `showLeaderboard` in `home-magazine-data.ts`
> automatically becomes `true` when the view has any rows. Currently it's
> false because no 2026 match has finished yet (tournament starts 2026-06-11).
>
> **What's still pending**: a per-user "your rank" lookup tied to the current
> auth session — requires either Supabase SSR cookie reading in server
> components, or a client-side fetch from a new
> `/api/v1/me/leaderboard-rank` endpoint. The "Your standing" card today
> shows a sign-in CTA placeholder.
>
> The original design doc below remains as historical/architecture
> reference. **The actual schema uses different table/column names** —
> see migration file for the real DDL.

---

## 1. Database (Supabase / Postgres)

### 1.1 Table — `user_predictions`

One row per user/match prediction. A user can update their prediction up until
match kickoff (`updated_at` tracked via trigger).

```sql
CREATE TABLE public.user_predictions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id              text NOT NULL,                       -- references matches.id (string ids from API-Football)
  predicted_home_score  smallint NOT NULL CHECK (predicted_home_score BETWEEN 0 AND 30),
  predicted_away_score  smallint NOT NULL CHECK (predicted_away_score BETWEEN 0 AND 30),
  points                smallint NOT NULL DEFAULT 0,         -- 0 until settled
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  settled_at            timestamptz,                         -- null until match is final + scored

  -- A user can only have one prediction per match.
  CONSTRAINT user_predictions_user_match_unique UNIQUE (user_id, match_id)
);

-- Maintain updated_at on row change.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_predictions_set_updated_at
BEFORE UPDATE ON public.user_predictions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

### 1.2 Indexes

```sql
-- "All my predictions" lookup
CREATE INDEX idx_user_predictions_user_id
  ON public.user_predictions (user_id);

-- "Everyone who predicted this match" lookup, used by the settlement worker
CREATE INDEX idx_user_predictions_match_id
  ON public.user_predictions (match_id);

-- Leaderboard sort (covers ORDER BY points DESC partial scan)
CREATE INDEX idx_user_predictions_user_points
  ON public.user_predictions (user_id, points);

-- Settlement worker: "unsettled predictions for a finished match"
CREATE INDEX idx_user_predictions_unsettled
  ON public.user_predictions (match_id)
  WHERE settled_at IS NULL;
```

---

## 2. Scoring Algorithm

When a match becomes `FINISHED` (or equivalent terminal status), the settlement
worker reads the final score and writes back `points` for every prediction on
that match.

| Outcome                                                            | Points |
| ------------------------------------------------------------------ | ------ |
| Exact score (home and away both correct)                           | **+3** |
| Correct outcome only (home win / draw / away win)                  | **+1** |
| Wrong outcome                                                      | **0**  |

```ts
// src/lib/scoring/predict-points.ts
export function scorePrediction(
  predicted: { home: number; away: number },
  actual: { home: number; away: number }
): 0 | 1 | 3 {
  if (predicted.home === actual.home && predicted.away === actual.away) return 3
  const sign = (h: number, a: number) => Math.sign(h - a) // -1, 0, +1
  if (sign(predicted.home, predicted.away) === sign(actual.home, actual.away)) return 1
  return 0
}
```

The settlement worker should be idempotent: only update rows where
`settled_at IS NULL` so re-runs do not double-count.

```sql
UPDATE public.user_predictions
SET    points = $points,
       settled_at = now()
WHERE  match_id = $match_id
  AND  settled_at IS NULL;
```

---

## 3. Leaderboard View

Start with a simple view. Promote to a materialized view if the homepage
adapter ever hits latency issues.

```sql
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  user_id,
  SUM(points)                                                AS total_points,
  COUNT(*)              FILTER (WHERE settled_at IS NOT NULL) AS predictions_settled,
  COUNT(*)              FILTER (WHERE points = 3)             AS exact_hits,
  COUNT(*)              FILTER (WHERE points = 1)             AS outcome_hits,
  MAX(settled_at)                                            AS last_settled_at
FROM public.user_predictions
WHERE settled_at IS NOT NULL
GROUP BY user_id;
```

### 3.1 "Your rank" query

```sql
WITH ranked AS (
  SELECT
    user_id,
    total_points,
    predictions_settled,
    exact_hits,
    RANK() OVER (ORDER BY total_points DESC, exact_hits DESC) AS rank
  FROM public.leaderboard
)
SELECT *
FROM   ranked
WHERE  user_id = $1;
```

`RANK()` (not `DENSE_RANK()`) is intentional — ties consume rank slots, which
matches user intuition ("we're both 4th, next person is 6th").

### 3.2 Top-N podium query (for the homepage)

```sql
SELECT
  user_id,
  total_points,
  predictions_settled,
  exact_hits,
  RANK() OVER (ORDER BY total_points DESC, exact_hits DESC) AS rank
FROM public.leaderboard
ORDER BY total_points DESC, exact_hits DESC
LIMIT 3;
```

The display name comes from `auth.users.raw_user_meta_data->>'username'` or
the profile table — joined client-side in the adapter to keep the view simple.

---

## 4. Row Level Security (RLS)

Enable RLS and lock writes to the row owner. Reads are public so leaderboards
can render for anonymous visitors.

```sql
ALTER TABLE public.user_predictions ENABLE ROW LEVEL SECURITY;

-- Anyone (including anon) may read. The leaderboard is public.
CREATE POLICY "user_predictions_select_all"
  ON public.user_predictions
  FOR SELECT
  USING (true);

-- A user may only insert rows for themselves.
CREATE POLICY "user_predictions_insert_own"
  ON public.user_predictions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- A user may only update their own prediction, and only before settlement.
CREATE POLICY "user_predictions_update_own_unsettled"
  ON public.user_predictions
  FOR UPDATE
  USING (auth.uid() = user_id AND settled_at IS NULL)
  WITH CHECK (auth.uid() = user_id AND settled_at IS NULL);

-- No client-side deletes. Removal is admin/CASCADE only.
-- Settlement-worker writes go via the service role, which bypasses RLS.
```

---

## 5. Data Adapter Contract

Implement under `src/lib/leaderboard-data.ts`. The homepage calls this from
the existing magazine data loader (`getMagazineHomeData`) and folds the result
into the `MagazineHomeData` returned to `MagazineHomePage.tsx`.

```ts
export interface TopUser {
  rank: number              // 1, 2, 3 — RANK() output
  userId: string
  displayName: string
  totalPoints: number
  predictionsSettled: number
  exactHits: number
}

export interface UserStanding {
  rank: number
  totalPoints: number
  predictionsSettled: number
  exactHits: number
}

export interface LeaderboardData {
  podium: [TopUser, TopUser, TopUser] | TopUser[]   // up to 3
  yourRank?: UserStanding                            // undefined for anon users
}

export async function getLeaderboardData(
  userId?: string
): Promise<LeaderboardData> {
  // 1. SELECT top 3 from public.leaderboard ORDER BY total_points DESC.
  // 2. If userId, run the "your rank" CTE above and attach yourRank.
  // 3. Join display names from the profile table (or auth metadata).
}
```

The `LeaderboardModule` component in
`src/components/home-magazine/MoreModules.tsx` should be updated to accept
`{ data?: LeaderboardData }` as a prop. When `data` is undefined, render the
existing demo data (only used in Storybook / dev fallbacks).

---

## 6. When to Flip `showLeaderboard`

The `showLeaderboard` flag in `src/lib/home-magazine-data.ts` should flip
from `false` → `true` only when **all** of the following are true:

1. The `user_predictions` table exists in production Supabase.
2. The settlement worker has run at least one full matchday cycle and
   `SELECT COUNT(DISTINCT user_id) FROM public.leaderboard` returns
   **≥ 50 active predictors**.
3. `getLeaderboardData()` is wired into `getMagazineHomeData()` and the
   homepage receives real podium data.
4. `LeaderboardModule` consumes the real `data` prop and falls back gracefully
   when fewer than 3 podium entries exist.

When all four are met, set `showLeaderboard: true` in `home-magazine-data.ts`,
remove this section's "DESIGN" status banner, and update the comment in
`MagazineHomePage.tsx` next to the conditional render.

---

## 7. Future Extensions (Not Phase 6)

- **Per-tournament leaderboards** — add `tournament_id` to `user_predictions`
  and partition the view.
- **Weekly / matchday windows** — partial views like `leaderboard_week`
  filtered by `settled_at`.
- **Streak / consecutive-hit bonuses** — additional columns on `user_predictions`
  computed at settlement time.
- **Anti-gaming** — rate-limit prediction edits, lock predictions N minutes
  before kickoff at the API layer.
