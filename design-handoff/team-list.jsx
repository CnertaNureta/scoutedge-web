/* global React */
// ─────────────────────────────────────────────
// TEAMS INDEX — 3 layout variants
//   "groups"     — 8 groups (A–H) grouped cards
//   "elo"        — dense Elo-ranked grid
//   "continents" — magazine continent directory
// ─────────────────────────────────────────────

window.TeamsIndex = function TeamsIndex({ variant = "groups" }) {
  if (variant === "elo")        return <EloGrid />;
  if (variant === "continents") return <ContinentDirectory />;
  return <GroupsView />;
};

const TL_FlagBar = ({ colors, h = 4 }) => (
  <div style={{ display: "flex", height: h, width: "100%" }}>
    {colors.map((c, i) => <div key={i} style={{ flex: 1, background: c }} />)}
  </div>
);

const TL_Crest = ({ team, size = 48 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: team.primary, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${team.accent}55`, flexShrink: 0 }}>
    <span style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: size * 0.4, color: team.accent }}>{team.code}</span>
  </div>
);

// Shared page header
function PageHeader({ subtitle }) {
  return (
    <div style={{ padding: "56px 56px 36px", borderBottom: "1px solid var(--line)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 40 }}>
        <div>
          <div className="eyebrow gold" style={{ marginBottom: 16 }}>★ THE FIELD · 32 FEDERATIONS</div>
          <h1 className="display" style={{ fontSize: 128, lineHeight: 0.92, margin: 0, paddingBottom: 14, color: "var(--cream)" }}>
            Every team,<br/><em style={{ color: "var(--green)" }}>every angle.</em>
          </h1>
          {subtitle && <div style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 24, color: "var(--gold)", marginTop: 32 }}>{subtitle}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em" }}>UPDATED 12.05.26 · 18:42 GMT</div>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em", marginTop: 4 }}>WORLD CUP 2026 · ISSUE 14</div>
        </div>
      </div>
    </div>
  );
}

// Build groups from TEAM_DATA (synthesize a full bracket of 32)
function makeGroups() {
  // 8 teams in TEAM_DATA. Build a fake but plausible 8-group structure with placeholders for the others.
  const data = window.TEAM_DATA;
  const placeholders = [
    { code: "MEX", name: "Mexico", colors: ["#006847", "#FFFFFF", "#CE1126"], primary: "#006847", accent: "#FFFFFF", elo: 1842 },
    { code: "USA", name: "USA",    colors: ["#B22234", "#FFFFFF", "#3C3B6E"], primary: "#3C3B6E", accent: "#B22234", elo: 1798 },
    { code: "BEL", name: "Belgium",colors: ["#000000", "#FAE042", "#ED2939"], primary: "#FAE042", accent: "#000000", elo: 1956 },
    { code: "URU", name: "Uruguay",colors: ["#0038A8", "#FFFFFF", "#FCD116"], primary: "#0038A8", accent: "#FCD116", elo: 1934 },
    { code: "CRO", name: "Croatia",colors: ["#FF0000", "#FFFFFF", "#171796"], primary: "#FF0000", accent: "#FFFFFF", elo: 1928 },
    { code: "JPN", name: "Japan",  colors: ["#FFFFFF", "#BC002D", "#FFFFFF"], primary: "#BC002D", accent: "#FFFFFF", elo: 1812 },
    { code: "MAR", name: "Morocco",colors: ["#C1272D", "#006233", "#C1272D"], primary: "#C1272D", accent: "#006233", elo: 1856 },
    { code: "DEN", name: "Denmark",colors: ["#C8102E", "#FFFFFF", "#C8102E"], primary: "#C8102E", accent: "#FFFFFF", elo: 1894 },
    { code: "SUI", name: "Switzerland", colors: ["#FF0000", "#FFFFFF", "#FF0000"], primary: "#FF0000", accent: "#FFFFFF", elo: 1872 },
    { code: "POL", name: "Poland", colors: ["#FFFFFF", "#DC143C", "#FFFFFF"], primary: "#DC143C", accent: "#FFFFFF", elo: 1814 },
    { code: "AUS", name: "Australia", colors: ["#FFCD00", "#00843D", "#FFCD00"], primary: "#00843D", accent: "#FFCD00", elo: 1742 },
    { code: "EGY", name: "Egypt",  colors: ["#CE1126", "#FFFFFF", "#000000"], primary: "#CE1126", accent: "#FFFFFF", elo: 1734 },
    { code: "GHA", name: "Ghana",  colors: ["#CE1126", "#FCD116", "#006B3F"], primary: "#FCD116", accent: "#CE1126", elo: 1684 },
    { code: "ITA", name: "Italy",  colors: ["#008C45", "#FFFFFF", "#CD212A"], primary: "#008C45", accent: "#FFFFFF", elo: 1976 },
    { code: "COL", name: "Colombia", colors: ["#FCD116", "#003893", "#CE1126"], primary: "#FCD116", accent: "#003893", elo: 1882 },
    { code: "ECU", name: "Ecuador",colors: ["#FFD100", "#0033A0", "#EF3340"], primary: "#FFD100", accent: "#0033A0", elo: 1764 },
    { code: "KOR", name: "S. Korea", colors: ["#FFFFFF", "#CD2E3A", "#0047A0"], primary: "#CD2E3A", accent: "#0047A0", elo: 1788 },
    { code: "IRN", name: "Iran",   colors: ["#239F40", "#FFFFFF", "#DA0000"], primary: "#239F40", accent: "#DA0000", elo: 1746 },
    { code: "SEN", name: "Senegal",colors: ["#00853F", "#FCD116", "#E31B23"], primary: "#00853F", accent: "#FCD116", elo: 1772 },
    { code: "TUN", name: "Tunisia",colors: ["#E70013", "#FFFFFF", "#E70013"], primary: "#E70013", accent: "#FFFFFF", elo: 1696 },
    { code: "CAN", name: "Canada", colors: ["#FF0000", "#FFFFFF", "#FF0000"], primary: "#FF0000", accent: "#FFFFFF", elo: 1768 },
    { code: "CRC", name: "Costa Rica", colors: ["#002B7F", "#FFFFFF", "#CE1126"], primary: "#002B7F", accent: "#CE1126", elo: 1648 },
    { code: "SAU", name: "Saudi Arabia", colors: ["#006C35", "#FFFFFF", "#006C35"], primary: "#006C35", accent: "#FFFFFF", elo: 1612 },
    { code: "QAT", name: "Qatar",  colors: ["#8A1538", "#FFFFFF", "#8A1538"], primary: "#8A1538", accent: "#FFFFFF", elo: 1602 },
  ];
  const allTeams = [...Object.values(data), ...placeholders];
  // Group structure (8 groups of 4)
  const layout = {
    A: ["FRA", "AUS", "EGY", "CAN"],
    B: ["BRA", "JPN", "NED", "SUI"],
    C: ["ARG", "MEX", "POL", "TUN"],
    D: ["ESP", "USA", "MAR", "ECU"],
    E: ["ENG", "DEN", "SUI", "QAT"],
    F: ["GER", "POL", "GHA", "KOR"],
    G: ["POR", "URU", "CRO", "IRN"],
    H: ["NED", "BEL", "ITA", "SEN"],
  };
  return Object.entries(layout).map(([id, codes]) => ({
    id,
    teams: codes.map((c) => allTeams.find((t) => t.code === c) || allTeams[0]).map((t, i) => ({
      ...t,
      played: 0,
      pts: 0,
      pos: i + 1,
    })),
  }));
}

// ───────── VARIANT 1: GROUPS ─────────
function GroupsView() {
  const groups = React.useMemo(makeGroups, []);
  return (
    <div style={{ background: "var(--ink)", color: "var(--cream)", minHeight: "100%" }}>
      <PageHeader subtitle="Eight groups. Sixteen ties. One Cup." />
      <div style={{ padding: "48px 56px 64px" }}>
        <div className="eyebrow muted" style={{ marginBottom: 24 }}>GROUP STAGE · 12 — 26 MAY</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
          {groups.map((g) => <GroupCard key={g.id} group={g} />)}
        </div>
      </div>
    </div>
  );
}

function GroupCard({ group }) {
  return (
    <div style={{ background: "var(--ink)", padding: 24, minHeight: 380 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--f-display)", fontSize: 48, lineHeight: 1, color: "var(--gold)" }}>
          <em>Group</em>
          <div style={{ fontStyle: "normal", fontSize: 96, color: "var(--cream)", lineHeight: 0.8 }}>{group.id}</div>
        </div>
        <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.22em" }}>MD 1–3</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {group.teams.map((tm, i) => (
          <a key={tm.code} href={`Kick Oracle — Team Dossier.html?team=${tm.code}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", background: i < 2 ? "rgba(0,156,59,0.08)" : "rgba(245,239,228,0.04)", borderLeft: `3px solid ${i < 2 ? "var(--green)" : "transparent"}`, textDecoration: "none", color: "var(--cream)", cursor: "pointer", transition: "background 0.15s" }}>
            <span style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 12, color: "rgba(245,239,228,0.5)", width: 14 }}>{i + 1}</span>
            <TL_Crest team={tm} size={26} />
            <span style={{ fontFamily: "var(--f-condensed)", fontWeight: 700, fontSize: 14, flex: 1, letterSpacing: "0.04em" }}>{tm.name.toUpperCase()}</span>
            <span className="mono muted" style={{ fontSize: 9, letterSpacing: "0.18em" }}>{tm.elo}</span>
          </a>
        ))}
      </div>
      <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed rgba(245,239,228,0.16)" }}>
        <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.2em" }}>↑ TWO ADVANCE</div>
      </div>
    </div>
  );
}

