/* global React, Flag, TEAMS, PhotoPlaceholder, Logo, Stat */

// ─────────────────────────────────────────────
// HERO C — Mosaic collage
// Asymmetric grid of photos + stat tiles + headline shard
// Magazine cover energy, busy but rigorous
// ─────────────────────────────────────────────
window.HeroC = function HeroC() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "var(--ink)", color: "var(--cream)", overflow: "hidden" }}>
      {/* Top nav */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "24px 40px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 20, background: "var(--ink)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo />
          <span className="strike label" style={{ fontSize: 10 }}>WORLD CUP · 2026</span>
        </div>
        <nav style={{ display: "flex", gap: 28 }}>
          {["Predict", "Schedule", "Teams", "Power Rankings", "Daily Briefing"].map((n) => (
            <span key={n} className="label" style={{ fontSize: 12, opacity: 0.85, cursor: "pointer" }}>{n}</span>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="label" style={{ fontSize: 12, opacity: 0.7 }}>EN · ZH</span>
          <button className="btn btn-primary" style={{ padding: "10px 18px", fontSize: 11 }}>Sign In</button>
        </div>
      </div>

      {/* Mosaic */}
      <div style={{ position: "absolute", top: 80, left: 0, right: 0, bottom: 0, display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gridTemplateRows: "repeat(8, 1fr)", gap: 6, padding: 6 }}>

        {/* BIG hero photo — left, tall */}
        <div style={{ gridColumn: "1 / 6", gridRow: "1 / 7", position: "relative", overflow: "hidden" }}>
          <PhotoPlaceholder caption="[#7 · roar · final whistle]" className="no-caption" noCaption style={{ position: "absolute", inset: 0 }}>
            <div style={{ position: "absolute", inset: 0, background: `
              radial-gradient(28% 50% at 50% 50%, rgba(255,255,255,0.06) 0%, transparent 70%),
              radial-gradient(40% 30% at 50% 20%, rgba(243,201,105,0.16) 0%, transparent 60%),
              linear-gradient(180deg, transparent 0%, transparent 50%, rgba(10,13,10,0.85) 100%)
            ` }} />
          </PhotoPlaceholder>
          <div style={{ position: "absolute", left: 24, bottom: 24, right: 24, zIndex: 3 }}>
            <div className="eyebrow gold" style={{ marginBottom: 8 }}>COVER STORY · MAY 12</div>
            <div className="display" style={{ fontSize: 64, lineHeight: 0.92 }}>
              The <em>Captain</em><br/>returns home.
            </div>
            <div className="mono muted" style={{ fontSize: 10, marginTop: 14, letterSpacing: "0.18em" }}>BY EDITORIAL · 8 MIN READ</div>
          </div>
        </div>

        {/* Massive headline shard — top right */}
        <div style={{ gridColumn: "6 / 13", gridRow: "1 / 4", background: "var(--green)", color: "var(--ink)", padding: 36, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div className="eyebrow" style={{ color: "var(--ink)", opacity: 0.7 }}>★ KICK ORACLE · ISSUE 14</div>
          <div className="display" style={{ fontSize: 110, lineHeight: 0.88, color: "var(--ink)" }}>
            Read the <em>match.</em>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
            <p style={{ fontSize: 15, lineHeight: 1.45, maxWidth: 380, margin: 0, color: "var(--ink)", opacity: 0.85 }}>
              Probability you can argue with. Forty-eight fixtures decoded daily by analysts and editors who actually watched.
            </p>
            <button className="btn" style={{ background: "var(--ink)", color: "var(--green)" }}>Today's Pick →</button>
          </div>

          {/* Decorative big number */}
          <div style={{ position: "absolute", top: -20, right: -10, fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 220, color: "rgba(10,13,10,0.08)", lineHeight: 1 }}>26</div>
        </div>

        {/* Live prediction tile */}
        <div style={{ gridColumn: "6 / 10", gridRow: "4 / 7", background: "var(--ink)", border: "1px solid var(--line)", padding: 24, position: "relative" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span className="eyebrow gold">TONIGHT'S PICK</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span className="tick" /> <span className="label" style={{ fontSize: 10, color: "var(--red)" }}>LIVE 73'</span>
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "center" }}>
              <Flag colors={TEAMS.BRA.colors} style={{ width: 40, height: 28, marginBottom: 8 }} />
              <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 18, color: "var(--green)" }}>BRA</div>
              <div className="bignum green" style={{ fontSize: 44 }}>2</div>
            </div>
            <div className="display" style={{ fontSize: 22, fontStyle: "italic", color: "var(--muted)" }}>vs</div>
            <div style={{ textAlign: "center" }}>
              <Flag colors={TEAMS.ARG.colors} style={{ width: 40, height: 28, marginBottom: 8 }} />
              <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 18 }}>ARG</div>
              <div className="bignum" style={{ fontSize: 44 }}>1</div>
            </div>
          </div>
          <div style={{ marginTop: 14, display: "flex", height: 6, borderRadius: 3, overflow: "hidden", background: "var(--surface)" }}>
            <div style={{ width: "58%", background: "var(--green)" }} />
            <div style={{ width: "14%", background: "var(--surface-2)" }} />
            <div style={{ width: "28%", background: "var(--gold)" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--green)" }}>58%</span>
            <span className="mono muted" style={{ fontSize: 10 }}>14% DRAW</span>
            <span className="mono gold" style={{ fontSize: 10 }}>28%</span>
          </div>
        </div>

        {/* Stat tile */}
        <div style={{ gridColumn: "10 / 13", gridRow: "4 / 6", background: "var(--gold)", color: "var(--ink)", padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div className="eyebrow" style={{ color: "var(--ink)", opacity: 0.7 }}>HIT RATE · 30D</div>
          <div className="bignum" style={{ fontSize: 80, color: "var(--ink)" }}>73<span style={{ fontSize: 28 }}>%</span></div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink)", opacity: 0.7 }}>2,140 OF 2,917 CALLS</div>
        </div>

        {/* Small photo */}
        <div style={{ gridColumn: "10 / 13", gridRow: "6 / 7", position: "relative", overflow: "hidden" }}>
          <PhotoPlaceholder caption="[crowd · flares]" className="no-caption" noCaption style={{ position: "absolute", inset: 0 }} />
          <div style={{ position: "absolute", left: 12, bottom: 8, zIndex: 3 }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "var(--cream)" }}>[crowd · flares]</div>
          </div>
        </div>

        {/* Bottom strip — top contenders preview */}
        <div style={{ gridColumn: "1 / 13", gridRow: "7 / 9", background: "var(--soft)", border: "1px solid var(--line)", padding: "18px 28px", display: "flex", alignItems: "center", gap: 28, overflow: "hidden" }}>
          <div style={{ flexShrink: 0 }}>
            <div className="eyebrow green">POWER RANK</div>
            <div className="display" style={{ fontSize: 26, fontStyle: "italic", marginTop: 4 }}>Contenders</div>
          </div>
          <div style={{ flex: 1, display: "flex", gap: 18, overflow: "hidden" }}>
            {[
              { t: TEAMS.BRA, r: 1, e: "+12" },
              { t: TEAMS.ARG, r: 2, e: "+8" },
              { t: TEAMS.FRA, r: 3, e: "—" },
              { t: TEAMS.ENG, r: 4, e: "+3" },
              { t: TEAMS.ESP, r: 5, e: "-1" },
              { t: TEAMS.GER, r: 6, e: "-2" },
            ].map((x) => (
              <div key={x.t.code} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", border: "1px solid var(--line)", background: "var(--ink)" }}>
                <div className="bignum gold" style={{ fontSize: 24, fontStyle: "italic", fontFamily: "var(--f-display)", fontWeight: 400 }}>{x.r}</div>
                <Flag colors={x.t.colors} style={{ width: 22, height: 16 }} />
                <div>
                  <div className="label" style={{ fontSize: 11 }}>{x.t.code}</div>
                  <div className="mono" style={{ fontSize: 9, color: x.e.startsWith("+") ? "var(--green)" : x.e.startsWith("-") ? "var(--red)" : "var(--muted)" }}>{x.e}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary" style={{ flexShrink: 0 }}>Full Rankings →</button>
        </div>
      </div>
    </div>
  );
};
