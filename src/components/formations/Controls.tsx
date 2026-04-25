"use client";

import Link from "next/link";
import { useFormation } from "./FormationContext";
import { TEAMS } from "@/data/wallpaper-teams";
import { FORMATIONS } from "@/data/formations";
import { getSquad } from "@/data/formation-players";
import { useTranslations } from "next-intl";

export function Controls() {
  const { state, formation, setTeam, setFormation, assignPlayer, autoFill, clearLineup } =
    useFormation();
  const t = useTranslations('formationsPage');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1.5">
          {t('selectTeam')}
        </label>
        <select
          value={state.selectedTeamSlug}
          onChange={(e) => setTeam(e.target.value)}
          className="w-full rounded-lg border border-[#1e293b] bg-[#111827] px-3 py-2 text-sm text-white focus:border-[#e94560] focus:outline-none"
        >
          {TEAMS.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.flag} {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1.5">
          {t('formation')}
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {FORMATIONS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormation(f.id)}
              className={`
                rounded-lg px-2 py-1.5 text-xs font-medium transition-all
                ${state.formationId === f.id
                  ? "bg-[#0f3460] text-white"
                  : "bg-[#111827] text-[#64748b] hover:bg-[#1e293b] hover:text-white"
                }
              `}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748b] mb-1.5">
          {t('lineup')}
        </label>
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {formation.positions.map((pos) => {
            const currentPlayer = state.lineup[pos.id];
            const squad = getSquad(state.selectedTeamSlug);

            return (
              <div key={pos.id} className="flex items-center gap-2">
                <span className="w-8 text-[10px] font-bold text-[#475569]">
                  {pos.label}
                </span>
                <select
                  value={currentPlayer?.slug ?? ""}
                  onChange={(e) => {
                    const slug = e.target.value;
                    if (!slug) {
                      assignPlayer(pos.id, null);
                    } else {
                      const player = squad.find((p) => p.slug === slug);
                      if (player) assignPlayer(pos.id, player);
                    }
                  }}
                  className="flex-1 rounded border border-[#1e293b] bg-[#0a0e17] px-2 py-1 text-xs text-[#cbd5e1] focus:border-[#e94560] focus:outline-none"
                >
                  <option value="">{t('empty')}</option>
                  {squad
                    .filter((p) => p.position === pos.role)
                    .map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.number}. {p.name}
                      </option>
                    ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={autoFill}
          className="flex-1 rounded-lg bg-[#0f3460]/80 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0f3460]"
        >
          {t('autoFill')}
        </button>
        <button
          onClick={clearLineup}
          className="flex-1 rounded-lg bg-[#111827] px-3 py-2 text-xs font-semibold text-[#64748b] transition-colors hover:bg-[#1e293b] hover:text-white"
        >
          {t('clear')}
        </button>
      </div>

      <Link
        href={`/teams/${state.selectedTeamSlug}`}
        className="block rounded-[0.75rem] border border-[#0f3460]/40 bg-gradient-to-r from-[#1a1a2e] to-[#16213e] p-4 text-white"
      >
        <p className="text-sm font-semibold">{t('aiSquadAnalysis')}</p>
        <p className="mt-0.5 text-xs text-[#94a3b8]">{t('aiSquadDesc')}</p>
      </Link>
    </div>
  );
}
