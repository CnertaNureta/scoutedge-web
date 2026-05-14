/* global React */
const { useState: useStateTD, useMemo: useMemoTD } = React;

// ─────────────────────────────────────────────
// TEAM DETAIL PAGE — magazine cover format
// Sections: Hero · Fixtures · Squad · Stats · Prediction
//           · Form trend · H2H · Narrative · Fan vote · Trophy case
// Props: { team, layout: "magazine" | "dashboard" }
// ─────────────────────────────────────────────

window.TeamDetail = function TeamDetail({ team, layout = "magazine" }) {
  if (layout === "dashboard") return <DashboardLayout team={team} />;
  return <MagazineLayout team={team} />;
};

// Shared bits
const FlagBar = ({ colors, h = 6 }) => (
  <div style={{ display: "flex", height: h, width: "100%" }}>
    {colors.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
  </div>
);

const FormDot = ({ r }) => {
  const map = { W: "var(--green)", D: "rgba(245,239,228,0.5)", L: "#c44" };
  return (
    <div style={{ width: 24, height: 24, borderRadius: "50%", background: map[r] || "#666", color: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 12 }}>{r}</div>
  );
};

const Sparkline = ({ values, primary }) => {
  const max = Math.max(...values), min = Math.min(...values);
  const w = 220, h = 56;
  const step = w / (values.length - 1);
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / (max - min || 1)) * h}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={points} fill="none" stroke={primary} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={i * step} cy={h - ((v - min) / (max - min || 1)) * h} r="3" fill={primary} />
      ))}
    </svg>
  );
};

// ───────── MAGAZINE LAYOUT ─────────
function MagazineLayout({ team }) {
  return (
    <div style={{ background: "var(--ink)", color: "var(--cream)", width: "100%", minHeight: "100%" }}>
      <TeamHero team={team} />
      <SectionRule />
      <FixturesSection team={team} />
      <SectionRule />
      <SquadSection team={team} />
      <SectionRule />
      <StatsSection team={team} />
      <SectionRule />
      <PredictionSection team={team} />
      <SectionRule />
      <FormTrendSection team={team} />
      <SectionRule />
      <RivalsSection team={team} />
      <SectionRule />
      <NarrativeSection team={team} />
      <SectionRule />
      <VoteSection team={team} />
      <SectionRule />
      <TrophyCaseSection team={team} />
    </div>
  );
}

const SectionRule = () => <div style={{ height: 1, background: "var(--line)", margin: "0 56px" }} />;

