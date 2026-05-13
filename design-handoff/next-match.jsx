/* global React, Flag, TEAMS, PhotoPlaceholder, Stat */
const { useState: useStateNM } = React;

// ─────────────────────────────────────────────
// NEXT MATCH module — full module slice
// Headlining prediction with deeper stats & lineup hints
// ─────────────────────────────────────────────
window.NextMatchModule = function NextMatchModule() {
  const [tab, setTab] = useStateNM("prob");

  return (
    <div style={{ width: "100%", height: "100%", background: "var(--ink)", color: "var(--cream)", padding: 48, overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 50% at 80% 0%, rgba(168,224,99,0.10), transparent 60%)" }} />

      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div className="eyebrow gold" style={{ marginBottom: 12 }}>SECTION 02 · NEXT MATCH</div>
          <div className="display" style={{ fontSize: 80, lineHeight: 0.9 }}>
            Tonight's<br/><em style={{ color: "var(--green)" }}>call.</em>
          </div>
        </div>
        <div className="mono muted" style={{ fontSize: 12, textAlign: "right", letterSpacing: "0.18em" }}>
          MATCHDAY 03<br/>GROUP D · MATCH 14<br/>09:00 PM ET · ATL
        </div>
      </div>

      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 28 }}>
        {/* Main panel */}
        <div className="card" style={{ background: "var(--soft)", borderColor: "var(--line-strong)", padding: 0, overflow: "hidden" }}>
          {/* Hero strip with two team photos */}
          <div style={{ position: "relative", height: 240, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
            <PhotoPlaceholder caption="[BRA · #10 · attack]" noCaption className="no-caption" style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,156,59,0.4) 0%, transparent 60%)" }} />
            </PhotoPlaceholder>
            <PhotoPlaceholder caption="[ARG · #10 · attack]" noCaption className="no-caption" style={{ position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(225deg, rgba(117,170,219,0.4) 0%, transparent 60%)" }} />
            </PhotoPlaceholder>

            {/* Center divider with score */}
            <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--ink)", padding: "0 32px", borderLeft: "1px solid var(--line)", borderRight: "1px solid var(--line)" }}>
              <span className="eyebrow gold" style={{ marginBottom: 6 }}>EXPECTED</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span className="bignum green" style={{ fontSize: 56 }}>2</span>
                <span className="display" style={{ fontSize: 28, fontStyle: "italic", color: "var(--muted)" }}>—</span>
                <span className="bignum" style={{ fontSize: 56, color: "var(--cream)" }}>1</span>
              </div>
              <span className="mono muted" style={{ fontSize: 10, marginTop: 6, letterSpacing: "0.18em" }}>±0.6 GOALS · 64% CONF.</span>
            </div>

            {/* Team labels */}
            <div style={{ position: "absolute", left: 24, bottom: 16, display: "flex", alignItems: "center", gap: 12, zIndex: 3 }}>
              <Flag colors={TEAMS.BRA.colors} style={{ width: 42, height: 30 }} />
              <div>
                <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 24 }}>BRAZIL</div>
                <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.16em" }}>HOME · 4-3-3 · WIN 58%</div>
              </div>
            </div>
            <div style={{ position: "absolute", right: 24, bottom: 16, display: "flex", alignItems: "center", gap: 12, zIndex: 3 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 24 }}>ARGENTINA</div>
                <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.16em" }}>AWAY · 4-4-2 · WIN 28%</div>
              </div>
              <Flag colors={TEAMS.ARG.colors} style={{ width: 42, height: 30 }} />
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--line)", padding: "0 28px" }}>
            {[
              ["prob", "Probability"],
              ["form", "Recent Form"],
              ["h2h", "Head-to-Head"],
              ["narr", "Narrative"],
            ].map(([k, l]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                style={{
                  background: "transparent",
                  border: 0,
                  padding: "16px 0",
                  marginRight: 32,
                  cursor: "pointer",
                  fontFamily: "var(--f-condensed)",
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  fontSize: 12,
                  color: tab === k ? "var(--green)" : "var(--cream)",
                  borderBottom: tab === k ? "2px solid var(--green)" : "2px solid transparent",
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ padding: 28, minHeight: 200 }}>
            {tab === "prob" && <ProbabilityView />}
            {tab === "form" && <FormView />}
            {tab === "h2h" && <H2HView />}
            {tab === "narr" && <NarrativeView />}
          </div>
        </div>

        {/* Side rail — editor commentary + cta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card-paper" style={{ padding: 24, position: "relative" }}>
            <div className="eyebrow" style={{ color: "var(--green-deep)", marginBottom: 12 }}>FROM THE EDITORS</div>
            <div className="display" style={{ fontSize: 28, color: "var(--ink)", marginBottom: 14 }}>
              "The press<br/>decides this one."
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#2a2a2a", margin: 0 }}>
              Brazil's high line has been gold-standard for the past six fixtures. Argentina counters fast, but the first twenty minutes will tell us who's setting the tempo. We've called Brazil — but it's a closer game than the headline suggests.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#2a2a2a" }} />
              <div>
                <div className="label" style={{ fontSize: 11, color: "var(--ink)" }}>M. RIBEIRO · LEAD ANALYST</div>
                <div className="mono" style={{ fontSize: 10, color: "#666" }}>UPDATED 18 MIN AGO</div>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 20, background: "var(--green)", color: "var(--ink)", border: 0 }}>
            <div className="eyebrow" style={{ color: "var(--ink)", opacity: 0.7, marginBottom: 8 }}>CAST YOUR CALL</div>
            <div className="display" style={{ fontSize: 26, lineHeight: 1, color: "var(--ink)" }}>Outsmart the model.</div>
            <p style={{ fontSize: 13, marginTop: 10, color: "var(--ink)", opacity: 0.85, lineHeight: 1.5 }}>
              Predict the exact score before kick-off. Climb the matchday leaderboard.
            </p>
            <button className="btn" style={{ marginTop: 14, background: "var(--ink)", color: "var(--green)" }}>Predict Now →</button>
          </div>

          <div className="card" style={{ padding: 18, background: "var(--surface)" }}>
            <div className="eyebrow muted" style={{ marginBottom: 10 }}>MODEL DETAILS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Bit label="Elo Δ" v="+47" pos />
              <Bit label="xG home" v="1.94" />
              <Bit label="xG away" v="1.12" />
              <Bit label="Rest days" v="6 vs 4" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function Bit({ label, v, pos }) {
  return (
    <div>
      <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.18em", marginBottom: 2 }}>{label.toUpperCase()}</div>
      <div className="label" style={{ fontSize: 16, color: pos ? "var(--green)" : "var(--cream)" }}>{v}</div>
    </div>
  );
}

function ProbabilityView() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div className="mono muted" style={{ fontSize: 11, marginBottom: 8, letterSpacing: "0.16em" }}>WIN PROBABILITY</div>
        <div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden", background: "var(--surface)" }}>
          <div style={{ width: "58%", background: "linear-gradient(90deg, var(--green), #c8f08a)" }} />
          <div style={{ width: "14%", background: "var(--surface-2)" }} />
          <div style={{ width: "28%", background: "linear-gradient(90deg, #e8a060, var(--gold))" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
          <span className="mono" style={{ fontSize: 12, color: "var(--green)" }}>BRA · 58%</span>
          <span className="mono muted" style={{ fontSize: 12 }}>DRAW · 14%</span>
          <span className="mono gold" style={{ fontSize: 12 }}>ARG · 28%</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Both teams score", v: 68 },
          { label: "Over 2.5 goals", v: 61 },
          { label: "Clean sheet · BRA", v: 22 },
          { label: "First-half goal", v: 79 },
        ].map((m) => (
          <div key={m.label} style={{ padding: 14, border: "1px solid var(--line)" }}>
            <div className="label" style={{ fontSize: 18, color: "var(--gold)" }}>{m.v}%</div>
            <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.14em", marginTop: 6, lineHeight: 1.4 }}>{m.label.toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormView() {
  const rows = [
    { team: "BRA", form: ["W", "W", "D", "W", "W"], goals: "11-3" },
    { team: "ARG", form: ["W", "L", "W", "W", "D"], goals: "8-5" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {rows.map((r) => (
        <div key={r.team} style={{ display: "grid", gridTemplateColumns: "60px 1fr 90px", gap: 20, alignItems: "center" }}>
          <div className="label" style={{ fontSize: 16 }}>{r.team}</div>
          <div style={{ display: "flex", gap: 6 }}>
            {r.form.map((f, i) => (
              <span key={i} style={{
                width: 32, height: 32,
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--f-condensed)", fontWeight: 900,
                background: f === "W" ? "var(--green)" : f === "L" ? "rgba(255,68,68,0.2)" : "var(--surface-2)",
                color: f === "W" ? "var(--ink)" : f === "L" ? "var(--red)" : "var(--cream)",
              }}>{f}</span>
            ))}
          </div>
          <div className="mono" style={{ fontSize: 13, textAlign: "right" }}>{r.goals}</div>
        </div>
      ))}
    </div>
  );
}

function H2HView() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, alignItems: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div className="bignum green" style={{ fontSize: 64 }}>43</div>
        <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.18em" }}>BRA WINS</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="bignum" style={{ fontSize: 64, color: "var(--cream)" }}>26</div>
        <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.18em" }}>DRAWS</div>
      </div>
      <div style={{ textAlign: "center" }}>
        <div className="bignum gold" style={{ fontSize: 64 }}>41</div>
        <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.18em" }}>ARG WINS</div>
      </div>
      <div style={{ gridColumn: "1 / 4", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
        <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.18em" }}>LAST MEETING · 2024 COPA AMÉRICA FINAL</div>
        <div className="display" style={{ fontSize: 24, marginTop: 6 }}>BRA 1 — 0 ARG <span style={{ color: "var(--muted)", fontStyle: "italic" }}>· 87' Vinícius</span></div>
      </div>
    </div>
  );
}

function NarrativeView() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {[
        { t: "Vinícius back from suspension — Brazil's left flank gets its teeth back.", a: "Selection" },
        { t: "Argentina's midfield averaged 23 km on Tuesday. Watch fatigue after 60'.", a: "Conditioning" },
        { t: "Referee tonight has called 4.8 fouls/game in fixtures involving these two.", a: "Officiating" },
      ].map((n, i) => (
        <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < 2 ? "1px solid var(--line)" : "none" }}>
          <div className="display" style={{ fontSize: 32, fontStyle: "italic", color: "var(--gold)", lineHeight: 1, minWidth: 30 }}>{i+1}</div>
          <div>
            <div style={{ fontSize: 14, lineHeight: 1.5 }}>{n.t}</div>
            <div className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "var(--green)", marginTop: 4 }}>{n.a.toUpperCase()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
