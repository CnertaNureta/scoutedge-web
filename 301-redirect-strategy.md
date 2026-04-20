# 301 Redirect Strategy: scoutedge.ai → worldcapiq.com

## Overview

Brand rename from **ScoutEdge** (`scoutedge.ai`) to **WorldCapIQ** (`worldcapiq.com`).
All traffic from the old domain must be permanently redirected (HTTP 301) to preserve SEO equity.

---

## Option A: Vercel (Recommended if scoutedge.ai is on Vercel)

Create a separate Vercel project for `scoutedge.ai` with **no source code** — only a `vercel.json` redirect config:

```json
{
  "redirects": [
    {
      "source": "/(.*)",
      "destination": "https://worldcapiq.com/$1",
      "permanent": true
    }
  ]
}
```

**Steps:**
1. Create a new Vercel project (empty repo or minimal placeholder)
2. Add the `vercel.json` above to the repo root
3. In Vercel project settings → Domains, add `scoutedge.ai` and `www.scoutedge.ai`
4. Update DNS: point `scoutedge.ai` A/CNAME records to Vercel's IP (`76.76.21.21`)
5. Verify redirect: `curl -I https://scoutedge.ai/teams/brazil` should return `301 → https://worldcapiq.com/teams/brazil`

---

## Option B: Cloudflare (If DNS is managed on Cloudflare)

Use **Cloudflare Redirect Rules** (Bulk Redirects):

1. In Cloudflare Dashboard → your `scoutedge.ai` zone → Rules → Redirect Rules
2. Create a **Bulk Redirect** list:
   - Source URL: `scoutedge.ai/`
   - Target URL: `https://worldcapiq.com/`
   - Status: `301`
   - ✅ Preserve path suffix
   - ✅ Preserve query string
3. Alternatively, use a **Single Redirect Rule**:
   - When: `http.host eq "scoutedge.ai"`
   - Then: Dynamic Redirect → `concat("https://worldcapiq.com", http.request.uri.path)`
   - Status: 301

**Cloudflare Page Rule alternative (legacy):**
- URL: `scoutedge.ai/*`
- Setting: Forwarding URL (301 Permanent)
- Destination: `https://worldcapiq.com/$1`

---

## www subdomain

Ensure both apex and www redirect:
- `scoutedge.ai/*` → `https://worldcapiq.com/$1`
- `www.scoutedge.ai/*` → `https://worldcapiq.com/$1`

---

## Verification Checklist

After deploying redirects:

- [ ] `curl -sI https://scoutedge.ai/ | grep -i location` → `https://worldcapiq.com/`
- [ ] `curl -sI https://www.scoutedge.ai/teams/brazil` → `301 → https://worldcapiq.com/teams/brazil`
- [ ] Google Search Console: Add `worldcapiq.com` as a new property and verify ownership
- [ ] Submit `https://worldcapiq.com/sitemap.xml` in new GSC property
- [ ] Request re-indexing of homepage in GSC
- [ ] Check Ahrefs/Semrush after 2–4 weeks for domain authority transfer

---

## SEO Notes

- 301 redirects pass ~90–99% of link equity to the new domain
- Expect temporary ranking fluctuations for 2–6 weeks post-redirect
- Google typically re-indexes the new domain within 2–4 weeks after 301s are live
- Keep the 301 redirects in place for **minimum 12 months** (ideally permanently)
- Do NOT return 302 (temporary) — must be 301 (permanent)

---

## External Link Audit — 11 Tool Sites

The following internal tool sites reference ScoutEdge and need brand update to WorldCapIQ:

| Site / Content | Old Reference | Action |
|----------------|--------------|--------|
| Tool site 1 | ScoutEdge brand mentions | Update to WorldCapIQ |
| Tool site 2 | scoutedge.ai links | Update to worldcapiq.com |
| Tool site 3–11 | Any ScoutEdge references | Update to WorldCapIQ |

**Note to engineer:** Please identify the 11 tool sites from the business plan (ZON-82 context) and update all brand references. Each tool page that mentions ScoutEdge should be updated to WorldCapIQ with the correct URL `worldcapiq.com`.

---

## Structured Data Update (Done)

The `organizationJsonLd()` in `src/lib/og-utils.ts` now includes:
- `logo`: `https://worldcapiq.com/icons/icon-512.png`
- `sameAs`: Twitter, TikTok, Instagram, YouTube handles

Social media profiles to create (when handles are registered):
- Twitter/X: `https://twitter.com/WorldCapIQ`
- TikTok: `https://www.tiktok.com/@worldcapiq`
- Instagram: `https://www.instagram.com/worldcapiq`
- YouTube: `https://www.youtube.com/@worldcapiq`

---

## Final SEO Verification Checklist

- [x] Build passes: `npm run build` ✓
- [x] Canonical URLs: All pages use `worldcapiq.com` base
- [x] Sitemap: `worldcapiq.com/sitemap.xml` + `worldcapiq.com/news-sitemap.xml`
- [x] Robots.txt: Points to correct sitemap URLs
- [x] OG tags: `siteName: 'WorldCapIQ'`, Twitter `@WorldCapIQ`
- [x] JSON-LD Organization: `name: 'WorldCapIQ'`, logo + sameAs populated
- [x] Manifest: `name: 'WorldCapIQ — World Cup 2026 AI Predictions'`
- [ ] 301 redirects live (pending DNS/hosting config — see above)
- [ ] GSC property verified for worldcapiq.com
- [ ] Sitemap submitted in GSC
- [ ] Social media handles registered: @WorldCapIQ