// ───────── VARIANT 2: ELO RANKED GRID ─────────
function EloGrid() {
  const groups = React.useMemo(makeGroups, []);
  const all = React.useMemo(() => {
    const seen = new Set();
    const flat = [];
    groups.forEach((g) => g.teams.forEach((t) => {
      if (!seen.has(t.code)) { seen.add(t.code); flat.push(t); }
    }));
    return flat.sort((a, b) => b.elo - a.elo);
  }, [groups]);
  return (
    <div style={{ background: "var(--ink)", color: "var(--cream)", minHeight: "100%" }}>
      <PageHeader subtitle="Sorted by Elo rating, top to bottom." />
      <div style={{ padding: "48px 56px 64px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 24 }}>
          <div className="eyebrow muted">RANKED · LIVE ELO</div>
          <div style={{ display: "flex", gap: 18 }}>
            <span className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em" }}>32 FEDERATIONS</span>
            <span className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em" }}>RANGE 1602 – 2147</span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)" }}>
          {all.map((tm, i) => <EloCell key={tm.code} team={tm} rank={i + 1} max={all[0].elo} min={all[all.length - 1].elo} />)}
        </div>
      </div>
    </div>
  );
}

function EloCell({ team, rank, max, min }) {
  const pct = ((team.elo - min) / (max - min)) * 100;
  return (
    <a href={`Kick Oracle — Team Dossier.html?team=${team.code}`} style={{ background: "var(--ink)", padding: 18, minHeight: 168, position: "relative", textDecoration: "none", color: "var(--cream)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 11, color: "var(--gold)", letterSpacing: "0.1em" }}>#{String(rank).padStart(2, '0')}</span>
          {rank <= 8 && <span style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 9, color: "var(--green)", letterSpacing: "0.1em" }}>★ POT 1</span>}
        </div>
        <div style={{ marginTop: 12 }}>
          <TL_Crest team={team} size={36} />
        </div>
        <div style={{ fontFamily: "var(--f-display)", fontSize: 18, lineHeight: 1.05, marginTop: 10 }}>{team.name}</div>
      </div>
      <div>
        <TL_FlagBar colors={team.colors} h={2} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
          <div style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 24, color: "var(--cream)", lineHeight: 1 }}>{team.elo}</div>
          <div className="mono muted" style={{ fontSize: 9, letterSpacing: "0.18em" }}>ELO</div>
        </div>
        <div style={{ height: 2, background: "rgba(245,239,228,0.08)", marginTop: 4, position: "relative" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: team.primary }} />
        </div>
      </div>
    </a>
  );
}

