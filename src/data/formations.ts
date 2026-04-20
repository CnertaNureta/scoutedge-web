/** Formation templates with position coordinates on a pitch (0-100 scale) */

import type { Position } from "./formation-players";

export interface FormationPosition {
  id: string;
  x: number; // 0-100, left to right
  y: number; // 0-100, bottom (GK) to top (FWD)
  role: Position;
  label: string;
}

export interface FormationTemplate {
  id: string;
  name: string;
  positions: FormationPosition[];
}

export const FORMATIONS: FormationTemplate[] = [
  {
    id: "4-3-3",
    name: "4-3-3",
    positions: [
      { id: "gk", x: 50, y: 8, role: "GK", label: "GK" },
      { id: "lb", x: 15, y: 25, role: "DEF", label: "LB" },
      { id: "cb1", x: 37, y: 22, role: "DEF", label: "CB" },
      { id: "cb2", x: 63, y: 22, role: "DEF", label: "CB" },
      { id: "rb", x: 85, y: 25, role: "DEF", label: "RB" },
      { id: "cm1", x: 30, y: 45, role: "MID", label: "CM" },
      { id: "cdm", x: 50, y: 38, role: "MID", label: "CDM" },
      { id: "cm2", x: 70, y: 45, role: "MID", label: "CM" },
      { id: "lw", x: 18, y: 70, role: "FWD", label: "LW" },
      { id: "st", x: 50, y: 78, role: "FWD", label: "ST" },
      { id: "rw", x: 82, y: 70, role: "FWD", label: "RW" },
    ],
  },
  {
    id: "4-4-2",
    name: "4-4-2",
    positions: [
      { id: "gk", x: 50, y: 8, role: "GK", label: "GK" },
      { id: "lb", x: 15, y: 25, role: "DEF", label: "LB" },
      { id: "cb1", x: 37, y: 22, role: "DEF", label: "CB" },
      { id: "cb2", x: 63, y: 22, role: "DEF", label: "CB" },
      { id: "rb", x: 85, y: 25, role: "DEF", label: "RB" },
      { id: "lm", x: 15, y: 48, role: "MID", label: "LM" },
      { id: "cm1", x: 38, y: 44, role: "MID", label: "CM" },
      { id: "cm2", x: 62, y: 44, role: "MID", label: "CM" },
      { id: "rm", x: 85, y: 48, role: "MID", label: "RM" },
      { id: "st1", x: 38, y: 75, role: "FWD", label: "ST" },
      { id: "st2", x: 62, y: 75, role: "FWD", label: "ST" },
    ],
  },
  {
    id: "3-5-2",
    name: "3-5-2",
    positions: [
      { id: "gk", x: 50, y: 8, role: "GK", label: "GK" },
      { id: "cb1", x: 25, y: 22, role: "DEF", label: "CB" },
      { id: "cb2", x: 50, y: 20, role: "DEF", label: "CB" },
      { id: "cb3", x: 75, y: 22, role: "DEF", label: "CB" },
      { id: "lwb", x: 10, y: 45, role: "MID", label: "LWB" },
      { id: "cm1", x: 32, y: 42, role: "MID", label: "CM" },
      { id: "cdm", x: 50, y: 36, role: "MID", label: "CDM" },
      { id: "cm2", x: 68, y: 42, role: "MID", label: "CM" },
      { id: "rwb", x: 90, y: 45, role: "MID", label: "RWB" },
      { id: "st1", x: 38, y: 75, role: "FWD", label: "ST" },
      { id: "st2", x: 62, y: 75, role: "FWD", label: "ST" },
    ],
  },
  {
    id: "4-2-3-1",
    name: "4-2-3-1",
    positions: [
      { id: "gk", x: 50, y: 8, role: "GK", label: "GK" },
      { id: "lb", x: 15, y: 25, role: "DEF", label: "LB" },
      { id: "cb1", x: 37, y: 22, role: "DEF", label: "CB" },
      { id: "cb2", x: 63, y: 22, role: "DEF", label: "CB" },
      { id: "rb", x: 85, y: 25, role: "DEF", label: "RB" },
      { id: "cdm1", x: 38, y: 38, role: "MID", label: "CDM" },
      { id: "cdm2", x: 62, y: 38, role: "MID", label: "CDM" },
      { id: "lam", x: 20, y: 58, role: "MID", label: "LAM" },
      { id: "cam", x: 50, y: 55, role: "MID", label: "CAM" },
      { id: "ram", x: 80, y: 58, role: "MID", label: "RAM" },
      { id: "st", x: 50, y: 78, role: "FWD", label: "ST" },
    ],
  },
  {
    id: "5-3-2",
    name: "5-3-2",
    positions: [
      { id: "gk", x: 50, y: 8, role: "GK", label: "GK" },
      { id: "lwb", x: 10, y: 30, role: "DEF", label: "LWB" },
      { id: "cb1", x: 28, y: 22, role: "DEF", label: "CB" },
      { id: "cb2", x: 50, y: 20, role: "DEF", label: "CB" },
      { id: "cb3", x: 72, y: 22, role: "DEF", label: "CB" },
      { id: "rwb", x: 90, y: 30, role: "DEF", label: "RWB" },
      { id: "cm1", x: 30, y: 48, role: "MID", label: "CM" },
      { id: "cm2", x: 50, y: 44, role: "MID", label: "CM" },
      { id: "cm3", x: 70, y: 48, role: "MID", label: "CM" },
      { id: "st1", x: 38, y: 75, role: "FWD", label: "ST" },
      { id: "st2", x: 62, y: 75, role: "FWD", label: "ST" },
    ],
  },
  {
    id: "4-1-4-1",
    name: "4-1-4-1",
    positions: [
      { id: "gk", x: 50, y: 8, role: "GK", label: "GK" },
      { id: "lb", x: 15, y: 25, role: "DEF", label: "LB" },
      { id: "cb1", x: 37, y: 22, role: "DEF", label: "CB" },
      { id: "cb2", x: 63, y: 22, role: "DEF", label: "CB" },
      { id: "rb", x: 85, y: 25, role: "DEF", label: "RB" },
      { id: "cdm", x: 50, y: 35, role: "MID", label: "CDM" },
      { id: "lm", x: 15, y: 55, role: "MID", label: "LM" },
      { id: "cm1", x: 38, y: 50, role: "MID", label: "CM" },
      { id: "cm2", x: 62, y: 50, role: "MID", label: "CM" },
      { id: "rm", x: 85, y: 55, role: "MID", label: "RM" },
      { id: "st", x: 50, y: 78, role: "FWD", label: "ST" },
    ],
  },
];
