/* global React, Flag, TEAMS, PhotoPlaceholder, Logo, Stat */

// ─────────────────────────────────────────────
// HERO A v2 — Cinematic full-bleed (polished)
// • Layered photo with stadium-light + grain + vignette
// • Magazine masthead at top
// • Mixed-weight headline with strike accent
// • Floating "tonight's match" cover-card overlay
// • Bottom hit-rate strip + live ticker
// ─────────────────────────────────────────────
window.HeroA = function HeroA({ hideMasthead = false } = {}) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "var(--ink)", color: "var(--cream)", overflow: "hidden" }}>
      {/* ── Background photo placeholder with cinematic treatment ── */}
      <PhotoPlaceholder caption="[striker · roar · golden-hour stadium]" className="no-caption" noCaption style={{ position: "absolute", inset: 0 }}>
        {/* Faux subject mass — feels like a player photo on the right */}
        <div style={{
          position: "absolute", inset: 0,
          background: `
            radial-gradient(22% 45% at 64% 52%, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 30%, transparent 70%),
            radial-gradient(14% 22% at 66% 30%, rgba(245,239,228,0.10) 0%, transparent 70%),
            radial-gradient(28% 35% at 65% 75%, rgba(0,0,0,0.55) 0%, transparent 60%)
          `,
        }} />
        {/* Stadium spotlights from above */}
        <div style={{ position: "absolute", inset: 0, background: `
          radial-gradient(35% 25% at 30% 0%, rgba(243,201,105,0.16) 0%, transparent 70%),
          radial-gradient(35% 25% at 75% 0%, rgba(243,201,105,0.10) 0%, transparent 70%)
        ` }} />
        {/* Pitch glow from below */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 50% at 50% 115%, rgba(168,224,99,0.22), transparent 70%)" }} />
        {/* Edge vignette + left-side darken for headline legibility */}
        <div style={{ position: "absolute", inset: 0, background: `
          linear-gradient(95deg, rgba(10,13,10,0.92) 0%, rgba(10,13,10,0.72) 28%, rgba(10,13,10,0.15) 50%, rgba(10,13,10,0.0) 65%, rgba(10,13,10,0.85) 100%),
          linear-gradient(180deg, rgba(10,13,10,0.55) 0%, transparent 18%, transparent 70%, rgba(10,13,10,0.95) 100%)
        ` }} />
        {/* Subtle pitch grid overlay */}
        <div className="pitch-grid" style={{ position: "absolute", inset: 0, opacity: 0.5, mixBlendMode: "screen" }} />
      </PhotoPlaceholder>

      {/* ── Masthead ── */}
      {!hideMasthead && (
      <header style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "20px 56px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 12, borderBottom: "1px solid rgba(245,239,228,0.12)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Logo />
          <span style={{ height: 18, width: 1, background: "rgba(245,239,228,0.2)" }} />
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.24em", color: "rgba(245,239,228,0.55)" }}>VOL. 02 · ISSUE 14 · 12 MAY 2026</span>
        </div>
        <nav style={{ display: "flex", gap: 26 }}>
          {["Predict", "Schedule", "Teams", "Rankings", "Briefing", "Compare"].map((n, i) => (
            <span key={n} className="label" style={{ fontSize: 11, color: i === 0 ? "var(--green)" : "var(--cream)", opacity: i === 0 ? 1 : 0.8, cursor: "pointer", position: "relative" }}>
              {n}
              {i === 0 && <span style={{ position: "absolute", left: -10, top: "50%", transform: "translateY(-50%)", color: "var(--green)" }}>·</span>}
            </span>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", color: "rgba(245,239,228,0.6)" }}>EN · ZH</span>
          <button className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 10 }}>Sign In</button>
        </div>
      </header>
      )}

      {/* ── Left edge vertical issue marker ── */}
      <div style={{ position: "absolute", left: 24, top: 100, bottom: 90, display: "flex", alignItems: "center", zIndex: 10 }}>
        <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", display: "flex", gap: 32, alignItems: "center" }}>
          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.32em", color: "var(--green)" }}>★ KICK ORACLE</span>
          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.32em", color: "rgba(245,239,228,0.45)" }}>FIELD INTELLIGENCE EST. 2024</span>
        </div>
      </div>

      {/* ── Floating "Tonight's Match" cover card (top-right) ── */}
      <div style={{
        position: "absolute", top: 120, right: 56, width: 300, zIndex: 11,
        background: "rgba(15,20,15,0.78)", backdropFilter: "blur(18px) saturate(1.3)",
        border: "1px solid rgba(245,239,228,0.18)",
        padding: 22,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span className="tick" /><span className="label" style={{ fontSize: 9, color: "var(--red)" }}>LIVE · 73'</span>
          </span>
          <span className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "rgba(245,239,228,0.55)" }}>GROUP D · M14</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <div style={{ textAlign: "center" }}>
            <Flag colors={TEAMS.BRA.colors} style={{ width: 30, height: 22, marginBottom: 6 }} />
            <div className="label" style={{ fontSize: 12, color: "var(--green)" }}>BRA</div>
            <div className="bignum green" style={{ fontSize: 40 }}>2</div>
          </div>
          <div className="display" style={{ fontSize: 18, fontStyle: "italic", color: "var(--muted)" }}>—</div>
          <div style={{ textAlign: "center" }}>
            <Flag colors={TEAMS.ARG.colors} style={{ width: 30, height: 22, marginBottom: 6 }} />
            <div className="label" style={{ fontSize: 12 }}>ARG</div>
            <div className="bignum" style={{ fontSize: 40, color: "var(--cream)" }}>1</div>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <div className="mono" style={{ fontSize: 9, marginBottom: 5, letterSpacing: "0.18em", color: "rgba(245,239,228,0.5)" }}>WIN PROBABILITY · LIVE</div>
          <div style={{ display: "flex", height: 6, overflow: "hidden", background: "var(--surface)" }}>
            <div style={{ width: "58%", background: "var(--green)" }} />
            <div style={{ width: "14%", background: "var(--surface-2)" }} />
            <div style={{ width: "28%", background: "var(--gold)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span className="mono" style={{ fontSize: 9, color: "var(--green)" }}>58%</span>
            <span className="mono muted" style={{ fontSize: 9 }}>14%</span>
            <span className="mono gold" style={{ fontSize: 9 }}>28%</span>
          </div>
        </div>

        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "10px 0", fontSize: 11 }}>Open Match Brief →</button>
      </div>

      {/* ── Main headline — bottom-left magazine treatment ── */}
      <div style={{ position: "absolute", left: 72, bottom: 96, right: 380, zIndex: 10 }}>
        <div className="eyebrow green" style={{ marginBottom: 22, display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 24, height: 1, background: "var(--green)" }} />
          LIVE INTELLIGENCE · 48 FIXTURES · 7 GROUPS · 32 FEDERATIONS
        </div>

        <h1 className="display" style={{ fontSize: 168, margin: 0, lineHeight: 0.88, letterSpacing: "-0.02em" }}>
          Read the
          <br />
          <em style={{ color: "var(--gold)" }}>match</em>{" "}
          <span style={{
            display: "inline-block", verticalAlign: "middle", padding: "6px 22px",
            background: "var(--green)", color: "var(--ink)",
            fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 76,
            letterSpacing: "0.01em", transform: "translateY(-12px)",
            boxShadow: "8px 8px 0 var(--ink), 8px 8px 0 1px rgba(168,224,99,0.4)",
          }}>
            BEFORE
          </span>
          <br />
          it happens.
        </h1>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginTop: 36, gap: 40, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 18, maxWidth: 500 }}>
            <div style={{ width: 3, alignSelf: "stretch", background: "var(--green)" }} />
            <p style={{ fontSize: 16, lineHeight: 1.55, margin: 0, opacity: 0.9 }}>
              Daily predictions, head-to-head probability, and editor-grade narratives for every fixture of the World Cup 2026. Built by analysts who fell in love with the game. <em style={{ color: "var(--gold)" }}>Probability you can argue with — at the pub.</em>
            </p>
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            <button className="btn btn-primary">Today's Predictions →</button>
            <button className="btn btn-ghost">Watch Probabilities</button>
          </div>
        </div>
      </div>

      {/* ── Bottom credit + stats strip ── */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "14px 56px", borderTop: "1px solid rgba(245,239,228,0.12)", background: "rgba(10,13,10,0.78)", backdropFilter: "blur(10px)", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 12 }}>
        <div style={{ display: "flex", gap: 44 }}>
          <Stat n="73.4" unit="%" label="Hit rate · 30d" />
          <Stat n="48" label="Fixtures tracked" />
          <Stat n="32" label="Federations" />
          <Stat n="2.1" unit="M" label="Predictions cast" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", color: "var(--green)" }}>SCROLL ↓</span>
          <span className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em" }}>SECTION 02 · TONIGHT'S MATCH</span>
        </div>
      </div>

      {/* ── Live ticker pinned just above bottom strip ── */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, padding: "8px 56px", background: "rgba(168,224,99,0.06)", borderTop: "1px dashed rgba(168,224,99,0.25)", borderBottom: "1px dashed rgba(168,224,99,0.25)", display: "flex", alignItems: "center", gap: 24, zIndex: 11, overflow: "hidden" }}>
        <span className="strike label" style={{ fontSize: 9, flexShrink: 0 }}>LIVE</span>
        <div style={{ display: "flex", gap: 26, fontFamily: "var(--f-condensed)", fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
          <span><span className="gold">BRA 2</span> — 1 ARG · 73'</span>
          <span className="muted">·</span>
          <span>ENG 0 — 0 NED · HT</span>
          <span className="muted">·</span>
          <span><span className="gold">FRA 3</span> — 2 ESP · FT</span>
          <span className="muted">·</span>
          <span>GER 1 — 1 POR · 56'</span>
          <span className="muted">·</span>
          <span>USA 2 — 0 JPN · FT</span>
          <span className="muted">·</span>
          <span>JPN→ROUND OF 16</span>
        </div>
      </div>
    </div>
  );
};

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", border: "2px solid var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 18, color: "var(--gold)" }}>K</div>
      <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, letterSpacing: "0.06em", fontSize: 18 }}>KICK <span style={{ color: "var(--green)" }}>ORACLE</span></div>
    </div>
  );
}
window.Logo = Logo;

function Stat({ n, unit, label }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 26, color: "var(--gold)", lineHeight: 1 }}>
        {n}<span style={{ fontSize: 13, color: "var(--cream)" }}>{unit}</span>
      </div>
      <div className="mono muted" style={{ fontSize: 9, marginTop: 4, letterSpacing: "0.16em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}
window.Stat = Stat;