// ───────── VARIANT 3: CONTINENT DIRECTORY ─────────
function ContinentDirectory() {
  const groups = React.useMemo(makeGroups, []);
  // Map team to continent
  const continentMap = {
    UEFA: ["FRA","ESP","ENG","GER","POR","NED","BEL","CRO","ITA","DEN","SUI","POL"],
    CONMEBOL: ["BRA","ARG","URU","COL","ECU"],
    CONCACAF: ["MEX","USA","CAN","CRC"],
    CAF: ["MAR","EGY","GHA","SEN","TUN"],
    AFC: ["JPN","KOR","IRN","AUS","SAU","QAT"],
  };
  const all = React.useMemo(() => {
    const seen = new Set();
    const flat = [];
    groups.forEach((g) => g.teams.forEach((t) => {
      if (!seen.has(t.code)) { seen.add(t.code); flat.push(t); }
    }));
    return flat;
  }, [groups]);
  const byContinent = Object.entries(continentMap).map(([id, codes]) => ({
    id, codes, label: id, teams: codes.map((c) => all.find((t) => t.code === c)).filter(Boolean).sort((a, b) => b.elo - a.elo)
  }));
  return (
    <div style={{ background: "var(--ink)", color: "var(--cream)", minHeight: "100%" }}>
      <PageHeader subtitle="A magazine directory across five federations." />
      <div style={{ padding: "48px 56px 64px" }}>
        {byContinent.map((c, i) => <ContinentBlock key={c.id} block={c} idx={i} />)}
      </div>
    </div>
  );
}

