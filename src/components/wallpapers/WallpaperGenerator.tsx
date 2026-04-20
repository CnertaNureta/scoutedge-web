"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TEAMS, GROUPS, getTeamsByGroup } from "@/data/wallpaper-teams";
import type { WallpaperTeam, GroupLetter } from "@/data/wallpaper-teams";

type DeviceSize = "phone" | "tablet" | "desktop";
type WallpaperTemplate = "classic" | "gradient" | "minimal" | "bold";

interface WallpaperConfig {
  team: WallpaperTeam | null;
  deviceSize: DeviceSize;
  template: WallpaperTemplate;
  playerName: string;
  matchDate: string;
  showBranding: boolean;
}

const DEVICE_SIZES: Record<DeviceSize, { width: number; height: number; label: string; aspect: string }> = {
  phone:   { width: 1080, height: 1920, label: "Phone",   aspect: "aspect-[9/16]" },
  tablet:  { width: 1668, height: 2224, label: "Tablet",  aspect: "aspect-[3/4]" },
  desktop: { width: 1920, height: 1080, label: "Desktop", aspect: "aspect-video" },
};

const TEMPLATES: Record<WallpaperTemplate, { label: string; description: string }> = {
  classic:  { label: "Classic",  description: "Flag + team colors" },
  gradient: { label: "Gradient", description: "Bold color sweep" },
  minimal:  { label: "Minimal",  description: "Clean white canvas" },
  bold:     { label: "Bold",     description: "Dark dramatic look" },
};

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function isLight(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

function drawWallpaper(
  canvas: HTMLCanvasElement,
  config: WallpaperConfig,
  preview = false,
) {
  const { team, deviceSize, template, playerName, matchDate, showBranding } = config;
  const { width, height } = DEVICE_SIZES[deviceSize];
  const scale = preview ? Math.min(400 / width, 600 / height) : 1;

  canvas.width  = Math.round(width  * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  const primary   = team?.primaryColor   ?? "#1a1a2e";
  const secondary = team?.secondaryColor ?? "#e94560";

  if (template === "classic") {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, primary);
    grad.addColorStop(1, secondary);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(W * 0.3, 0);
    ctx.lineTo(W * 0.7, 0);
    ctx.lineTo(W * 0.4, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (template === "gradient") {
    const grad = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.8);
    grad.addColorStop(0, secondary);
    grad.addColorStop(1, primary);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else if (template === "minimal") {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = primary;
    ctx.fillRect(0, H * 0.85, W, H * 0.15);
  } else {
    ctx.fillStyle = "#0d0d0d";
    ctx.fillRect(0, 0, W, H);
    const grad = ctx.createLinearGradient(0, 0, W, H * 0.6);
    const [pr, pg, pb] = hexToRgb(primary);
    grad.addColorStop(0, `rgba(${pr},${pg},${pb},0.5)`);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  const flagSize = Math.round(H * 0.22);
  ctx.font = `${flagSize}px serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(team?.flag ?? "⚽", W / 2, H * 0.30);

  const textColor =
    template === "minimal"
      ? (isLight(primary) ? "#1a1a2e" : primary)
      : template === "bold"
      ? "#ffffff"
      : isLight(primary) ? "#1a1a2e" : "#ffffff";

  const nameFontSize = Math.round(H * 0.055);
  ctx.font = `800 ${nameFontSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText((team?.name ?? "Select a Team").toUpperCase(), W / 2, H * 0.52);

  const wcFontSize = Math.round(H * 0.028);
  ctx.font = `600 ${wcFontSize}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = template === "minimal" ? primary : secondary;
  if (template === "bold") ctx.fillStyle = "#e94560";
  ctx.letterSpacing = "4px";
  ctx.fillText("WORLD CUP 2026", W / 2, H * 0.58);
  ctx.letterSpacing = "0px";

  if (playerName.trim()) {
    const pFontSize = Math.round(H * 0.035);
    ctx.font = `500 ${pFontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = template === "minimal" ? "#374151" : "rgba(255,255,255,0.85)";
    if (template === "bold") ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText(playerName.trim(), W / 2, H * 0.66);
  }

  if (matchDate) {
    const d = new Date(matchDate + "T00:00:00");
    const dateStr = d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const dFontSize = Math.round(H * 0.025);
    ctx.font = `400 ${dFontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = template === "minimal" ? "#6b7280" : "rgba(255,255,255,0.65)";
    ctx.fillText(dateStr, W / 2, H * 0.72);
  }

  if (team) {
    const badgeR = Math.round(H * 0.035);
    const badgeX = W * 0.85;
    const badgeY = H * 0.08;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeR, 0, 2 * Math.PI);
    ctx.fillStyle = secondary;
    ctx.fill();
    const bFontSize = Math.round(badgeR * 0.9);
    ctx.font = `700 ${bFontSize}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = isLight(secondary) ? "#1a1a2e" : "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`G${team.group}`, badgeX, badgeY);
  }

  if (showBranding) {
    const wmFontSize = Math.round(H * 0.022);
    ctx.font = `600 ${wmFontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = template === "minimal" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.45)";
    ctx.fillText("kickoracle.com", W / 2, H * 0.96);
  }
}

export default function WallpaperGenerator() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [config, setConfig] = useState<WallpaperConfig>({
    team: TEAMS[32],
    deviceSize: "phone",
    template: "classic",
    playerName: "",
    matchDate: "",
    showBranding: true,
  });
  const [activeGroup, setActiveGroup] = useState<GroupLetter>("I");
  const [downloading, setDownloading] = useState(false);

  const redraw = useCallback(() => {
    if (!canvasRef.current) return;
    drawWallpaper(canvasRef.current, config, true);
  }, [config]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function patch(updates: Partial<WallpaperConfig>) {
    setConfig((c) => ({ ...c, ...updates }));
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const fullCanvas = document.createElement("canvas");
      drawWallpaper(fullCanvas, config, false);
      const dataUrl = fullCanvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const teamSlug = config.team?.slug ?? "wallpaper";
      a.download = `wc2026-${teamSlug}-${config.deviceSize}.png`;
      a.click();
    } finally {
      setDownloading(false);
    }
  }

  const { aspect } = DEVICE_SIZES[config.deviceSize];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Controls */}
        <div className="space-y-6 order-2 lg:order-1">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#64748b]">
              1. Choose Team
            </h2>
            <div className="mb-3 flex flex-wrap gap-1">
              {GROUPS.map((g) => (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                    activeGroup === g
                      ? "bg-[#e94560] text-white"
                      : "bg-[#1e293b] text-[#94a3b8] hover:bg-[#334155] hover:text-white"
                  }`}
                >
                  G{g}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {getTeamsByGroup(activeGroup).map((t) => (
                <button
                  key={t.slug}
                  onClick={() => patch({ team: t })}
                  className={`flex items-center gap-2 rounded-[0.75rem] border p-2 text-left text-sm transition-all ${
                    config.team?.slug === t.slug
                      ? "border-[#e94560] bg-[#e94560]/10 font-semibold"
                      : "border-[#1e293b] bg-[#111827] hover:border-[#e94560]/50"
                  }`}
                >
                  <span className="text-xl">{t.flag}</span>
                  <span className="truncate text-[#e2e8f0]">{t.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#64748b]">
              2. Device Size
            </h2>
            <div className="flex gap-2">
              {(Object.entries(DEVICE_SIZES) as [DeviceSize, (typeof DEVICE_SIZES)[DeviceSize]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => patch({ deviceSize: key })}
                  className={`flex-1 rounded-[0.75rem] border py-2.5 text-sm font-medium transition-colors ${
                    config.deviceSize === key
                      ? "border-[#e94560] bg-[#e94560] text-white"
                      : "border-[#1e293b] bg-[#111827] hover:border-[#e94560]/50 text-[#94a3b8]"
                  }`}
                >
                  {val.label}
                  <br />
                  <span className="text-xs opacity-70">{val.width}×{val.height}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#64748b]">
              3. Template Style
            </h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.entries(TEMPLATES) as [WallpaperTemplate, (typeof TEMPLATES)[WallpaperTemplate]][]).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => patch({ template: key })}
                  className={`rounded-[0.75rem] border p-3 text-left text-sm transition-all ${
                    config.template === key
                      ? "border-[#e94560] bg-[#e94560]/10"
                      : "border-[#1e293b] bg-[#111827] hover:border-[#e94560]/50"
                  }`}
                >
                  <div className="font-semibold text-[#f1f5f9]">{val.label}</div>
                  <div className="text-xs text-[#64748b]">{val.description}</div>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#64748b]">
              4. Customize (Optional)
            </h2>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[#94a3b8]">
                  Player Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mbappé, Messi, Vinicius Jr."
                  value={config.playerName}
                  onChange={(e) => patch({ playerName: e.target.value })}
                  maxLength={32}
                  className="w-full rounded-md border border-[#1e293b] bg-[#0a0e17] px-3 py-2 text-sm text-[#f1f5f9] placeholder-[#475569] focus:border-[#e94560] focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[#94a3b8]">
                  Match Date
                </label>
                <input
                  type="date"
                  value={config.matchDate}
                  min="2026-06-11"
                  max="2026-07-19"
                  onChange={(e) => patch({ matchDate: e.target.value })}
                  className="w-full rounded-md border border-[#1e293b] bg-[#0a0e17] px-3 py-2 text-sm text-[#f1f5f9] focus:border-[#e94560] focus:outline-none"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-[#94a3b8] cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.showBranding}
                  onChange={(e) => patch({ showBranding: e.target.checked })}
                  className="rounded border-[#1e293b] accent-[#e94560]"
                />
                Show KickOracle watermark
              </label>
            </div>
          </section>

          <button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full rounded-md bg-[#e94560] py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {downloading ? "Generating…" : "⬇ Download PNG"}
          </button>

          {config.team && (
            <Link
              href={`/teams/${config.team.slug}`}
              className="block rounded-[0.75rem] border border-[#0f3460]/40 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] p-5 text-white"
            >
              <p className="font-semibold">
                {config.team.flag} {config.team.name} — AI Analysis
              </p>
              <p className="mt-1 text-sm text-[#94a3b8]">
                Squad chemistry, player fitness, and win probability →
              </p>
            </Link>
          )}
        </div>

        {/* Preview */}
        <div className="order-1 lg:order-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#64748b]">
            Preview
          </h2>
          <div className={`overflow-hidden rounded-[0.75rem] border border-[#1e293b] ${aspect} w-full bg-[#111827]`}>
            <canvas ref={canvasRef} className="h-full w-full object-contain" />
          </div>
          <p className="mt-2 text-center text-xs text-[#475569]">
            {DEVICE_SIZES[config.deviceSize].width} × {DEVICE_SIZES[config.deviceSize].height}px
          </p>
        </div>
      </div>
    </div>
  );
}