// ───────── 01. HERO ─────────
function TeamHero({ team }) {
  return (
    <section style={{ position: "relative", height: 720, padding: "56px 56px 40px", overflow: "hidden" }}>
      {/* Background photo placeholder */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0, overflow: "hidden" }}>
        <div className="photo-placeholder" data-caption={`[${team.nickname.toUpperCase()} — TEAM PHOTO PLACEHOLDER]`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <div className="grain" />
        </div>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, rgba(15,23,19,0.45) 0%, rgba(15,23,19,0.7) 60%, rgba(15,23,19,0.98) 100%)` }} />
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 75% 35%, ${team.primary}33 0%, transparent 55%)` }} />
      </div>

      {/* Top eyebrow row */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span className="eyebrow gold">★ TEAM DOSSIER</span>
          <span style={{ height: 14, width: 1, background: "rgba(245,239,228,0.3)" }} />
          <span className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(245,239,228,0.65)" }}>{team.eyebrow}</span>
        </div>
        <span className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(245,239,228,0.55)" }}>FILE NO. {team.code}-2026 · {team.continent}</span>
      </div>

      {/* Crest + giant name */}
      <div style={{ position: "relative", zIndex: 2, display: "grid", gridTemplateColumns: "1fr auto", gap: 40, alignItems: "end", marginTop: 80 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 22 }}>
            <Crest team={team} size={84} />
            <div>
              <div className="label" style={{ fontSize: 14, color: team.accent, marginBottom: 4 }}>{team.nickname}</div>
              <div className="mono muted" style={{ fontSize: 11, letterSpacing: "0.22em" }}>WORLD #{team.world} · ELO {team.elo} · FIFA #{team.fifa}</div>
            </div>
          </div>
          <h1 className="display" style={{ fontSize: 184, lineHeight: 0.88, margin: 0, fontWeight: 400, color: "var(--cream)" }}>
            {team.name.split(" ")[0]}<span style={{ color: team.primary, fontStyle: "italic" }}>.</span>
          </h1>
          <div style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 42, lineHeight: 1, marginTop: 12, color: team.accent }}>
            {team.slogan}
          </div>
        </div>

        {/* Right: stat snapshot block */}
        <div style={{ width: 320, padding: 24, background: "rgba(245,239,228,0.06)", border: "1px solid rgba(245,239,228,0.14)", backdropFilter: "blur(8px)" }}>
          <FlagBar colors={team.colors} h={4} />
          <div className="eyebrow" style={{ color: team.accent, marginTop: 16, marginBottom: 12 }}>QUALIFYING RECORD</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
            {[
              { l: "P", v: team.record.p },
              { l: "W", v: team.record.w },
              { l: "D", v: team.record.d },
              { l: "L", v: team.record.l },
            ].map((s) => (
              <div key={s.l} style={{ textAlign: "left" }}>
                <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 36, color: "var(--cream)", lineHeight: 1 }}>{s.v}</div>
                <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.2em", marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, paddingTop: 14, borderTop: "1px solid rgba(245,239,228,0.12)" }}>
            <div>
              <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.2em" }}>GOALS FOR</div>
              <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 800, fontSize: 28, color: team.accent }}>{team.record.gf}</div>
            </div>
            <div>
              <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.2em" }}>AGAINST</div>
              <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 800, fontSize: 28, color: "var(--cream)" }}>{team.record.ga}</div>
            </div>
          </div>
          <div style={{ paddingTop: 14, marginTop: 14, borderTop: "1px solid rgba(245,239,228,0.12)" }}>
            <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.2em", marginBottom: 8 }}>FORM (LAST 7)</div>
            <div style={{ display: "flex", gap: 6 }}>{team.form.map((r, i) => <FormDot key={i} r={r} />)}</div>
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div style={{ position: "absolute", left: 56, right: 56, bottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
        <div style={{ display: "flex", gap: 32 }}>
          <MetaItem k="MANAGER" v={team.manager} />
          <MetaItem k="CAPTAIN" v={team.captain} />
          <MetaItem k="NEXT" v={`vs ${team.nextOpponent.code} · ${team.nextOpponent.date}`} />
        </div>
        <span className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em" }}>↓ SCROLL — DOSSIER OPENS</span>
      </div>
    </section>
  );
}

const MetaItem = ({ k, v }) => (
  <div>
    <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.22em", marginBottom: 4 }}>{k}</div>
    <div style={{ fontFamily: "var(--f-body)", fontWeight: 600, fontSize: 14, color: "var(--cream)" }}>{v}</div>
  </div>
);

