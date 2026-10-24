import type { OrganId } from "../organ/types.js";
import type { InterventionEffects } from "../catalog/types.js";

import { aceInhibitorArbEffects } from "./heart/ace_inhibitor_arb.js";
import { betaBlockerEffects } from "./heart/beta_blocker.js";
import { statinEffects } from "./heart/statin.js";
import { sglt2InhibitorEffects } from "./heart/sglt2_inhibitor.js";
import { aerobicExerciseHeartEffects } from "./heart/aerobic_exercise.js";
import { sodiumReductionEffects } from "./heart/sodium_reduction.js";
import { weightLossEffects } from "./heart/weight_loss.js";
import { smokingCessationHeartEffects } from "./heart/smoking_cessation.js";

import { aerobicExerciseBrainEffects } from "./brain/aerobic_exercise.js";
import { bpControlBrainEffects } from "./brain/bp_control.js";
import { mediterraneanDietBrainEffects } from "./brain/mediterranean_diet.js";
import { sleepBrainEffects } from "./brain/sleep.js";
import { smokingCessationBrainEffects } from "./brain/smoking_cessation.js";

/**
 * Effects are organ-scoped because the same intervention (e.g. aerobic
 * exercise, smoking cessation) has different, separately sourced effects per
 * organ.
 */
const HEART: Record<string, InterventionEffects> = {
  ace_inhibitor_arb: aceInhibitorArbEffects,
  beta_blocker: betaBlockerEffects,
  statin: statinEffects,
  sglt2_inhibitor: sglt2InhibitorEffects,
  aerobic_exercise: aerobicExerciseHeartEffects,
  sodium_reduction: sodiumReductionEffects,
  weight_loss: weightLossEffects,
  smoking_cessation: smokingCessationHeartEffects,
};

const BRAIN: Record<string, InterventionEffects> = {
  aerobic_exercise: aerobicExerciseBrainEffects,
  bp_control: bpControlBrainEffects,
  mediterranean_diet: mediterraneanDietBrainEffects,
  sleep: sleepBrainEffects,
  smoking_cessation: smokingCessationBrainEffects,
};

const BY_ORGAN: Record<OrganId, Record<string, InterventionEffects>> = {
  heart: HEART,
  brain: BRAIN,
};

export function getEffects(
  organ: OrganId,
  interventionId: string,
): InterventionEffects | undefined {
  return BY_ORGAN[organ][interventionId];
}

export function listEffectInterventionIds(organ: OrganId): string[] {
  return Object.keys(BY_ORGAN[organ]);
}
