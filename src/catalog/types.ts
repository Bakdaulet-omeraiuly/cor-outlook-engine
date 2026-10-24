import type { OrganId } from "../organ/types.js";

export type EvidenceGrade = "A" | "B" | "C";
export type InterventionKind = "drug" | "lifestyle";

export interface Citation {
  authors: string;
  year: number;
  journal: string;
  doi?: string;
  trial?: string;
}

/**
 * A relative multiplicative change on one organ parameter:
 *   value_new = value_old * (1 + delta)
 * delta is a fraction (e.g. -0.11 == 11% reduction). The 95% CI is on delta.
 */
export interface EffectDistribution {
  deltaMean: number;
  delta95: [number, number];
}

export interface ParameterEffect {
  parameterId: string;
  dist: EffectDistribution;
  citation: Citation;
  evidenceGrade: EvidenceGrade;
  /** Population in which the effect was measured. */
  population: string;
  /** false => excluded from default computation and surfaced as a warning. */
  verified: boolean;
  /** true => value is illustrative, not a directly measured point estimate. */
  illustrative?: boolean;
  /** TODO / caveat, especially for unverified effects. */
  note?: string;
}

export interface InterventionEffects {
  interventionId: string;
  effects: ParameterEffect[];
}

export interface Intervention {
  id: string;
  label: string;
  kind: InterventionKind;
  organs: OrganId[];
  /** Interventions sharing this class are mutually exclusive (no stacking). */
  exclusiveClass?: string;
  contraindications: string[];
  evidenceGrade: EvidenceGrade;
  population: string;
}
