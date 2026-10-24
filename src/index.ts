import type { OrganId } from "./organ/types.js";
import { getOrganModel, isOrganId } from "./organ/index.js";
import { listInterventions as catalogList } from "./catalog/index.js";
import { getEffects } from "./effects/index.js";
import { combine } from "./combine/combine.js";
import { buildContract } from "./contract/build.js";
import type { Contract } from "./contract/schema.js";
import type { InterventionEffects } from "./catalog/types.js";

export type { OrganId, OrganModel, OrganParameter, Direction } from "./organ/types.js";
export type {
  Intervention,
  InterventionEffects,
  ParameterEffect,
  Citation,
  EvidenceGrade,
} from "./catalog/types.js";
export type { Contract } from "./contract/schema.js";
export { SCHEMA_VERSION, COHORT_NOTICE, ContractSchema } from "./contract/schema.js";
export { ENGINE_VERSION } from "./contract/build.js";
export { getOrganModel, isOrganId } from "./organ/index.js";
export { listInterventions } from "./catalog/index.js";

// Time-trajectory API (0-N year untreated vs treated outlook).
export {
  trajectory,
  rampFraction,
  DEFAULT_HORIZON_YEARS,
  EFFECT_RAMP_FOLLOWUP_YEARS,
} from "./trajectory/trajectory.js";
export type {
  TrajectoryResult,
  TrajectoryOptions,
  ParameterTrajectory,
  TrajectoryPoint,
  Scenario,
} from "./trajectory/trajectory.js";
export {
  getNaturalCourse,
  getNaturalCourseRate,
} from "./trajectory/naturalCourse.js";
export type {
  NaturalCourse,
  NaturalCourseRate,
  NaturalCourseModel,
} from "./trajectory/naturalCourse.js";

export interface SimulateInput {
  organ: OrganId;
  /** parameterId -> baseline value, in the parameter's unit. */
  baseline: Record<string, number>;
  interventions: string[];
  /** Deterministic Monte Carlo seed (default 1). */
  seed?: number;
  /** Monte Carlo iterations (default 2000). */
  iterations?: number;
}

/**
 * Run a cohort-level organ-outlook simulation and return a validated contract.
 *
 * The result is cohort-level decision support, NOT an individual prediction;
 * see `contract.notice`.
 */
export function simulate(input: SimulateInput): Contract {
  if (!isOrganId(input.organ)) {
    throw new Error(`Unknown organ: ${String(input.organ)}`);
  }
  const result = combine({
    organ: input.organ,
    baseline: input.baseline,
    interventions: input.interventions,
    ...(input.seed !== undefined ? { seed: input.seed } : {}),
    ...(input.iterations !== undefined ? { iterations: input.iterations } : {}),
  });
  return buildContract(input.organ, result);
}

/** Re-export for convenience alongside the catalog list. */
export function getModel(organ: OrganId) {
  return getOrganModel(organ);
}

/**
 * Read-only lookup of an intervention's effects for an organ, including
 * citations, population, evidence grade, and verified/unverified status.
 * Returns undefined if the intervention has no entry for that organ.
 *
 * Exposed so UIs can render provenance (ⓘ popovers) and detect whether an
 * intervention has any sourced (verified) effect for the selected organ.
 */
export function getInterventionEffects(
  organ: OrganId,
  interventionId: string,
): InterventionEffects | undefined {
  return getEffects(organ, interventionId);
}

export const catalog = { listInterventions: catalogList };
