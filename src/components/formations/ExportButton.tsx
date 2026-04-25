"use client";

import { useCallback, useState } from "react";
import { useFormation } from "./FormationContext";
import { TEAMS } from "@/data/wallpaper-teams";
import { useTranslations } from "next-intl";

function getTeamBySlug(slug: string) {
  return TEAMS.find((t) => t.slug === slug);
}

export function ExportButton() {
  const { state, formation } = useFormation();
  const [copying, setCopying] = useState(false);
  const t = useTranslations('share');
  const team = getTeamBySlug(state.selectedTeamSlug);

  const handleShare = useCallback(async () => {
    const lines: string[] = [];
    lines.push(`My ${team?.flag ?? ""} ${team?.name ?? state.selectedTeamSlug} XI`);
    lines.push(`Formation: ${formation.name}`);
    lines.push("---");

    for (const pos of formation.positions) {
      const player = state.lineup[pos.id];
      lines.push(`${pos.label}: ${player?.name ?? "(empty)"}`);
    }

    lines.push("---");
    lines.push("Built with KickOracle Formation Builder");
    lines.push("https://kickoracle.com/formations");

    const text = lines.join("\n");

    if (navigator.share) {
      try {
        await navigator.share({ title: `My ${team?.name} XI`, text });
        return;
      } catch {
        // fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    }
  }, [state, formation, team]);

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-lg bg-[#e94560] px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-[#e94560]/90 active:scale-95"
    >
      {copying ? (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {t('copiedLineup')}
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {t('shareLineup')}
        </>
      )}
    </button>
  );
}