function Crest({ team, size = 60 }) {
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <div style={{ width: size, height: size, borderRadius: "50%", background: team.primary, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 24px ${team.primary}55`, border: `1.5px solid ${team.accent}55` }}>
        <span style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: size * 0.42, color: team.accent, letterSpacing: "0.04em" }}>{team.code}</span>
      </div>
    </div>
  );
}

// ───────── 02. FIXTURES ─────────
function FixturesSection({ team }) {
  return (
    <Section eyebrow="02 / FIXTURES" title="The road through" italic="June." accent={team.primary}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
        {team.fixtures.map((f, i) => (
          <div key={i} style={{ background: f.status === "tonight" ? team.primary : "var(--ink)", color: f.status === "tonight" ? "#fff" : "var(--cream)", padding: 24, position: "relative" }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", opacity: 0.75, marginBottom: 10 }}>{f.comp} · {f.date}</div>
            <div style={{ fontFamily: "var(--f-display)", fontSize: 36, lineHeight: 1, marginBottom: 8 }}>vs <span style={{ color: f.status === "tonight" ? "#fff" : team.accent }}>{f.opp}</span></div>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", opacity: 0.65, marginTop: 12 }}>{f.venue}</div>
            {f.status === "tonight" && (
              <div style={{ position: "absolute", top: 14, right: 14, display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", background: "rgba(0,0,0,0.4)", borderRadius: 999 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                <span className="mono" style={{ fontSize: 9, letterSpacing: "0.18em", color: "#fff" }}>TONIGHT</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Recent results */}
      <div style={{ marginTop: 40 }}>
        <div className="eyebrow muted" style={{ marginBottom: 14 }}>RECENT · LAST 5</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {team.recent.map((r, i) => {
            const result = r.res.split(" ")[0];
            const map = { W: "var(--green)", D: "rgba(245,239,228,0.5)", L: "#c44" };
            return (
              <div key={i} style={{ padding: 16, background: "rgba(245,239,228,0.04)", borderLeft: `3px solid ${map[result]}`, color: "var(--cream)" }}>
                <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.2em", marginBottom: 6 }}>{r.date}</div>
                <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 800, fontSize: 22, marginBottom: 2 }}>vs {r.opp}</div>
                <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 18, color: map[result], letterSpacing: "0.05em" }}>{r.res}</div>
                <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.18em", marginTop: 6 }}>{r.venue}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

// ───────── 03. SQUAD ─────────
function SquadSection({ team }) {
  return (
    <Section eyebrow="03 / SQUAD" title="The names that" italic="matter." accent={team.primary}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 16, marginBottom: 0 }}>
        {/* Featured: first key player */}
        <FeaturedPlayer player={team.keyPlayers[0]} team={team} />
        {/* Two second-tier */}
        {team.keyPlayers.slice(1, 3).map((p) => (
          <PlayerCard key={p.name} player={p} team={team} compact />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginTop: 16 }}>
        {team.keyPlayers.slice(3).map((p) => (
          <PlayerCard key={p.name} player={p} team={team} compact />
        ))}
      </div>
    </Section>
  );
}

function FeaturedPlayer({ player, team }) {
  return (
    <div style={{ position: "relative", padding: 28, background: team.primary, color: "var(--cream)", overflow: "hidden", minHeight: 320 }}>
      <div className="photo-placeholder" data-caption={`[${player.name.toUpperCase()} — PORTRAIT PLACEHOLDER]`} style={{ position: "absolute", inset: 0, opacity: 0.35, mixBlendMode: "luminosity" }}>
        <div className="grain" />
      </div>
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", minHeight: 264 }}>
        <div>
          <div className="eyebrow" style={{ color: team.accent, marginBottom: 14 }}>★ TALISMAN</div>
          <div style={{ fontFamily: "var(--f-display)", fontSize: 56, lineHeight: 0.92, fontStyle: "italic" }}>{player.name}</div>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.2em", marginTop: 10, opacity: 0.85 }}>{player.pos} · #{Math.floor(player.age) - 8 + 1} · {player.club.toUpperCase()}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, paddingTop: 18, borderTop: `1px solid ${team.accent}44` }}>
          <BigStat k="GOALS" v={player.goals} accent={team.accent} />
          <BigStat k="ASSISTS" v={player.assists} accent={team.accent} />
          <BigStat k="RATING" v={player.rating} accent={team.accent} />
        </div>
      </div>
    </div>
  );
}

function PlayerCard({ player, team, compact }) {
  return (
    <div style={{ padding: 20, background: "rgba(245,239,228,0.04)", border: "1px solid rgba(245,239,228,0.1)", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 152 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", color: team.accent }}>{player.pos}</div>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.18em" }}>AGE {player.age}</div>
        </div>
        <div style={{ fontFamily: "var(--f-display)", fontSize: 24, lineHeight: 1.05, color: "var(--cream)" }}>{player.name}</div>
        <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.18em", marginTop: 6 }}>{player.club.toUpperCase()}</div>
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(245,239,228,0.08)" }}>
        <TinyStat k="G" v={player.goals} />
        <TinyStat k="A" v={player.assists} />
        <TinyStat k="RTG" v={player.rating} />
        <div style={{ marginLeft: "auto", fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: "0.18em", color: team.accent, alignSelf: "flex-end" }}>{player.role.toUpperCase()}</div>
      </div>
    </div>
  );
}

const BigStat = ({ k, v, accent }) => (
  <div>
    <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 38, color: accent, lineHeight: 1 }}>{v}</div>
    <div className="mono" style={{ fontSize: 9, letterSpacing: "0.22em", marginTop: 4, opacity: 0.7 }}>{k}</div>
  </div>
);
const TinyStat = ({ k, v }) => (
  <div>
    <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 800, fontSize: 18, color: "var(--cream)", lineHeight: 1 }}>{v}</div>
    <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.18em", marginTop: 2 }}>{k}</div>
  </div>
);

// ───────── 04. STATS ─────────
function StatsSection({ team }) {
  const stats = [
    { l: "Elo Rating",   v: team.elo,            unit: "", note: team.eloTrend > 0 ? `+${team.eloTrend}` : `${team.eloTrend}`, max: 2200 },
    { l: "Expected Goals", v: team.stats.xG.toFixed(2), unit: "/ match",  note: "ATTACK",   max: 3 },
    { l: "Expected Conceded", v: team.stats.xGA.toFixed(2), unit: "/ match", note: "DEFENCE", max: 2 },
    { l: "Possession",   v: team.stats.possession, unit: "%",            note: "AVG.",     max: 70 },
    { l: "Shots / Match",   v: team.stats.shotsPG, unit: "",             note: "ATTEMPTS", max: 20 },
    { l: "Saves / Match",   v: team.stats.savesPG, unit: "",             note: "GK WORK",  max: 5 },
    { l: "Clean Sheets",    v: team.stats.cleanSheets, unit: "/ 7",      note: "MD-LEVEL", max: 7 },
    { l: "Points / Match",  v: team.stats.ppg.toFixed(2), unit: "",      note: "FORM",     max: 3 },
  ];
  return (
    <Section eyebrow="04 / DATA" title="By the" italic="numbers." accent={team.primary}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
        {stats.map((s) => {
          const pct = Math.min(100, (parseFloat(s.v) / s.max) * 100);
          return (
            <div key={s.l} style={{ background: "var(--ink)", padding: 24, position: "relative", minHeight: 144 }}>
              <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.22em" }}>{s.note}</div>
              <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 800, fontSize: 56, color: "var(--cream)", lineHeight: 1, marginTop: 10, display: "flex", alignItems: "baseline", gap: 6 }}>
                {s.v}
                {s.unit && <span style={{ fontSize: 16, color: team.accent, fontWeight: 600 }}>{s.unit}</span>}
              </div>
              <div style={{ fontFamily: "var(--f-body)", fontWeight: 500, fontSize: 12, color: "var(--cream)", opacity: 0.7, marginTop: 8 }}>{s.l}</div>
              <div style={{ position: "absolute", left: 24, right: 24, bottom: 20, height: 2, background: "rgba(245,239,228,0.1)" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: team.primary }} />
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ───────── 05. PREDICTION ─────────
function PredictionSection({ team }) {
  const probs = [
    { l: "Group stage advance", v: team.prediction.groupAdvance },
    { l: "Reach Quarterfinals", v: team.prediction.quarters },
    { l: "Reach Semifinals",    v: team.prediction.semis },
    { l: "Reach Final",         v: team.prediction.makeFinal },
    { l: "Lift the Cup",        v: team.prediction.winCup },
  ];
  return (
    <Section eyebrow="05 / PREDICTION · KICK ORACLE MODEL" title="Where they" italic="finish." accent={team.primary}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 40 }}>
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {probs.map((p, i) => (
              <div key={p.l}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                  <div style={{ fontFamily: "var(--f-display)", fontSize: 22, color: "var(--cream)" }}>{p.l}</div>
                  <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 34, color: i === probs.length - 1 ? team.accent : "var(--cream)", lineHeight: 1 }}>
                    {p.v}<span style={{ fontSize: 18, opacity: 0.6 }}>%</span>
                  </div>
                </div>
                <div style={{ height: 8, background: "rgba(245,239,228,0.08)", position: "relative" }}>
                  <div style={{ height: "100%", width: `${p.v}%`, background: i === probs.length - 1 ? team.accent : team.primary, transition: "width 0.4s" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 28, background: "var(--cream)", color: "var(--ink)", position: "relative" }}>
          <div className="eyebrow green" style={{ marginBottom: 14 }}>★ MODEL NOTE</div>
          <p style={{ fontFamily: "var(--f-display)", fontSize: 24, lineHeight: 1.25, margin: 0 }}>
            <em style={{ color: team.primary }}>"{team.prediction.modelNote}"</em>
          </p>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em", marginTop: 22, paddingTop: 16, borderTop: "1px solid rgba(15,23,19,0.15)" }}>
            10,000 SIMULATIONS · ELO + xG MODEL · UPDATED HOURLY
          </div>
          <div style={{ position: "absolute", top: 20, right: 20, fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 18, color: team.primary, letterSpacing: "0.06em" }}>★</div>
        </div>
      </div>
    </Section>
  );
}

// ───────── 06. FORM TREND ─────────
function FormTrendSection({ team }) {
  // Synthesize a 7-match xG trend
  const xgTrend = [1.4, 2.1, 1.8, 2.5, 2.3, team.stats.xG, team.stats.xG + 0.2];
  const eloTrend = [team.elo - 28, team.elo - 22, team.elo - 18, team.elo - 12, team.elo - 6, team.elo - 2, team.elo];
  return (
    <Section eyebrow="06 / TREND" title="The last seven" italic="matches." accent={team.primary}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
        <div style={{ padding: 28, background: "rgba(245,239,228,0.04)", border: "1px solid rgba(245,239,228,0.1)" }}>
          <div className="eyebrow muted" style={{ marginBottom: 14 }}>xG PER MATCH</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 18 }}>
            <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 64, color: team.accent, lineHeight: 0.9 }}>{team.stats.xG.toFixed(2)}</div>
            <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em" }}>RECENT AVG</div>
          </div>
          <Sparkline values={xgTrend} primary={team.primary} />
          <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.2em", marginTop: 10 }}>← 7 MATCHES AGO ・ TONIGHT →</div>
        </div>
        <div style={{ padding: 28, background: "rgba(245,239,228,0.04)", border: "1px solid rgba(245,239,228,0.1)" }}>
          <div className="eyebrow muted" style={{ marginBottom: 14 }}>ELO TRAJECTORY</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 18 }}>
            <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 64, color: team.accent, lineHeight: 0.9 }}>{team.elo}</div>
            <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 800, fontSize: 18, color: team.eloTrend > 0 ? "var(--green)" : "#c44" }}>{team.eloTrend > 0 ? "+" : ""}{team.eloTrend}</div>
            <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em" }}>VS LAST CYCLE</div>
          </div>
          <Sparkline values={eloTrend} primary={team.primary} />
          <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.2em", marginTop: 10 }}>← 7 MATCHES AGO ・ TONIGHT →</div>
        </div>
      </div>
    </Section>
  );
}

// ───────── 07. RIVALS / H2H ─────────
function RivalsSection({ team }) {
  return (
    <Section eyebrow="07 / HEAD TO HEAD" title="The teams that" italic="get in the way." accent={team.primary}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
        {team.rivals.map((r) => {
          const t = window.getTeam(r.code);
          const total = r.w + r.d + r.l;
          return (
            <div key={r.code} style={{ background: "var(--ink)", padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <Crest team={t} size={40} />
                <div>
                  <div style={{ fontFamily: "var(--f-display)", fontSize: 22, color: "var(--cream)", lineHeight: 1 }}>{t.name}</div>
                  <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.22em", marginTop: 4 }}>{total} MATCHES</div>
                </div>
              </div>
              {/* Win/Draw/Loss bar */}
              <div style={{ display: "flex", height: 8, marginBottom: 14, overflow: "hidden" }}>
                <div style={{ width: `${(r.w / total) * 100}%`, background: "var(--green)" }} />
                <div style={{ width: `${(r.d / total) * 100}%`, background: "rgba(245,239,228,0.4)" }} />
                <div style={{ width: `${(r.l / total) * 100}%`, background: "#c44" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
                <HStat l="W" v={r.w} c="var(--green)" />
                <HStat l="D" v={r.d} c="rgba(245,239,228,0.6)" />
                <HStat l="L" v={r.l} c="#c44" />
              </div>
              <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.2em", paddingTop: 10, borderTop: "1px solid rgba(245,239,228,0.08)" }}>
                LAST: <span style={{ color: "var(--cream)", marginLeft: 4 }}>{r.last}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
const HStat = ({ l, v, c }) => (
  <div>
    <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.22em" }}>{l}</div>
    <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 24, color: c, lineHeight: 1, marginTop: 4 }}>{v}</div>
  </div>
);

// ───────── 08. NARRATIVE ─────────
function NarrativeSection({ team }) {
  return (
    <Section eyebrow="08 / EDITORS NOTE" title="" accent={team.primary}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 48, alignItems: "start" }}>
        <div>
          <div style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 84, lineHeight: 0.9, color: team.primary }}>
            “
          </div>
          <h3 className="display" style={{ fontSize: 48, lineHeight: 0.96, margin: 0, color: "var(--cream)" }}>
            {team.narrative.title.split(",")[0]}<span style={{ color: team.accent }}>,</span><br/>
            <em>{team.narrative.title.split(",")[1] || ""}</em>
          </h3>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em", marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--line)" }}>
            {team.narrative.byline}
          </div>
        </div>
        <div>
          <p style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 28, lineHeight: 1.32, color: team.accent, margin: 0, marginBottom: 28 }}>
            {team.narrative.lede}
          </p>
          <p style={{ fontFamily: "var(--f-body)", fontSize: 17, lineHeight: 1.7, color: "var(--cream)", opacity: 0.88, margin: 0, columnCount: 2, columnGap: 36, columnRule: "1px solid var(--line)" }}>
            {team.narrative.body}
          </p>
        </div>
      </div>
    </Section>
  );
}

// ───────── 09. FAN VOTE ─────────
function VoteSection({ team }) {
  const [selected, setSelected] = useStateTD(null);
  const options = [
    { id: "win",  l: "Lift the Cup", pct: team.vote.winCup },
    { id: "fin",  l: "Reach the Final",  pct: team.vote.makeFinal },
    { id: "out",  l: "Go home before R16", pct: team.vote.eliminated },
  ];
  return (
    <Section eyebrow="09 / FAN PREDICTION" title="How far does" italic={`${team.name.split(" ")[0]} go?`} accent={team.primary}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {options.map((o) => {
          const sel = selected === o.id;
          return (
            <button
              key={o.id}
              onClick={() => setSelected(o.id)}
              style={{
                background: sel ? team.primary : "rgba(245,239,228,0.04)",
                color: sel ? "#fff" : "var(--cream)",
                border: `1px solid ${sel ? team.primary : "rgba(245,239,228,0.14)"}`,
                padding: 28, textAlign: "left", cursor: "pointer", position: "relative",
                fontFamily: "inherit", transition: "all 0.2s",
              }}
            >
              <div style={{ fontFamily: "var(--f-display)", fontSize: 28, lineHeight: 1.05, marginBottom: 16 }}>{o.l}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 48, color: sel ? team.accent : "var(--cream)", lineHeight: 1 }}>{o.pct}<span style={{ fontSize: 20, opacity: 0.7 }}>%</span></div>
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", opacity: 0.65 }}>FAN VOTE</div>
              </div>
              <div style={{ height: 4, background: sel ? "rgba(255,255,255,0.15)" : "rgba(245,239,228,0.08)", marginTop: 18, position: "relative" }}>
                <div style={{ height: "100%", width: `${o.pct}%`, background: sel ? team.accent : team.primary }} />
              </div>
              {sel && <div className="mono" style={{ position: "absolute", top: 14, right: 18, fontSize: 9, letterSpacing: "0.22em", color: team.accent }}>★ YOUR VOTE</div>}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

// ───────── 10. TROPHY CASE ─────────
function TrophyCaseSection({ team }) {
  return (
    <Section eyebrow="10 / TROPHY CASE" title="What they've" italic="already won." accent={team.primary}>
      {team.trophies.length === 0 ? (
        <div style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 36, color: "rgba(245,239,228,0.4)", textAlign: "center", padding: 48 }}>
          — no major trophies yet —
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
          {team.trophies.map((tr, i) => (
            <div key={i} style={{ background: "var(--ink)", padding: 28, minHeight: 132, position: "relative" }}>
              <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 60, color: team.accent, lineHeight: 0.9 }}>{tr.y}</div>
              <div style={{ fontFamily: "var(--f-display)", fontSize: 18, color: "var(--cream)", marginTop: 8 }}>{tr.t}</div>
              <div style={{ position: "absolute", top: 18, right: 18, fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 14, color: team.primary }}>★</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 56, paddingTop: 32, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em" }}>END OF DOSSIER · {team.code}-2026</span>
        <span style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 22, color: team.accent }}>— Kick Oracle Intelligence</span>
      </div>
    </Section>
  );
}

// ───────── SECTION WRAPPER ─────────
function Section({ eyebrow, title, italic, accent, children }) {
  return (
    <section style={{ padding: "72px 56px 64px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40, gap: 32 }}>
        <div>
          <div className="eyebrow gold" style={{ marginBottom: 12 }}>{eyebrow}</div>
          {title && (
            <h2 className="display" style={{ fontSize: 64, lineHeight: 0.96, margin: 0, color: "var(--cream)" }}>
              {title} {italic && <em style={{ color: accent }}>{italic}</em>}
            </h2>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

// ─────────────────────────────────────────────
// DASHBOARD LAYOUT — denser, no full-bleed hero
// ─────────────────────────────────────────────
function DashboardLayout({ team }) {
  return (
    <div style={{ background: "var(--ink)", color: "var(--cream)", padding: "32px 40px 56px", minHeight: "100%" }}>
      {/* Compact masthead row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Crest team={team} size={64} />
          <div>
            <div className="eyebrow gold" style={{ marginBottom: 6 }}>{team.eyebrow}</div>
            <div style={{ fontFamily: "var(--f-display)", fontSize: 56, lineHeight: 0.92, color: "var(--cream)" }}>
              {team.name} <em style={{ color: team.accent, fontSize: 32 }}>· {team.nickname}</em>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          <MetaItem k="MANAGER" v={team.manager} />
          <MetaItem k="CAPTAIN" v={team.captain} />
          <MetaItem k="ELO" v={`${team.elo} (${team.eloTrend > 0 ? "+" : ""}${team.eloTrend})`} />
        </div>
      </div>
      <FlagBar colors={team.colors} h={3} />

      {/* Grid: KPI tiles, fixtures rail, prediction, narrative */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gridAutoRows: "minmax(120px, auto)", gap: 16, marginTop: 28 }}>
        {/* KPI tiles row */}
        {[
          { l: "Elo",        v: team.elo,        unit: team.eloTrend > 0 ? `+${team.eloTrend}` : `${team.eloTrend}` },
          { l: "xG / match", v: team.stats.xG.toFixed(2), unit: "" },
          { l: "Possession", v: team.stats.possession,    unit: "%" },
          { l: "Win Cup",    v: team.prediction.winCup, unit: "%", hi: true },
        ].map((k) => (
          <div key={k.l} style={{ gridColumn: "span 3", padding: 22, background: k.hi ? team.primary : "rgba(245,239,228,0.04)", border: `1px solid ${k.hi ? team.primary : "rgba(245,239,228,0.12)"}`, color: k.hi ? "#fff" : "var(--cream)" }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", opacity: 0.7 }}>{k.l.toUpperCase()}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
              <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 56, lineHeight: 0.9 }}>{k.v}</div>
              <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 800, fontSize: 16, color: k.hi ? team.accent : team.primary }}>{k.unit}</div>
            </div>
          </div>
        ))}

        {/* Form row */}
        <div style={{ gridColumn: "span 6", padding: 22, background: "rgba(245,239,228,0.04)", border: "1px solid rgba(245,239,228,0.12)" }}>
          <div className="eyebrow muted" style={{ marginBottom: 14 }}>FORM · LAST 7</div>
          <div style={{ display: "flex", gap: 8 }}>{team.form.map((r, i) => <FormDot key={i} r={r} />)}</div>
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <TinyStat k="P" v={team.record.p} /><TinyStat k="W" v={team.record.w} /><TinyStat k="D" v={team.record.d} /><TinyStat k="L" v={team.record.l} />
          </div>
        </div>
        <div style={{ gridColumn: "span 6", padding: 22, background: team.primary, color: "#fff" }}>
          <div className="eyebrow" style={{ marginBottom: 8, color: team.accent }}>NEXT MATCH</div>
          <div style={{ fontFamily: "var(--f-display)", fontSize: 36, lineHeight: 1, marginBottom: 8 }}>vs <span style={{ color: team.accent }}>{team.nextOpponent.code}</span></div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.22em", opacity: 0.85 }}>{team.nextOpponent.date} · {team.nextOpponent.venue}</div>
        </div>

        {/* Prediction bars */}
        <div style={{ gridColumn: "span 8", padding: 22, background: "rgba(245,239,228,0.04)", border: "1px solid rgba(245,239,228,0.12)" }}>
          <div className="eyebrow muted" style={{ marginBottom: 14 }}>WORLD CUP PREDICTION · ORACLE MODEL</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { l: "Group advance", v: team.prediction.groupAdvance },
              { l: "Quarterfinals", v: team.prediction.quarters },
              { l: "Semifinals",    v: team.prediction.semis },
              { l: "Final",         v: team.prediction.makeFinal },
              { l: "Lift the Cup",  v: team.prediction.winCup },
            ].map((p, i, arr) => (
              <div key={p.l} style={{ display: "grid", gridTemplateColumns: "140px 1fr 60px", alignItems: "center", gap: 14 }}>
                <div style={{ fontFamily: "var(--f-body)", fontSize: 13 }}>{p.l}</div>
                <div style={{ height: 8, background: "rgba(245,239,228,0.08)" }}>
                  <div style={{ height: "100%", width: `${p.v}%`, background: i === arr.length - 1 ? team.accent : team.primary }} />
                </div>
                <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 800, fontSize: 18, color: i === arr.length - 1 ? team.accent : "var(--cream)", textAlign: "right" }}>{p.v}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top scorer card */}
        <div style={{ gridColumn: "span 4", padding: 22, background: "rgba(245,239,228,0.04)", border: "1px solid rgba(245,239,228,0.12)" }}>
          <div className="eyebrow muted" style={{ marginBottom: 14 }}>TOP SCORER</div>
          <div style={{ fontFamily: "var(--f-display)", fontSize: 28, lineHeight: 1, color: "var(--cream)" }}>{team.keyPlayers[0].name}</div>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.18em", marginTop: 6 }}>{team.keyPlayers[0].pos} · {team.keyPlayers[0].club.toUpperCase()}</div>
          <div style={{ marginTop: 18, display: "flex", gap: 18 }}>
            <BigStat k="GOALS" v={team.keyPlayers[0].goals} accent={team.accent} />
            <BigStat k="ASSISTS" v={team.keyPlayers[0].assists} accent={team.accent} />
            <BigStat k="RTG" v={team.keyPlayers[0].rating} accent={team.accent} />
          </div>
        </div>

        {/* Narrative */}
        <div style={{ gridColumn: "span 12", padding: 28, background: "var(--cream)", color: "var(--ink)", display: "grid", gridTemplateColumns: "1fr 2fr", gap: 32 }}>
          <div>
            <div className="eyebrow green" style={{ marginBottom: 12 }}>EDITOR'S NOTE</div>
            <div style={{ fontFamily: "var(--f-display)", fontSize: 32, lineHeight: 1, color: team.primary }}>{team.narrative.title}</div>
            <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em", marginTop: 14 }}>{team.narrative.byline}</div>
          </div>
          <p style={{ fontFamily: "var(--f-body)", fontSize: 15, lineHeight: 1.65, margin: 0 }}><em style={{ color: team.primary, fontFamily: "var(--f-display)", fontSize: 18 }}>{team.narrative.lede}</em> {team.narrative.body}</p>
        </div>
      </div>
    </div>
  );
}
