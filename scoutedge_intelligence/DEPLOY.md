# Deploy — ScoutEdge Intelligence

One-command deploy of the WC2026 prediction engine to Fly.io (`sjc` region).

---

## Prerequisites

- [Fly.io account](https://fly.io) with billing configured
- `flyctl` installed: `brew install flyctl` or `curl -L https://fly.io/install.sh | sh`
- Docker installed locally (for the optional local-verify step)
- All required secret values listed in `.env.example`

---

## Deploy Steps

### 1. Change into the service directory

```bash
cd scoutedge_intelligence
```

### 2. Authenticate with Fly.io

```bash
fly auth login
```

### 3. Create the app (skip if it already exists)

```bash
fly apps create scoutedge-intelligence
```

If the app already exists you will see `Error: app scoutedge-intelligence already exists` — that is safe to ignore.

### 4. Set production secrets

Fly.io secrets are injected as environment variables at runtime and are never baked into the image.

```bash
fly secrets set \
  DATABASE_URL="postgresql://user:pass@host:5432/scoutedge" \
  ANTHROPIC_API_KEY="sk-ant-..." \
  ODDS_API_KEY="..." \
  API_FOOTBALL_KEY="..." \
  SUPABASE_SERVICE_ROLE_KEY="..." \
  REDIS_URL="redis://..."
```

Run `fly secrets list` to verify the keys (values are redacted).

### 5. Deploy

```bash
fly deploy
```

Fly builds the image from `Dockerfile`, pushes it to the Fly registry, and performs a rolling replacement of running machines. The `/healthz` check must pass before traffic is routed to each new instance.

---

## Local Verify (Optional)

Build and run the image locally before deploying to catch packaging issues early.

```bash
# Build
docker build -t scoutedge-intel .

# Run (substitute real values)
docker run --rm -p 8080:8080 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/scoutedge" \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  -e REDIS_URL="redis://localhost:6379" \
  scoutedge-intel
```

### Health check

```bash
curl http://localhost:8080/healthz
# Expected: {"status":"ok","version":"0.1.0"}
```

---

## Rollback

List recent releases and their image tags:

```bash
fly releases
```

Deploy a specific previous image:

```bash
fly deploy --image registry.fly.io/scoutedge-intelligence:<previous-image-tag>
```

---

## Useful Commands

| Command | Description |
|---|---|
| `fly status` | Show machine status |
| `fly logs` | Stream live logs |
| `fly ssh console` | Open a shell on a running machine |
| `fly secrets list` | List secret keys (values redacted) |
| `fly scale count 2` | Increase running machine count |
| `fly scale memory 1024` | Increase memory (MB) |
| `fly regions list` | Show available regions |

---

## Notes

- The service is **stateless**; all persistent data lives in Supabase (PostgreSQL) and Redis.
- `auto_stop_machines = "stop"` means idle machines are suspended to save cost. Cold-start latency is ~1–2 s; set `min_machines_running = 1` to keep at least one warm.
- Secrets rotation: run `fly secrets set KEY=newvalue` at any time — Fly performs a zero-downtime rolling restart automatically.