function ContinentBlock({ block, idx }) {
  const titles = {
    UEFA: { name: "Europe", italic: "loaded.", note: "The most-represented confederation, again." },
    CONMEBOL: { name: "South", italic: "America.", note: "Five teams, two contenders, one rivalry." },
    CONCACAF: { name: "North &", italic: "Central.", note: "Host federation. Home advantage in play." },
    CAF: { name: "Africa.", italic: "Rising.", note: "The most improved confederation since 2022." },
    AFC: { name: "Asia &", italic: "Oceania.", note: "Six teams. Three of them, dangerous." },
  };
  const meta = titles[block.id] || { name: block.label, italic: "", note: "" };
  return (
    <div style={{ marginBottom: 72, paddingBottom: 72, borderBottom: idx < 4 ? "1px solid var(--line)" : "none" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 56, marginBottom: 32, alignItems: "end" }}>
        <div>
          <div className="eyebrow gold" style={{ marginBottom: 14 }}>0{idx + 1} · {block.id}</div>
          <h2 className="display" style={{ fontSize: 88, lineHeight: 0.92, margin: 0, color: "var(--cream)" }}>
            {meta.name} <em style={{ color: "var(--green)" }}>{meta.italic}</em>
          </h2>
        </div>
        <div>
          <p style={{ fontFamily: "var(--f-display)", fontStyle: "italic", fontSize: 24, lineHeight: 1.3, color: "var(--gold)", margin: 0, marginBottom: 12 }}>{meta.note}</p>
          <div className="mono muted" style={{ fontSize: 10, letterSpacing: "0.22em" }}>{block.teams.length} TEAMS · {Math.round(block.teams.reduce((a, b) => a + b.elo, 0) / block.teams.length)} AVG. ELO</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(6, block.teams.length)}, 1fr)`, gap: 16 }}>
        {block.teams.map((tm, i) => (
          <a key={tm.code} href={`Kick Oracle — Team Dossier.html?team=${tm.code}`} style={{ textDecoration: "none", color: "inherit", display: "block", position: "relative" }}>
            <div style={{ padding: 18, background: i === 0 ? tm.primary : "rgba(245,239,228,0.04)", color: i === 0 ? "#fff" : "var(--cream)", border: i === 0 ? "none" : "1px solid rgba(245,239,228,0.1)", minHeight: 168, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <TL_Crest team={tm} size={32} />
                  {i === 0 && <span className="mono" style={{ fontSize: 8, letterSpacing: "0.2em", color: tm.accent }}>★ TOP SEED</span>}
                </div>
                <div style={{ fontFamily: "var(--f-display)", fontSize: 20, lineHeight: 1.05 }}>{tm.name}</div>
              </div>
              <div>
                <TL_FlagBar colors={tm.colors} h={2} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 }}>
                  <span style={{ fontFamily: "var(--f-condensed)", fontWeight: 900, fontSize: 20 }}>{tm.elo}</span>
                  <span className="mono" style={{ fontSize: 9, letterSpacing: "0.2em", opacity: 0.7 }}>ELO</span>
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
