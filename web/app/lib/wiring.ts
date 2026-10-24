import {
  listInterventions,
  getInterventionEffects,
  getModel,
  type OrganId,
  type EvidenceGrade,
} from "@engine";

/**
 * SYNTHETIC example baselines. NOT real patients. These mirror
 * examples/heart.synthetic.json and examples/brain.synthetic.json in the repo
 * root. Keyed by organ for the demo's fixed baseline.
 */
export const SYNTHETIC_BASELINES: Record<OrganId, Record<string, number>> = {
  heart: { lvmi: 135, lv_wall_thickness: 13, ef: 38, lavi: 40 },
  brain: { hippocampal_volume: 6.5, cortical_thickness: 2.45, ventricular_volume: 34 },
};

/** Fixed Monte Carlo seed so the demo is deterministic across reloads. */
export const DEMO_SEED = 1;
export const DEMO_ITERATIONS = 2000;

export interface CitationView {
  text: string;
  population: string;
  evidenceGrade: EvidenceGrade;
  verified: boolean;
  parameterId: string;
  note?: string | undefined;
}

export interface ButtonView {
  id: string;
  label: string;
  kind: "drug" | "lifestyle";
  evidenceGrade: EvidenceGrade;
  /** true if at least one VERIFIED (sourced) effect exists for this organ. */
  sourced: boolean;
  /** why the button is disabled, if it is. */
  disabledReason?: string;
  citations: CitationView[];
}

function formatCitation(c: {
  authors: string;
  year: number;
  journal: string;
  doi?: string | undefined;
  trial?: string | undefined;
}): string {
  const parts = [`${c.authors} (${c.year}). ${c.journal}.`];
  if (c.trial) parts.push(`Trial: ${c.trial}.`);
  if (c.doi) parts.push(`DOI: ${c.doi}`);
  return parts.join(" ");
}

/**
 * Build the toggle-button view models for an organ from the library catalog.
 * Interventions with no SOURCED (verified) effect for the organ are flagged
 * `sourced: false` with a disabledReason.
 */
export function buildButtons(organ: OrganId): ButtonView[] {
  return listInterventions(organ).map((iv) => {
    const effects = getInterventionEffects(organ, iv.id);
    const list = effects?.effects ?? [];
    const sourced = list.some((e) => e.verified);
    const citations: CitationView[] = list.map((e) => ({
      text: formatCitation(e.citation),
      population: e.population,
      evidenceGrade: e.evidenceGrade,
      verified: e.verified,
      parameterId: e.parameterId,
      note: e.note,
    }));

    const view: ButtonView = {
      id: iv.id,
      label: iv.label,
      kind: iv.kind,
      evidenceGrade: iv.evidenceGrade,
      sourced,
      citations,
    };
    if (!sourced) {
      view.disabledReason =
        list.length === 0
          ? `No modeled effect for the ${organ} in v0.1.`
          : `No independently sourced (verified) effect for the ${organ} in v0.1 — excluded to avoid inventing a number.`;
    }
    return view;
  });
}

export function buttonsByKind(organ: OrganId): {
  drugs: ButtonView[];
  lifestyle: ButtonView[];
} {
  const all = buildButtons(organ);
  return {
    drugs: all.filter((b) => b.kind === "drug"),
    lifestyle: all.filter((b) => b.kind === "lifestyle"),
  };
}

export function parameterLabels(organ: OrganId): Record<string, { label: string; unit: string }> {
  const model = getModel(organ);
  const out: Record<string, { label: string; unit: string }> = {};
  for (const p of model.parameters) out[p.id] = { label: p.label, unit: p.unit };
  return out;
}

export const ORGANS: { id: OrganId; label: string }[] = [
  { id: "heart", label: "Heart" },
  { id: "brain", label: "Brain" },
];
