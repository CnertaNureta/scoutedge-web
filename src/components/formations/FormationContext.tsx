"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
} from "react";
import type { ReactNode } from "react";
import { FORMATIONS } from "@/data/formations";
import type { FormationTemplate, FormationPosition } from "@/data/formations";
import type { FormationPlayer } from "@/data/formation-players";
import { getSquad } from "@/data/formation-players";

export type LineupMap = Record<string, FormationPlayer | null>;

interface FormationState {
  selectedTeamSlug: string;
  formationId: string;
  lineup: LineupMap;
}

type FormationAction =
  | { type: "SET_TEAM"; teamSlug: string }
  | { type: "SET_FORMATION"; formationId: string }
  | { type: "ASSIGN_PLAYER"; positionId: string; player: FormationPlayer | null }
  | { type: "SWAP_POSITIONS"; fromId: string; toId: string }
  | { type: "AUTO_FILL" }
  | { type: "CLEAR_LINEUP" };

function buildAutoLineup(
  teamSlug: string,
  formation: FormationTemplate,
): LineupMap {
  const squad = getSquad(teamSlug);
  const lineup: LineupMap = {};
  const used = new Set<string>();

  for (const pos of formation.positions) {
    const candidates = squad.filter(
      (p) => p.position === pos.role && !used.has(p.slug),
    );
    const pick = candidates[0] ?? null;
    lineup[pos.id] = pick;
    if (pick) used.add(pick.slug);
  }

  return lineup;
}

function getFormation(id: string): FormationTemplate {
  return FORMATIONS.find((f) => f.id === id) ?? FORMATIONS[0];
}

const initialTeam = "brazil";
const initialFormation = "4-3-3";

const initialState: FormationState = {
  selectedTeamSlug: initialTeam,
  formationId: initialFormation,
  lineup: buildAutoLineup(initialTeam, getFormation(initialFormation)),
};

function formationReducer(
  state: FormationState,
  action: FormationAction,
): FormationState {
  switch (action.type) {
    case "SET_TEAM": {
      const formation = getFormation(state.formationId);
      return {
        ...state,
        selectedTeamSlug: action.teamSlug,
        lineup: buildAutoLineup(action.teamSlug, formation),
      };
    }
    case "SET_FORMATION": {
      const formation = getFormation(action.formationId);
      return {
        ...state,
        formationId: action.formationId,
        lineup: buildAutoLineup(state.selectedTeamSlug, formation),
      };
    }
    case "ASSIGN_PLAYER":
      return {
        ...state,
        lineup: { ...state.lineup, [action.positionId]: action.player },
      };
    case "SWAP_POSITIONS": {
      const newLineup = { ...state.lineup };
      const temp = newLineup[action.fromId];
      newLineup[action.fromId] = newLineup[action.toId];
      newLineup[action.toId] = temp;
      return { ...state, lineup: newLineup };
    }
    case "AUTO_FILL": {
      const formation = getFormation(state.formationId);
      return {
        ...state,
        lineup: buildAutoLineup(state.selectedTeamSlug, formation),
      };
    }
    case "CLEAR_LINEUP": {
      const lineup: LineupMap = {};
      const formation = getFormation(state.formationId);
      for (const pos of formation.positions) {
        lineup[pos.id] = null;
      }
      return { ...state, lineup };
    }
    default:
      return state;
  }
}

interface FormationContextValue {
  state: FormationState;
  formation: FormationTemplate;
  setTeam: (slug: string) => void;
  setFormation: (id: string) => void;
  assignPlayer: (positionId: string, player: FormationPlayer | null) => void;
  swapPositions: (fromId: string, toId: string) => void;
  autoFill: () => void;
  clearLineup: () => void;
}

const FormationContext = createContext<FormationContextValue | null>(null);

export function FormationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(formationReducer, initialState);

  const formation = useMemo(
    () => getFormation(state.formationId),
    [state.formationId],
  );

  const setTeam = useCallback(
    (slug: string) => dispatch({ type: "SET_TEAM", teamSlug: slug }),
    [],
  );
  const setFormation = useCallback(
    (id: string) => dispatch({ type: "SET_FORMATION", formationId: id }),
    [],
  );
  const assignPlayer = useCallback(
    (positionId: string, player: FormationPlayer | null) =>
      dispatch({ type: "ASSIGN_PLAYER", positionId, player }),
    [],
  );
  const swapPositions = useCallback(
    (fromId: string, toId: string) =>
      dispatch({ type: "SWAP_POSITIONS", fromId, toId }),
    [],
  );
  const autoFill = useCallback(() => dispatch({ type: "AUTO_FILL" }), []);
  const clearLineup = useCallback(
    () => dispatch({ type: "CLEAR_LINEUP" }),
    [],
  );

  const value = useMemo(
    () => ({
      state,
      formation,
      setTeam,
      setFormation,
      assignPlayer,
      swapPositions,
      autoFill,
      clearLineup,
    }),
    [state, formation, setTeam, setFormation, assignPlayer, swapPositions, autoFill, clearLineup],
  );

  return (
    <FormationContext.Provider value={value}>
      {children}
    </FormationContext.Provider>
  );
}

export function useFormation(): FormationContextValue {
  const ctx = useContext(FormationContext);
  if (!ctx)
    throw new Error("useFormation must be used within FormationProvider");
  return ctx;
}

export type { FormationPosition };
