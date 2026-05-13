/* global React, Flag, TEAMS, PhotoPlaceholder, Logo, Stat */

// ─────────────────────────────────────────────
// HERO B — Editorial split with live prediction card
// Left: massive serif head + body, Right: prediction widget
// ─────────────────────────────────────────────
window.HeroB = function HeroB() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "var(--ink)", color: "var(--cream)", overflow: "hidden" }}>
      {/* Backdrop layers */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0a0d0a 0%, #0f1a13 60%, #0a0d0a 100%)" }} />
      <div className="pitch-grid" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 50% at 80% 30%, rgba(168,224,99,0.16), transparent 60%), radial-gradient(50% 40% at 10% 90%, rgba(243,201,105,0.12), transparent 60%)" }} />

      {/* Top nav */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "28px 56px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
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

      <div style={{ position: "absolute", inset: 0, paddingTop: 110, paddingLeft: 56, paddingRight: 56, paddingBottom: 56, display: "grid", gridTemplateColumns: "minmax(0,1fr) 460px", gap: 56, alignItems: "center" }}>
        {/* LEFT — Editorial headline */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", border: "1px solid var(--red)" }}>
              <span className="tick" /> <span className="label" style={{ fontSize: 10, color: "var(--red)" }}>LIVE NOW</span>
            </span>
            <span className="eyebrow muted">MATCHDAY 03 · 12 MAY 2026</span>
          </div>

          <h1 className="display" style={{ fontSize: 132, margin: 0, lineHeight: 0.9 }}>
            Every<br/>
            <em style={{ color: "var(--gold)" }}>fixture,</em><br/>
            decoded.
          </h1>

          <div style={{ display: "flex", alignItems: "flex-start", gap: 32, marginTop: 36, maxWidth: 640 }}>
            <div style={{ width: 4, alignSelf: "stretch", background: "var(--green)" }} />
            <p style={{ fontSize: 19, lineHeight: 1.5, margin: 0, opacity: 0.9 }}>
              Forty-eight fixtures. Thirty-two federations. One model trained on a decade of FBref data and tempered by the editors who watched every minute of it. <em style={{ color: "var(--gold)" }}>Probability you can argue with — at the pub.</em>
            </p>
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
            <button className="btn btn-primary">Predict Tonight's Match →</button>
            <button className="btn btn-ghost">Browse Schedule</button>
          </div>

          {/* Stat row */}
          <div style={{ display: "flex", gap: 48, marginTop: 56, paddingTop: 24, borderTop: "1px solid var(--line)" }}>
            <Stat n="73.4" unit="%" label="Hit rate · last 30d" />
            <Stat n="48" label="Fixtures tracked" />
            <Stat n="32" label="Federations" />
            <Stat n="2.1" unit="M" label="Predictions cast" />
          </div>
        </div>

        {/* RIGHT — Live prediction card */}
        <div className="card" style={{ background: "rgba(15,26,19,0.7)", backdropFilter: "blur(14px)", border: "1px solid var(--line-strong)", padding: 28, position: "relative", overflow: "hidden" }}>
          {/* Corner ribbon */}
          <div style={{ position: "absolute", top: 0, right: 0, padding: "8px 16px", background: "var(--green)", color: "var(--ink)" }}>
            <span className="label" style={{ fontSize: 10 }}>★ TONIGHT'S PICK</span>
          </div>

          <div className="eyebrow gold" style={{ marginBottom: 8 }}>GROUP D · MATCH 14</div>
          <div className="mono muted" style={{ fontSize: 11, marginBottom: 20 }}>EST. 09:00 PM ET · MERCEDES-BENZ STADIUM</div>

          {/* Teams */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <TeamPick team={TEAMS.BRA} pct={58} winner />
            <div className="display" style={{ fontSize: 28, fontStyle: "italic", color: "var(--muted)" }}>vs</div>
            <TeamPick team={TEAMS.ARG} pct={42} align="right" />
          </div>

          {/* Probability bar */}
          <div style={{ marginBottom: 24 }}>
            <div className="mono muted" style={{ fontSize: 10, marginBottom: 6, letterSpacing: "0.16em" }}>WIN PROBABILITY</div>
            <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", background: "var(--surface)" }}>
              <div style={{ width: "58%", background: "linear-gradient(90deg, var(--green), #c8f08a)" }} />
              <div style={{ width: "14%", background: "var(--surface-2)" }} />
              <div style={{ width: "28%", background: "linear-gradient(90deg, #e8a060, var(--gold))" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--green)" }}>BRA · 58%</span>
              <span className="mono muted" style={{ fontSize: 11 }}>DRAW · 14%</span>
              <span className="mono gold" style={{ fontSize: 11 }}>ARG · 28%</span>
            </div>
          </div>

          {/* Score prediction */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", marginBottom: 20 }}>
            <span className="label muted" style={{ fontSize: 11 }}>EXPECTED SCORE</span>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span className="bignum green" style={{ fontSize: 38 }}>2</span>
              <span className="mono muted" style={{ fontSize: 14 }}>—</span>
              <span className="bignum" style={{ fontSize: 38, color: "var(--cream)" }}>1</span>
            </div>
          </div>

          {/* Editor note */}
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface-2)", flexShrink: 0, border: "1px solid var(--line)" }} />
            <div>
              <div className="mono" style={{ fontSize: 10, color: "var(--green)", letterSpacing: "0.18em", marginBottom: 4 }}>EDITOR'S NOTE</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, fontStyle: "italic", color: "rgba(245,239,228,0.85)" }}>
                "Vinícius back from suspension. Argentina rests Messi. Watch the midfield press in the first 20 minutes."
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom marquee */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "12px 56px", background: "var(--ink)", borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 32, fontSize: 11, fontFamily: "var(--f-condensed)", letterSpacing: "0.14em", textTransform: "uppercase", overflow: "hidden" }}>
        <span className="strike label" style={{ fontSize: 10 }}>LIVE</span>
        <span style={{ display: "flex", gap: 32, opacity: 0.85, whiteSpace: "nowrap" }}>
          <span><span className="gold">BRA 2</span> — 1 ARG · 73'</span>
          <span className="muted">·</span>
          <span>ENG 0 — 0 NED · HT</span>
          <span className="muted">·</span>
          <span><span className="gold">FRA 3</span> — 2 ESP · FT</span>
          <span className="muted">·</span>
          <span>GER 1 — 1 POR · 56'</span>
          <span className="muted">·</span>
          <span>USA 2 — 0 JPN · FT</span>
        </span>
      </div>
    </div>
  );
};

function TeamPick({ team, pct, winner, align = "left" }) {
  return (
    <div style={{ textAlign: align }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexDirection: align === "right" ? "row-reverse" : "row" }}>
        <Flag colors={team.colors} style={{ width: 36, height: 26 }} />
        <div>
          <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 22, lineHeight: 1, color: winner ? "var(--green)" : "var(--cream)" }}>
            {team.code}
          </div>
          <div className="mono muted" style={{ fontSize: 10, marginTop: 3, letterSpacing: "0.16em" }}>{team.name.toUpperCase()}</div>
        </div>
      </div>
      <div className="bignum" style={{ fontSize: 56, marginTop: 14, color: winner ? "var(--green)" : "var(--cream)" }}>
        {pct}<span style={{ fontSize: 22, color: "var(--cream)", opacity: 0.6 }}>%</span>
      </div>
    </div>
  );
}
window.TeamPick = TeamPick;
