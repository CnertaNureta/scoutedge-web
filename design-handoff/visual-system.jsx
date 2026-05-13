/* global React */
const { useState } = React;

// ─────────────────────────────────────────────
// Shared bits
// ─────────────────────────────────────────────

const Flag = ({ colors, style }) => (
  <span
    className="flag"
    style={{
      background: `linear-gradient(90deg, ${colors.map((c, i) => `${c} ${(i / colors.length) * 100}%, ${c} ${((i + 1) / colors.length) * 100}%`).join(", ")})`,
      ...style,
    }}
  />
);

const TEAMS = {
  BRA: { name: "Brazil", code: "BRA", colors: ["#009C3B", "#FFDF00", "#002776"] },
  ARG: { name: "Argentina", code: "ARG", colors: ["#75AADB", "#FFFFFF", "#75AADB"] },
  FRA: { name: "France", code: "FRA", colors: ["#002395", "#FFFFFF", "#ED2939"] },
  ENG: { name: "England", code: "ENG", colors: ["#FFFFFF", "#CE1124", "#FFFFFF"] },
  GER: { name: "Germany", code: "GER", colors: ["#000000", "#DD0000", "#FFCE00"] },
  ESP: { name: "Spain", code: "ESP", colors: ["#AA151B", "#F1BF00", "#AA151B"] },
  POR: { name: "Portugal", code: "POR", colors: ["#046A38", "#DA291C", "#FFE900"] },
  NED: { name: "Netherlands", code: "NED", colors: ["#AE1C28", "#FFFFFF", "#21468B"] },
  USA: { name: "USA", code: "USA", colors: ["#B22234", "#FFFFFF", "#3C3B6E"] },
  JPN: { name: "Japan", code: "JPN", colors: ["#FFFFFF", "#BC002D", "#FFFFFF"] },
};

const PhotoPlaceholder = ({ caption, className = "", style = {}, children, noCaption = false }) => (
  <div
    className={`photo-placeholder ${noCaption ? "no-caption" : ""} ${className}`}
    data-caption={caption}
    style={style}
  >
    <div className="grain" />
    {children}
  </div>
);

