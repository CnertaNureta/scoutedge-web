/* global React, Flag, TEAMS, PhotoPlaceholder */

// ─────────────────────────────────────────────
// TOP CONTENDERS module
// Editorial ranking with one featured contender + grid
// ─────────────────────────────────────────────
window.TopContendersModule = function TopContendersModule() {
  const contenders = [
    { team: TEAMS.BRA, rank: 1, elo: 2147, trend: "+12", form: ["W","W","D","W","W"], title: "Samba reborn", note: "Vinícius leads a press-heavy attack that has outscored every CONMEBOL side this cycle." },
    { team: TEAMS.ARG, rank: 2, elo: 2118, trend: "+8",  form: ["W","L","W","W","D"], title: "Defending champs" },
    { team: TEAMS.FRA, rank: 3, elo: 2094, trend: "—",   form: ["W","W","W","D","W"], title: "Mbappé's machine" },
    { team: TEAMS.ENG, rank: 4, elo: 2061, trend: "+3",  form: ["D","W","W","W","L"], title: "Finally clinical" },
    { team: TEAMS.ESP, rank: 5, elo: 2042, trend: "-1",  form: ["W","D","W","L","W"], title: "Tiki returns" },
    { team: TEAMS.GER, rank: 6, elo: 2018, trend: "-2",  form: ["L","W","D","W","W"], title: "Rebuilt" },
  ];
  const hero = contenders[0];

  return (
    <div style={{ width: "100%", height: "100%", background: "var(--ink)", color: "var(--cream)", padding: 48, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0 }} className="pitch-grid" />

      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div className="eyebrow gold" style={{ marginBottom: 12 }}>SECTION 03 · POWER RANK</div>
          <div className="display" style={{ fontSize: 80, lineHeight: 0.9 }}>
            The <em style={{ color: "var(--green)" }}>top</em><br/>contenders.
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <span className="mono muted" style={{ fontSize: 11, letterSpacing: "0.18em" }}>UPDATED 12 MAY · 06:00 GMT</span>
          <button className="btn btn-ghost">All 32 →</button>
        </div>
      </div>

      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24 }}>
        {/* FEATURED contender */}
        <div className="card" style={{ background: "var(--soft)", borderColor: "var(--line-strong)", padding: 0, overflow: "hidden", position: "relative" }}>
          <PhotoPlaceholder caption="[BRA · team photo · anthem]" noCaption className="no-caption" style={{ height: 280, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: `
              linear-gradient(180deg, transparent 0%, transparent 40%, rgba(15,26,19,0.95) 100%),
              radial-gradient(50% 60% at 50% 40%, rgba(0,156,59,0.25), transparent 70%)
            ` }} />
            <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8 }}>
              <span className="strike label" style={{ fontSize: 10 }}>#1 RANKED</span>
              <span style={{ padding: "4px 10px", background: "var(--gold)", color: "var(--ink)" }} className="label">★ FAVOURITE</span>
            </div>
            <div style={{ position: "absolute", top: 24, right: 24, textAlign: "right" }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", color: "var(--cream)", opacity: 0.6 }}>ELO RATING</div>
              <div className="bignum gold" style={{ fontSize: 56 }}>{hero.elo}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--green)" }}>{hero.trend} VS LAST WEEK</div>
            </div>
            {/* Big rank numeral */}
            <div className="display" style={{ position: "absolute", left: 24, bottom: 80, fontSize: 200, fontStyle: "italic", color: "rgba(168,224,99,0.20)", lineHeight: 0.85 }}>01</div>
          </PhotoPlaceholder>

          <div style={{ padding: 28, paddingTop: 0, marginTop: -50, position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <Flag colors={hero.team.colors} style={{ width: 48, height: 34 }} />
              <div>
                <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 30 }}>{hero.team.name.toUpperCase()}</div>
                <div className="mono" style={{ fontSize: 11, letterSpacing: "0.18em", color: "var(--green)" }}>CONMEBOL · GROUP D</div>
              </div>
            </div>

            <div className="display" style={{ fontSize: 42, marginBottom: 12, lineHeight: 1 }}>
              <em style={{ color: "var(--gold)" }}>{hero.title}.</em>
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.85, maxWidth: 560 }}>
              {hero.note}
            </p>

            <div style={{ display: "flex", gap: 28, marginTop: 22, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
              <FormPills form={hero.form} />
              <Mini label="Goals/90" v="2.4" />
              <Mini label="xG/90" v="2.1" />
              <Mini label="Possession" v="61%" />
              <Mini label="Clean sheets" v="7" />
            </div>
          </div>
        </div>

        {/* RIGHT — ranking list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {contenders.slice(1).map((c, i) => (
            <div key={c.team.code} className="card" style={{ padding: "14px 18px", display: "grid", gridTemplateColumns: "40px 36px 1fr auto auto", alignItems: "center", gap: 14, background: "var(--surface)" }}>
              <div className="display" style={{ fontSize: 32, fontStyle: "italic", color: "var(--gold)", lineHeight: 1 }}>
                0{c.rank}
              </div>
              <Flag colors={c.team.colors} style={{ width: 32, height: 22 }} />
              <div>
                <div className="label" style={{ fontSize: 14 }}>{c.team.name.toUpperCase()}</div>
                <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.16em", marginTop: 2 }}>{c.title.toUpperCase()}</div>
              </div>
              <FormPills form={c.form} small />
              <div style={{ textAlign: "right" }}>
                <div className="label" style={{ fontSize: 14 }}>{c.elo}</div>
                <div className="mono" style={{ fontSize: 10, color: c.trend.startsWith("+") ? "var(--green)" : c.trend.startsWith("-") ? "var(--red)" : "var(--muted)" }}>{c.trend}</div>
              </div>
            </div>
          ))}

          <div className="card" style={{ padding: 16, background: "transparent", borderStyle: "dashed", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 4 }}>
            <span className="mono muted" style={{ fontSize: 11, letterSpacing: "0.18em" }}>26 MORE FEDERATIONS</span>
            <span className="label gold" style={{ fontSize: 11 }}>VIEW ALL →</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function FormPills({ form, small }) {
  const sz = small ? 16 : 22;
  return (
    <div style={{ display: "flex", gap: 3 }}>
      {form.map((f, i) => (
        <span key={i} style={{
          width: sz, height: sz,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "var(--f-condensed)", fontWeight: 900,
          fontSize: small ? 9 : 11,
          background: f === "W" ? "var(--green)" : f === "L" ? "rgba(255,68,68,0.2)" : "var(--surface-2)",
          color: f === "W" ? "var(--ink)" : f === "L" ? "var(--red)" : "var(--cream)",
        }}>{f}</span>
      ))}
    </div>
  );
}

function Mini({ label, v }) {
  return (
    <div>
      <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.16em", marginBottom: 2 }}>{label.toUpperCase()}</div>
      <div className="label" style={{ fontSize: 16 }}>{v}</div>
    </div>
  );
}
