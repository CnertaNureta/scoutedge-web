"use client";

import { useCallback, useRef, useState } from "react";
import { useFormation } from "./FormationContext";
import { TEAMS } from "@/data/wallpaper-teams";

function getTeamBySlug(slug: string) {
  return TEAMS.find((t) => t.slug === slug);
}

export function Pitch() {
  const { state, formation, swapPositions } = useFormation();
  const team = getTeamBySlug(state.selectedTeamSlug);
  const pitchRef = useRef<HTMLDivElement>(null);
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const primaryColor = team?.primaryColor ?? "#0066B2";
  const secondaryColor = team?.secondaryColor ?? "#FFFFFF";

  const handleDragStart = useCallback((posId: string) => {
    setDragFrom(posId);
  }, []);

  const handleDragOverPos = useCallback(
    (e: React.DragEvent, posId: string) => {
      e.preventDefault();
      if (dragFrom && dragFrom !== posId) {
        setDragOver(posId);
      }
    },
    [dragFrom],
  );

  const handleDrop = useCallback(
    (posId: string) => {
      if (dragFrom && dragFrom !== posId) {
        swapPositions(dragFrom, posId);
      }
      setDragFrom(null);
      setDragOver(null);
    },
    [dragFrom, swapPositions],
  );

  const handleDragEnd = useCallback(() => {
    setDragFrom(null);
    setDragOver(null);
  }, []);

  return (
    <div
      ref={pitchRef}
      className="relative mx-auto aspect-[68/105] w-full max-w-md overflow-hidden rounded-xl border-2 border-green-700/60"
      style={{
        background:
          "repeating-linear-gradient(0deg, #2d8a4e 0px, #2d8a4e 40px, #338a55 40px, #338a55 80px)",
      }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 68 105"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect x="1" y="1" width="66" height="103" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
        <line x1="1" y1="52.5" x2="67" y2="52.5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
        <circle cx="34" cy="52.5" r="9.15" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
        <circle cx="34" cy="52.5" r="0.5" fill="rgba(255,255,255,0.35)" />
        <rect x="13.85" y="1" width="40.3" height="16.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
        <rect x="13.85" y="87.5" width="40.3" height="16.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
        <rect x="24.85" y="1" width="18.3" height="5.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
        <rect x="24.85" y="98.5" width="18.3" height="5.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
        <path d="M 24.85 16.5 A 9.15 9.15 0 0 0 43.15 16.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
        <path d="M 24.85 87.5 A 9.15 9.15 0 0 1 43.15 87.5" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" />
        <path d="M 1 3 A 2 2 0 0 0 3 1" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
        <path d="M 65 1 A 2 2 0 0 0 67 3" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
        <path d="M 1 102 A 2 2 0 0 1 3 104" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
        <path d="M 65 104 A 2 2 0 0 1 67 102" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.3" />
      </svg>

      {formation.positions.map((pos) => {
        const player = state.lineup[pos.id];
        const isDragging = dragFrom === pos.id;
        const isOver = dragOver === pos.id;

        return (
          <div
            key={pos.id}
            draggable
            onDragStart={() => handleDragStart(pos.id)}
            onDragOver={(e) => handleDragOverPos(e, pos.id)}
            onDrop={() => handleDrop(pos.id)}
            onDragEnd={handleDragEnd}
            className={`
              absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing
              transition-all duration-200
              ${isDragging ? "opacity-40 scale-90 z-10" : "z-20"}
              ${isOver ? "scale-110" : ""}
            `}
            style={{
              left: `${pos.x}%`,
              bottom: `${pos.y}%`,
            }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold shadow-lg sm:h-10 sm:w-10"
              style={{
                backgroundColor: primaryColor,
                color: secondaryColor,
                boxShadow: `0 0 0 2px ${secondaryColor}80, 0 2px 8px ${primaryColor}60`,
              }}
            >
              {player?.number ?? pos.label}
            </div>
            <span
              className="mt-0.5 max-w-[72px] truncate rounded-sm px-1 text-[9px] font-semibold leading-tight text-white sm:text-[10px]"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}
            >
              {player?.name ?? pos.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
