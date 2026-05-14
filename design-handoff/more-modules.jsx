/* global React, Flag, TEAMS, PhotoPlaceholder */

// ─────────────────────────────────────────────
// Additional Featured Modules
// • Daily Briefing  • Schedule Timeline
// • Compare Teams   • Group Standings
// • Leaderboard     • Countdown to Final
// • Newsletter CTA
// ─────────────────────────────────────────────

// ── DAILY BRIEFING ──────────────────────────
window.DailyBriefingModule = function DailyBriefingModule() {
  const stories = [
    { tag: "INJURY · BRA", h: "Vinícius cleared for tonight.", b: "Medical team signs off on the hamstring — minutes will be managed.", t: "2 min" },
    { tag: "TACTICS · ARG", h: "Scaloni hints at a back three.", b: "Bench leaks suggest a press-resistant midfield rotation for the second half.", t: "5 min" },
    { tag: "WEATHER · ATL", h: "Storm cell pushed to Wednesday.", b: "Kick-off dry, 22°C, 8 mph crosswind. Crossing teams benefit.", t: "1 min" },
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--ink)", color: "var(--cream)", padding: 48, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div className="eyebrow gold" style={{ marginBottom: 12 }}>SECTION 04 · DAILY BRIEFING</div>
          <div className="display" style={{ fontSize: 72, lineHeight: 0.9 }}>
            What you missed,<br/><em style={{ color: "var(--green)" }}>before coffee.</em>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mono muted" style={{ fontSize: 11, letterSpacing: "0.18em" }}>EDITION · 187</div>
          <div className="mono muted" style={{ fontSize: 11, letterSpacing: "0.18em" }}>06:00 GMT · 12 MAY 2026</div>
          <button className="btn btn-ghost" style={{ marginTop: 12 }}>Subscribe →</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 18 }}>
        {/* Lead story */}
        <div className="card" style={{ background: "var(--soft)", borderColor: "var(--line-strong)", padding: 0, overflow: "hidden", position: "relative" }}>
          <PhotoPlaceholder caption="[locker room · pre-match]" noCaption className="no-caption" style={{ height: 340, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(15,26,19,0.95) 100%)" }} />
            <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8 }}>
              <span className="strike label" style={{ fontSize: 9 }}>LEAD · TODAY</span>
            </div>
            <div className="display" style={{ position: "absolute", right: 20, top: 14, fontSize: 100, fontStyle: "italic", color: "rgba(243,201,105,0.2)", lineHeight: 1 }}>01</div>
          </PhotoPlaceholder>
          <div style={{ padding: 26 }}>
            <div className="eyebrow" style={{ color: "var(--green)", marginBottom: 12 }}>EDITORIAL · GROUP D PREVIEW</div>
            <div className="display" style={{ fontSize: 38, lineHeight: 1, marginBottom: 14 }}>
              <em style={{ color: "var(--gold)" }}>Brazil's</em> reckoning with the press.
            </div>
            <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0, opacity: 0.85 }}>
              Eight months ago, Brazil were a fourth-place embarrassment. Tonight they walk in as favourites against the reigning champions. The press did it — not the names you'd guess.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--surface-2)" }} />
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em" }}>BY M. RIBEIRO · 8 MIN READ</div>
              <div style={{ flex: 1 }} />
              <span className="label gold" style={{ fontSize: 11 }}>READ →</span>
            </div>
          </div>
        </div>

        {/* Three quick stories */}
        <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {stories.map((s, i) => (
            <div key={i} className="card" style={{ padding: 22, display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 18, alignItems: "center", background: "var(--surface)" }}>
              <div className="display" style={{ fontSize: 44, fontStyle: "italic", color: "var(--gold)", lineHeight: 1 }}>0{i+2}</div>
              <div>
                <div className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--green)", marginBottom: 6 }}>{s.tag}</div>
                <div className="display" style={{ fontSize: 22, lineHeight: 1.05, marginBottom: 6 }}>{s.h}</div>
                <p style={{ fontSize: 13, lineHeight: 1.5, margin: 0, opacity: 0.75 }}>{s.b}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.16em" }}>{s.t.toUpperCase()}</div>
                <span className="label gold" style={{ fontSize: 11, marginTop: 8, display: "inline-block" }}>READ →</span>
              </div>
            </div>
          ))}
          <div className="card" style={{ padding: 16, background: "transparent", borderStyle: "dashed", display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
            <span className="mono muted" style={{ fontSize: 11, letterSpacing: "0.18em" }}>14 MORE BRIEFINGS THIS WEEK</span>
            <span className="label gold" style={{ fontSize: 11 }}>ARCHIVE →</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── SCHEDULE TIMELINE ──────────────────────
window.ScheduleModule = function ScheduleModule() {
  const days = [
    { day: "MON", date: "11", count: 0 },
    { day: "TUE", date: "12", count: 4, today: true },
    { day: "WED", date: "13", count: 3 },
    { day: "THU", date: "14", count: 4 },
    { day: "FRI", date: "15", count: 2 },
    { day: "SAT", date: "16", count: 4 },
    { day: "SUN", date: "17", count: 3 },
  ];
  const fixtures = [
    { time: "16:00", a: TEAMS.ENG, b: TEAMS.NED, group: "B", note: "Wembley · Group decider" },
    { time: "18:30", a: TEAMS.FRA, b: TEAMS.JPN, group: "C", note: "Mbappé fitness watch" },
    { time: "21:00", a: TEAMS.BRA, b: TEAMS.ARG, group: "D", note: "★ Tonight's pick", featured: true },
    { time: "23:30", a: TEAMS.USA, b: TEAMS.POR, group: "F", note: "Cristiano milestone" },
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--ink)", color: "var(--cream)", padding: 48, position: "relative", overflow: "hidden" }}>
      <div className="pitch-grid" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />

      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <div className="eyebrow gold" style={{ marginBottom: 12 }}>SECTION 05 · SCHEDULE</div>
          <div className="display" style={{ fontSize: 72, lineHeight: 0.9 }}>
            The week<br/><em style={{ color: "var(--gold)" }}>in fixtures.</em>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span className="mono muted" style={{ fontSize: 11, letterSpacing: "0.18em" }}>ALL TIMES · LOCAL (ET)</span>
          <button className="btn btn-ghost">Full Calendar →</button>
        </div>
      </div>

      {/* Day strip */}
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 24 }}>
        {days.map((d) => (
          <div key={d.date} style={{
            padding: 16, border: "1px solid var(--line)",
            background: d.today ? "var(--green)" : "var(--surface)",
            color: d.today ? "var(--ink)" : "var(--cream)",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.2em", opacity: d.today ? 0.7 : 0.5 }}>{d.day}</div>
            <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 32, lineHeight: 1 }}>{d.date}</div>
            <div className="mono" style={{ fontSize: 10, opacity: d.today ? 0.7 : 0.55 }}>
              {d.count === 0 ? "REST DAY" : `${d.count} FIXTURE${d.count > 1 ? "S" : ""}`}
            </div>
          </div>
        ))}
      </div>

      {/* Today's fixtures */}
      <div style={{ position: "relative" }}>
        <div className="eyebrow green" style={{ marginBottom: 16 }}>TODAY · TUESDAY 12 MAY · 4 FIXTURES</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {fixtures.map((f, i) => (
            <div key={i} style={{
              padding: "16px 24px",
              background: f.featured ? "rgba(168,224,99,0.08)" : "var(--surface)",
              border: f.featured ? "1px solid var(--green)" : "1px solid var(--line)",
              display: "grid", gridTemplateColumns: "100px 1fr 1fr 40px 1fr 1fr 1fr 100px", alignItems: "center", gap: 14,
            }}>
              <div className="label" style={{ fontSize: 14, color: f.featured ? "var(--green)" : "var(--cream)" }}>{f.time}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end" }}>
                <span className="label" style={{ fontSize: 13 }}>{f.a.name.toUpperCase()}</span>
                <Flag colors={f.a.colors} style={{ width: 26, height: 18 }} />
              </div>
              <div></div>
              <div className="display" style={{ fontSize: 18, fontStyle: "italic", color: "var(--muted)", textAlign: "center" }}>vs</div>
              <div></div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Flag colors={f.b.colors} style={{ width: 26, height: 18 }} />
                <span className="label" style={{ fontSize: 13 }}>{f.b.name.toUpperCase()}</span>
              </div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", color: f.featured ? "var(--gold)" : "rgba(245,239,228,0.6)" }}>GROUP {f.group} · {f.note.toUpperCase()}</div>
              <span className="label gold" style={{ fontSize: 11, textAlign: "right" }}>PREDICT →</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── COMPARE TEAMS ─────────────────────────
window.CompareModule = function CompareModule() {
  const stats = [
    { l: "Elo Rating",      a: 2147, b: 2118, fmt: (n) => n },
    { l: "Goals / 90",      a: 2.4,  b: 2.1,  fmt: (n) => n.toFixed(1) },
    { l: "xG / 90",         a: 2.1,  b: 1.9,  fmt: (n) => n.toFixed(1) },
    { l: "Possession %",    a: 61,   b: 54,   fmt: (n) => `${n}%` },
    { l: "Press Intensity", a: 18.2, b: 14.6, fmt: (n) => n.toFixed(1) },
    { l: "Pass Accuracy %", a: 87,   b: 91,   fmt: (n) => `${n}%` },
    { l: "Clean Sheets · 10", a: 7,  b: 5,    fmt: (n) => n },
    { l: "Aerial Win %",    a: 51,   b: 58,   fmt: (n) => `${n}%` },
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--ink)", color: "var(--cream)", padding: 48, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <div className="eyebrow gold" style={{ marginBottom: 12 }}>SECTION 06 · HEAD-TO-HEAD</div>
          <div className="display" style={{ fontSize: 72, lineHeight: 0.9 }}>
            Match them<br/><em style={{ color: "var(--green)" }}>side by side.</em>
          </div>
        </div>
        <button className="btn btn-ghost">Compare any two →</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 24 }}>
        {/* BRA panel */}
        <div style={{ position: "relative", overflow: "hidden", padding: 28, background: "linear-gradient(135deg, rgba(0,156,59,0.18) 0%, var(--soft) 70%)", borderLeft: "3px solid var(--green)" }}>
          <PhotoPlaceholder caption="[BRA · team]" noCaption className="no-caption" style={{ position: "absolute", inset: 0, opacity: 0.18 }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
              <Flag colors={TEAMS.BRA.colors} style={{ width: 44, height: 30 }} />
              <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 28 }}>BRAZIL</div>
              <span className="strike label" style={{ fontSize: 9, marginLeft: "auto" }}>#1 RANKED</span>
            </div>
            <div className="display" style={{ fontSize: 36, lineHeight: 1, fontStyle: "italic", color: "var(--gold)" }}>The press.</div>
            <p style={{ fontSize: 13, marginTop: 10, opacity: 0.8, maxWidth: 400 }}>Outscored every CONMEBOL side this cycle. Vinícius cleared, Endrick rested.</p>
          </div>
        </div>

        {/* ARG panel */}
        <div style={{ position: "relative", overflow: "hidden", padding: 28, background: "linear-gradient(225deg, rgba(117,170,219,0.20) 0%, var(--soft) 70%)", borderRight: "3px solid var(--gold)", textAlign: "right" }}>
          <PhotoPlaceholder caption="[ARG · team]" noCaption className="no-caption" style={{ position: "absolute", inset: 0, opacity: 0.18 }} />
          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, flexDirection: "row-reverse" }}>
              <Flag colors={TEAMS.ARG.colors} style={{ width: 44, height: 30 }} />
              <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 28 }}>ARGENTINA</div>
              <span style={{ padding: "4px 10px", background: "var(--gold)", color: "var(--ink)" }} className="label">★ CHAMPIONS</span>
            </div>
            <div className="display" style={{ fontSize: 36, lineHeight: 1, fontStyle: "italic", color: "var(--gold)" }}>The counter.</div>
            <p style={{ fontSize: 13, marginTop: 10, opacity: 0.8, marginLeft: "auto", maxWidth: 400 }}>Reigning champions. Messi rested. Scaloni hints at a back three for tonight.</p>
          </div>
        </div>
      </div>

      {/* Stat bars */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {stats.map((s) => {
          const total = s.a + s.b;
          const pa = (s.a / total) * 100;
          const pb = 100 - pa;
          const aWins = s.a > s.b;
          return (
            <React.Fragment key={s.l}>
              <div style={{ padding: "12px 20px", background: "var(--surface)", display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 14, borderLeft: aWins ? "2px solid var(--green)" : "2px solid transparent" }}>
                <div style={{ flex: 1, height: 4, background: "var(--surface-2)", position: "relative" }}>
                  <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${pa}%`, background: aWins ? "var(--green)" : "var(--muted)" }} />
                </div>
                <div className="label" style={{ fontSize: 18, color: aWins ? "var(--green)" : "var(--cream)", minWidth: 80, textAlign: "right" }}>{s.fmt(s.a)}</div>
                <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.16em", minWidth: 130, textAlign: "right" }}>{s.l.toUpperCase()}</div>
              </div>
              <div style={{ padding: "12px 20px", background: "var(--surface)", display: "flex", alignItems: "center", gap: 14, borderRight: !aWins ? "2px solid var(--gold)" : "2px solid transparent" }}>
                <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.16em", minWidth: 130 }}>{s.l.toUpperCase()}</div>
                <div className="label" style={{ fontSize: 18, color: !aWins ? "var(--gold)" : "var(--cream)", minWidth: 80 }}>{s.fmt(s.b)}</div>
                <div style={{ flex: 1, height: 4, background: "var(--surface-2)", position: "relative" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pb}%`, background: !aWins ? "var(--gold)" : "var(--muted)" }} />
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ── GROUP STANDINGS ────────────────────────
window.GroupStandingsModule = function GroupStandingsModule() {
  const groups = [
    { id: "B", teams: [
      { t: TEAMS.ENG, p: 6, w: 2, d: 0, l: 0, gd: "+5", pts: 6 },
      { t: TEAMS.NED, p: 6, w: 1, d: 1, l: 0, gd: "+2", pts: 4 },
      { t: TEAMS.USA, p: 6, w: 0, d: 1, l: 1, gd: "-1", pts: 1 },
      { t: TEAMS.JPN, p: 6, w: 0, d: 0, l: 2, gd: "-6", pts: 0 },
    ]},
    { id: "D", teams: [
      { t: TEAMS.BRA, p: 6, w: 2, d: 0, l: 0, gd: "+7", pts: 6, featured: true },
      { t: TEAMS.ARG, p: 6, w: 1, d: 1, l: 0, gd: "+3", pts: 4, featured: true },
      { t: TEAMS.GER, p: 6, w: 0, d: 1, l: 1, gd: "-2", pts: 1 },
      { t: TEAMS.ESP, p: 6, w: 0, d: 0, l: 2, gd: "-8", pts: 0 },
    ]},
  ];
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--ink)", color: "var(--cream)", padding: 48, position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <div className="eyebrow gold" style={{ marginBottom: 12 }}>SECTION 07 · GROUPS</div>
          <div className="display" style={{ fontSize: 72, lineHeight: 0.9 }}>
            Who's<br/><em style={{ color: "var(--gold)" }}>making it out.</em>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["A","B","C","D","E","F","G","H"].map((g) => (
            <span key={g} className="label" style={{ fontSize: 12, padding: "8px 12px", border: "1px solid var(--line)", background: ["B","D"].includes(g) ? "var(--surface)" : "transparent", color: ["B","D"].includes(g) ? "var(--green)" : "var(--cream)", opacity: ["B","D"].includes(g) ? 1 : 0.5, cursor: "pointer" }}>{g}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {groups.map((g) => (
          <div key={g.id} className="card" style={{ background: "var(--soft)", padding: 0, overflow: "hidden", borderColor: "var(--line-strong)" }}>
            <div style={{ padding: "18px 24px", background: g.id === "D" ? "var(--green)" : "var(--surface)", color: g.id === "D" ? "var(--ink)" : "var(--cream)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div className="display" style={{ fontSize: 38, fontStyle: "italic", lineHeight: 1 }}>{g.id}</div>
                <div>
                  <div className="label" style={{ fontSize: 14 }}>GROUP {g.id}</div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", opacity: 0.7 }}>MATCHDAY 2 OF 3</div>
                </div>
              </div>
              {g.id === "D" && <span className="label" style={{ fontSize: 10, padding: "4px 10px", background: "var(--ink)", color: "var(--green)" }}>★ TONIGHT</span>}
            </div>
            <div style={{ padding: "8px 0" }}>
              {g.teams.map((row, i) => (
                <div key={row.t.code} style={{
                  padding: "12px 24px",
                  display: "grid", gridTemplateColumns: "24px 32px 1fr 32px 32px 32px 48px 48px",
                  alignItems: "center", gap: 14,
                  borderTop: i === 2 ? "1px dashed rgba(168,224,99,0.3)" : "none",
                  background: row.featured ? "rgba(168,224,99,0.06)" : "transparent",
                }}>
                  <div className="display" style={{ fontSize: 20, fontStyle: "italic", color: i < 2 ? "var(--green)" : "var(--muted)" }}>{i+1}</div>
                  <Flag colors={row.t.colors} style={{ width: 26, height: 18 }} />
                  <div className="label" style={{ fontSize: 13 }}>{row.t.name.toUpperCase()}</div>
                  <div className="mono" style={{ fontSize: 12, textAlign: "center", opacity: 0.7 }}>{row.w}</div>
                  <div className="mono" style={{ fontSize: 12, textAlign: "center", opacity: 0.7 }}>{row.d}</div>
                  <div className="mono" style={{ fontSize: 12, textAlign: "center", opacity: 0.7 }}>{row.l}</div>
                  <div className="mono" style={{ fontSize: 12, textAlign: "center", color: row.gd.startsWith("+") ? "var(--green)" : row.gd.startsWith("-") ? "var(--red)" : "var(--cream)" }}>{row.gd}</div>
                  <div className="label gold" style={{ fontSize: 18, textAlign: "right" }}>{row.pts}</div>
                </div>
              ))}
              <div style={{ padding: "8px 24px", borderTop: "1px solid var(--line)", display: "grid", gridTemplateColumns: "24px 32px 1fr 32px 32px 32px 48px 48px", gap: 14 }}>
                <div></div><div></div><div></div>
                <div className="mono muted" style={{ fontSize: 9, textAlign: "center", letterSpacing: "0.16em" }}>W</div>
                <div className="mono muted" style={{ fontSize: 9, textAlign: "center", letterSpacing: "0.16em" }}>D</div>
                <div className="mono muted" style={{ fontSize: 9, textAlign: "center", letterSpacing: "0.16em" }}>L</div>
                <div className="mono muted" style={{ fontSize: 9, textAlign: "center", letterSpacing: "0.16em" }}>GD</div>
                <div className="mono muted" style={{ fontSize: 9, textAlign: "right", letterSpacing: "0.16em" }}>PTS</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, padding: 14, border: "1px dashed var(--line)", display: "flex", justifyContent: "center", gap: 8 }}>
        <span className="mono muted" style={{ fontSize: 11, letterSpacing: "0.18em" }}>6 MORE GROUPS</span>
        <span className="label gold" style={{ fontSize: 11 }}>VIEW ALL 8 →</span>
      </div>
    </div>
  );
};

// ── LEADERBOARD ─────────────────────────────
window.LeaderboardModule = function LeaderboardModule() {
  const top = [
    { name: "ElPibe10", country: TEAMS.ARG, points: 14820, streak: 9, accuracy: 81, badge: "★" },
    { name: "VARrational", country: TEAMS.ENG, points: 14260, streak: 5, accuracy: 78 },
    { name: "Tiki_Maker", country: TEAMS.ESP, points: 13990, streak: 3, accuracy: 75 },
  ];
  const you = { rank: 247, name: "You", points: 8420, streak: 2, accuracy: 64, change: "+38" };

  return (
    <div style={{ width: "100%", height: "100%", background: "var(--ink)", color: "var(--cream)", padding: 48, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(50% 40% at 50% 0%, rgba(243,201,105,0.10), transparent 60%)" }} />

      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 32 }}>
        <div>
          <div className="eyebrow gold" style={{ marginBottom: 12 }}>SECTION 08 · LEADERBOARD</div>
          <div className="display" style={{ fontSize: 72, lineHeight: 0.9 }}>
            Beat the<br/><em style={{ color: "var(--green)" }}>oracle.</em>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {["Today", "Week", "Tournament", "All-Time"].map((t, i) => (
            <span key={t} className="label" style={{ fontSize: 11, padding: "8px 14px", border: "1px solid var(--line)", background: i === 1 ? "var(--green)" : "transparent", color: i === 1 ? "var(--ink)" : "var(--cream)", cursor: "pointer" }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Podium */}
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1.2fr 1fr", gap: 12, alignItems: "end", marginBottom: 24 }}>
        {[1, 0, 2].map((idx) => {
          const p = top[idx];
          const r = idx + 1;
          const heights = { 1: 220, 2: 180, 3: 150 };
          return (
            <div key={p.name} className="card" style={{ background: r === 1 ? "var(--gold)" : "var(--surface)", color: r === 1 ? "var(--ink)" : "var(--cream)", padding: 24, height: heights[r], display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", border: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="display" style={{ fontSize: r === 1 ? 96 : 72, fontStyle: "italic", lineHeight: 0.85 }}>{r}</div>
                <Flag colors={p.country.colors} style={{ width: 30, height: 22 }} />
              </div>
              <div>
                <div className="label" style={{ fontSize: 16 }}>{p.name.toUpperCase()}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                  <div className="bignum" style={{ fontSize: r === 1 ? 36 : 28, color: r === 1 ? "var(--ink)" : "var(--gold)" }}>{p.points.toLocaleString()}</div>
                  <div className="mono" style={{ fontSize: 10, letterSpacing: "0.18em", opacity: 0.7 }}>PTS</div>
                </div>
                <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", opacity: 0.7 }}>🔥 {p.streak}</span>
                  <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", opacity: 0.7 }}>{p.accuracy}% ACC</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Your standing */}
      <div className="card" style={{ position: "relative", padding: "22px 28px", background: "rgba(168,224,99,0.06)", borderColor: "var(--green)", display: "grid", gridTemplateColumns: "auto 1fr auto auto auto auto", alignItems: "center", gap: 24 }}>
        <div className="display" style={{ fontSize: 44, fontStyle: "italic", color: "var(--gold)", lineHeight: 1 }}>#{you.rank}</div>
        <div>
          <div className="label" style={{ fontSize: 14, color: "var(--green)" }}>YOU · MATCHDAY 03</div>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.18em", marginTop: 4 }}>RANK CHANGE · {you.change} POSITIONS</div>
        </div>
        <Stat2 label="Points" v={you.points.toLocaleString()} />
        <Stat2 label="Streak" v={`${you.streak} 🔥`} />
        <Stat2 label="Accuracy" v={`${you.accuracy}%`} />
        <button className="btn btn-primary">Predict to climb →</button>
      </div>
    </div>
  );
};

function Stat2({ label, v }) {
  return (
    <div style={{ minWidth: 100 }}>
      <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.18em", marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div className="label" style={{ fontSize: 18 }}>{v}</div>
    </div>
  );
}

// ── COUNTDOWN ──────────────────────────────
window.CountdownModule = function CountdownModule() {
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--ink)", color: "var(--cream)", padding: 48, position: "relative", overflow: "hidden" }}>
      <PhotoPlaceholder caption="[empty stadium · night]" noCaption className="no-caption" style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(10,13,10,0.6), rgba(10,13,10,0.92))" }} />
      </PhotoPlaceholder>

      <div style={{ position: "relative" }}>
        <div className="eyebrow gold" style={{ marginBottom: 12 }}>SECTION 09 · COUNTDOWN</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div className="display" style={{ fontSize: 72, lineHeight: 0.9 }}>
            Until the<br/><em style={{ color: "var(--gold)" }}>final whistle.</em>
          </div>
          <div className="mono muted" style={{ fontSize: 11, letterSpacing: "0.18em", textAlign: "right" }}>
            WORLD CUP FINAL<br/>METLIFE STADIUM · 19 JULY 2026<br/>20:00 ET
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 32 }}>
          {[
            { v: "68", l: "Days" },
            { v: "14", l: "Hours" },
            { v: "32", l: "Minutes" },
            { v: "07", l: "Seconds" },
          ].map((b, i) => (
            <div key={b.l} style={{ position: "relative", padding: "28px 24px", background: i === 0 ? "var(--green)" : "rgba(15,26,19,0.7)", color: i === 0 ? "var(--ink)" : "var(--cream)", border: i === 0 ? "0" : "1px solid var(--line-strong)", backdropFilter: "blur(10px)" }}>
              <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 110, lineHeight: 0.85, letterSpacing: "-0.02em" }}>{b.v}</div>
              <div className="mono" style={{ fontSize: 10, marginTop: 12, letterSpacing: "0.22em", opacity: i === 0 ? 0.7 : 0.55 }}>{b.l.toUpperCase()}</div>
              <div className="display" style={{ position: "absolute", bottom: 14, right: 16, fontSize: 38, fontStyle: "italic", color: i === 0 ? "rgba(10,13,10,0.15)" : "rgba(243,201,105,0.15)", lineHeight: 1 }}>0{i+1}</div>
            </div>
          ))}
        </div>

        {/* Next match countdown */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", background: "rgba(168,224,99,0.08)", border: "1px dashed var(--green)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span className="tick" />
            <div>
              <div className="label" style={{ fontSize: 12, color: "var(--green)" }}>NEXT KICK-OFF · TONIGHT</div>
              <div className="display" style={{ fontSize: 22, fontStyle: "italic", marginTop: 4 }}>BRA vs ARG · in 4h 12m</div>
            </div>
          </div>
          <button className="btn btn-ghost">Set Reminder →</button>
        </div>
      </div>
    </div>
  );
};

// ── NEWSLETTER CTA ─────────────────────────
window.NewsletterModule = function NewsletterModule() {
  return (
    <div style={{ width: "100%", height: "100%", background: "var(--green)", color: "var(--ink)", padding: 0, position: "relative", overflow: "hidden", display: "grid", gridTemplateColumns: "1fr 1fr" }}>
      {/* Left — type */}
      <div style={{ padding: 56, display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
        <div className="eyebrow" style={{ color: "var(--ink)", opacity: 0.65, marginBottom: 16 }}>SECTION 10 · DAILY BRIEFING</div>
        <div className="display" style={{ fontSize: 88, lineHeight: 0.9, color: "var(--ink)" }}>
          Your inbox,<br/><em>every kick-off.</em>
        </div>
        <p style={{ fontSize: 17, lineHeight: 1.55, marginTop: 24, maxWidth: 480, color: "var(--ink)", opacity: 0.85 }}>
          One email each morning. Tonight's matches, our model's calls, the editor's pick of the day, and one beautiful story you missed. <em>No spam. Unsubscribe in one click.</em>
        </p>

        <div style={{ display: "flex", gap: 0, marginTop: 32, maxWidth: 480, border: "2px solid var(--ink)" }}>
          <input
            type="email"
            placeholder="you@inbox.com"
            style={{
              flex: 1, padding: "16px 18px", border: 0, background: "transparent",
              fontFamily: "var(--f-body)", fontSize: 15, color: "var(--ink)", outline: "none",
            }}
            defaultValue="hello@kickoracle.com"
          />
          <button className="btn" style={{ background: "var(--ink)", color: "var(--green)", padding: "16px 28px" }}>Subscribe →</button>
        </div>

        <div style={{ display: "flex", gap: 32, marginTop: 28, color: "var(--ink)", opacity: 0.7 }}>
          <Mini2 v="187" l="Editions" />
          <Mini2 v="42K" l="Readers" />
          <Mini2 v="4.8" l="Avg rating" />
        </div>

        <div className="display" style={{ position: "absolute", left: -60, bottom: -100, fontSize: 360, fontStyle: "italic", color: "rgba(10,13,10,0.05)", lineHeight: 1 }}>26</div>
      </div>

      {/* Right — sample issue */}
      <div style={{ padding: 56, background: "var(--ink)", color: "var(--cream)", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative" }}>
        <PhotoPlaceholder caption="[issue preview]" noCaption className="no-caption" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />

        <div style={{ position: "relative", maxWidth: 380, padding: 28, background: "rgba(15,20,15,0.85)", backdropFilter: "blur(12px)", border: "1px solid var(--line-strong)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <span className="strike label" style={{ fontSize: 9 }}>ISSUE 187</span>
            <span className="mono muted" style={{ fontSize: 9, letterSpacing: "0.16em" }}>06:00 GMT · 12 MAY</span>
          </div>
          <div className="display" style={{ fontSize: 28, lineHeight: 1.05, marginBottom: 16 }}>
            <em style={{ color: "var(--gold)" }}>Brazil's</em> reckoning with the press.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { tag: "TONIGHT", t: "BRA vs ARG · Our call: 2-1" },
              { tag: "INJURY", t: "Vinícius cleared, minutes managed" },
              { tag: "NUMBERS", t: "Why ARG midfield fades after 60'" },
              { tag: "FROM ED.", t: "The press did it — not the names" },
            ].map((r) => (
              <div key={r.t} style={{ display: "flex", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: "1px dashed rgba(245,239,228,0.12)" }}>
                <span className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "var(--green)", minWidth: 60 }}>{r.tag}</span>
                <span style={{ fontSize: 12, opacity: 0.9 }}>{r.t}</span>
              </div>
            ))}
          </div>
          <div className="mono muted" style={{ fontSize: 9, marginTop: 14, letterSpacing: "0.18em", textAlign: "right" }}>4 MIN READ ↗</div>
        </div>
      </div>
    </div>
  );
};

function Mini2({ v, l }) {
  return (
    <div>
      <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 24, lineHeight: 1 }}>{v}</div>
      <div className="mono" style={{ fontSize: 9, marginTop: 4, letterSpacing: "0.18em" }}>{l.toUpperCase()}</div>
    </div>
  );
}