// ─────────────────────────────────────────────
// 1. VISUAL SYSTEM artboard
// ─────────────────────────────────────────────
window.VisualSystem = function VisualSystem() {
  return (
    <div style={{ padding: 60, background: "var(--ink)", color: "var(--cream)", width: "100%", height: "100%", overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 48 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: "1px solid var(--line)", paddingBottom: 20 }}>
          <div>
            <div className="eyebrow green" style={{ marginBottom: 12 }}>Kick Oracle · Visual System v1</div>
            <div className="display" style={{ fontSize: 64 }}>
              The <em>Beautiful Game,</em><br/>set in <span style={{ color: "var(--gold)" }}>type.</span>
            </div>
          </div>
          <div className="mono muted" style={{ fontSize: 11, letterSpacing: "0.2em" }}>
            FOR REVIEW · 12.05.26
          </div>
        </div>

        {/* Type scale */}
        <Section title="01 / Typography">
          <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 32 }}>
            <div>
              <div className="eyebrow muted" style={{ marginBottom: 8 }}>Display</div>
              <div style={{ fontFamily: "var(--f-display)", fontSize: 22 }}>DM Serif Display</div>
              <div className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>cover heads · drama</div>

              <div className="eyebrow muted" style={{ marginTop: 24, marginBottom: 8 }}>Condensed</div>
              <div className="label" style={{ fontSize: 18 }}>BIG SHOULDERS DISPLAY</div>
              <div className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>stats · scoreboards</div>

              <div className="eyebrow muted" style={{ marginTop: 24, marginBottom: 8 }}>Body</div>
              <div style={{ fontFamily: "var(--f-body)", fontSize: 17, fontWeight: 500 }}>Manrope</div>
              <div className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>UI · paragraphs</div>
            </div>
            <div>
              <div className="display" style={{ fontSize: 96, lineHeight: 0.9 }}>
                Glory<br/>
                <em style={{ color: "var(--gold)" }}>in 90 minutes.</em>
              </div>
              <div style={{ marginTop: 24, display: "flex", alignItems: "baseline", gap: 24, flexWrap: "wrap" }}>
                <div className="label" style={{ fontSize: 14, color: "var(--green)" }}>MATCHDAY · 23</div>
                <div className="bignum gold">87<span style={{ fontSize: 28, color: "var(--cream)" }}>%</span></div>
                <div style={{ fontFamily: "var(--f-body)", fontSize: 15, maxWidth: 420, color: "var(--cream)", opacity: 0.85 }}>
                  Daily predictions, head-to-head analysis, and editor-grade narratives for every fixture of the 2026 World Cup.
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Palette */}
        <Section title="02 / Palette">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
            {[
              { name: "Ink",     hex: "#0A0D0A", fg: "#f5efe4" },
              { name: "Pitch",   hex: "#0F1A13", fg: "#f5efe4" },
              { name: "Surface", hex: "#1B201C", fg: "#f5efe4" },
              { name: "Green",   hex: "#A8E063", fg: "#0a0d0a" },
              { name: "Gold",    hex: "#F3C969", fg: "#0a0d0a" },
              { name: "Cream",   hex: "#F5EFE4", fg: "#0a0d0a" },
              { name: "Live",    hex: "#FF4444", fg: "#f5efe4" },
            ].map((c) => (
              <div key={c.name} style={{ background: c.hex, color: c.fg, padding: 18, height: 140, display: "flex", flexDirection: "column", justifyContent: "space-between", borderRadius: 4 }}>
                <div className="label" style={{ fontSize: 12 }}>{c.name}</div>
                <div className="mono" style={{ fontSize: 11, opacity: 0.8 }}>{c.hex}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Components */}
        <Section title="03 / Components">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {/* Buttons */}
            <div className="card" style={{ padding: 24 }}>
              <div className="eyebrow muted" style={{ marginBottom: 16 }}>Actions</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
                <button className="btn btn-primary">Predict Match →</button>
                <button className="btn btn-ghost">View Schedule</button>
              </div>
            </div>

            {/* Live chip */}
            <div className="card" style={{ padding: 24 }}>
              <div className="eyebrow muted" style={{ marginBottom: 16 }}>Indicators</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", border: "1px solid var(--red)", color: "var(--red)" }}>
                  <span className="tick" /> <span className="label" style={{ fontSize: 11 }}>LIVE</span>
                </span>
                <span className="strike label" style={{ fontSize: 11 }}>MATCHDAY 03</span>
                <span style={{ padding: "6px 12px", border: "1px solid var(--line-strong)" }} className="label">UPCOMING</span>
              </div>
            </div>

            {/* Score block */}
            <div className="card" style={{ padding: 24 }}>
              <div className="eyebrow muted" style={{ marginBottom: 16 }}>Score Mark</div>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Flag colors={TEAMS.BRA.colors} />
                <div className="bignum" style={{ fontSize: 48 }}>2</div>
                <div className="mono muted" style={{ fontSize: 13 }}>vs</div>
                <div className="bignum gold" style={{ fontSize: 48 }}>3</div>
                <Flag colors={TEAMS.ARG.colors} />
              </div>
            </div>

            {/* Flag chip */}
            <div className="card" style={{ padding: 24 }}>
              <div className="eyebrow muted" style={{ marginBottom: 16 }}>Nation chips</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {Object.values(TEAMS).slice(0, 6).map((t) => (
                  <span key={t.code} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 10px", border: "1px solid var(--line)" }}>
                    <Flag colors={t.colors} style={{ width: 18, height: 12 }} />
                    <span className="label" style={{ fontSize: 11 }}>{t.code}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Photo placeholder demo */}
            <div className="card" style={{ padding: 24, gridColumn: "span 2" }}>
              <div className="eyebrow muted" style={{ marginBottom: 16 }}>Photo placeholder</div>
              <PhotoPlaceholder caption="[striker · celebration · golden hour]" style={{ height: 140, borderRadius: 8 }}>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div className="display" style={{ fontSize: 40, color: "rgba(245,239,228,0.18)", letterSpacing: "-0.02em" }}><em>[image]</em></div>
                </div>
              </PhotoPlaceholder>
              <div className="mono muted" style={{ fontSize: 10, marginTop: 10, lineHeight: 1.6 }}>
                Striped placeholder with stadium-light gradient and monospace caption. Swap with licensed photography in production. Mask + grain layer holds visual treatment consistent.
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
};

function Section({ title, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div className="eyebrow gold">{title}</div>
        <div style={{ flex: 1, height: 1, background: "var(--line)" }} />
      </div>
      {children}
    </div>
  );
}

window.Flag = Flag;
window.TEAMS = TEAMS;
window.PhotoPlaceholder = PhotoPlaceholder;
