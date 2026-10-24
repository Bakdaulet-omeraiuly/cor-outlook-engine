import { clamp } from "../util/rng.js";
import { brainModel } from "./brain.js";
import { heartModel } from "./heart.js";
import type { OrganId, OrganModel, OrganParameter } from "./types.js";

export type { OrganId, OrganModel, OrganParameter, Direction } from "./types.js";

const MODELS: Record<OrganId, OrganModel> = {
  heart: heartModel,
  brain: brainModel,
};

export function getOrganModel(organ: OrganId): OrganModel {
  const m = MODELS[organ];
  if (!m) throw new Error(`Unknown organ: ${organ}`);
  return m;
}

export function isOrganId(x: string): x is OrganId {
  return x === "heart" || x === "brain";
}

export function getParameter(
  organ: OrganId,
  parameterId: string,
): OrganParameter | undefined {
  return getOrganModel(organ).parameters.find((p) => p.id === parameterId);
}

/** Clamp a value to a parameter's bounds; returns value + whether it clamped. */
export function clampToBounds(
  param: OrganParameter,
  value: number,
): { value: number; clamped: boolean } {
  const clamped = clamp(value, param.bounds[0], param.bounds[1]);
  return { value: clamped, clamped: clamped !== value };
}
