import { trajectory, type OrganId, type TrajectoryResult, type ParameterTrajectory } from "@engine";
import { SYNTHETIC_BASELINES, DEMO_SEED, DEMO_ITERATIONS } from "./wiring";

export const HORIZON_YEARS = 5;

export function computeTrajectory(
  organ: OrganId,
  selectedIds: string[],
  seed = DEMO_SEED,
): TrajectoryResult {
  return trajectory({
    organ,
    baseline: SYNTHETIC_BASELINES[organ],
    interventions: selectedIds,
    horizonYears: HORIZON_YEARS,
    seed,
    iterations: DEMO_ITERATIONS,
  });
}

export type Scenario = "untreated" | "treated";

export interface YearValue {
  value: number;
  low: number;
  high: number;
  clamped: boolean;
}

/** Point for a parameter at a given year in a scenario. */
export function pointAt(
  p: ParameterTrajectory,
  scenario: Scenario,
  year: number,
): YearValue {
  const series = scenario === "treated" ? p.treated : p.untreated;
  const pt = series[Math.max(0, Math.min(series.length - 1, year))];
  if (!pt) return { value: p.baseline, low: p.baseline, high: p.baseline, clamped: false };
  return { value: pt.value, low: pt.low, high: pt.high, clamped: pt.clamped };
}

/** Ratio value/baseline for a scenario at a year (1 = unchanged). Used for 3D scaling. */
export function ratioAt(p: ParameterTrajectory, scenario: Scenario, year: number): number {
  if (p.baseline === 0) return 1;
  return pointAt(p, scenario, year).value / p.baseline;
}

export function paramById(res: TrajectoryResult, id: string): ParameterTrajectory | undefined {
  return res.parameters.find((p) => p.id === id);
}

/** Per-scenario deformation ratios for the 3D meshes at a chosen year. */
export interface HeartRatios {
  wallThickness: number; // lv_wall_thickness ratio
  mass: number; // lvmi ratio
}
export interface BrainRatios {
  hippocampus: number;
  ventricles: number;
  cortex: number;
}

export function heartRatios(res: TrajectoryResult, scenario: Scenario, year: number): HeartRatios {
  const wall = paramById(res, "lv_wall_thickness");
  const mass = paramById(res, "lvmi");
  return {
    wallThickness: wall ? ratioAt(wall, scenario, year) : 1,
    mass: mass ? ratioAt(mass, scenario, year) : 1,
  };
}

export function brainRatios(res: TrajectoryResult, scenario: Scenario, year: number): BrainRatios {
  const hip = paramById(res, "hippocampal_volume");
  const ven = paramById(res, "ventricular_volume");
  const cor = paramById(res, "cortical_thickness");
  return {
    hippocampus: hip ? ratioAt(hip, scenario, year) : 1,
    ventricles: ven ? ratioAt(ven, scenario, year) : 1,
    cortex: cor ? ratioAt(cor, scenario, year) : 1,
  };
}

/** Parse ?suggest=a,b,c into a list of intervention ids. */
export function parseSuggested(search: string): string[] {
  const params = new URLSearchParams(search);
  const raw = params.get("suggest");
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}
