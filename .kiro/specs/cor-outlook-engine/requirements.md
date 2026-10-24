# Requirements — cor-outlook-engine

## Introduction

`cor-outlook-engine` is a standalone, pure-TypeScript library (no UI, no
network, no third-party simulation framework) that computes how an organ's
*modeled* parameters change when a clinician toggles a set of interventions
(drug classes and lifestyle changes) on or off. It emits numbers and a
versioned JSON contract consumed by a separate 3D viewer application
(COR Studio).

The engine represents **cohort-level** evidence drawn from published
randomized trials and meta-analyses. It is **not** an individual patient
forecast. Every output carries a notice to this effect and is intended as
clinician decision support only.

## Glossary

- **Organ parameter**: a measurable structural/functional quantity of an organ
  (e.g. LV mass index, hippocampal volume), with a unit and physiological bounds.
- **Intervention**: a drug class or lifestyle change (e.g. ACE inhibitor,
  aerobic exercise).
- **Effect**: the cohort-level change an intervention produces on one organ
  parameter, expressed as a distribution (mean + 95% CI) with a citation.
- **Evidence grade**: A (meta-analysis / multiple RCTs), B (single RCT or
  consistent observational), C (mechanistic / weak / indirect).
- **Combination**: the rule set that merges multiple effects on the same
  parameter without naive addition.

## Requirements

### Requirement 1 — Organ state model

**User story:** As a COR Studio integrator, I want a typed organ state model
with units and physiological bounds, so that simulation inputs and outputs are
well-defined and cannot drift out of plausible physiological range.

#### Acceptance Criteria
1. WHEN the library is imported THEN it SHALL expose a heart model and a brain
   model, each as a set of named parameters with id, label, unit, and
   `[min, max]` physiological bounds.
2. The heart model SHALL include at minimum: LV mass index (LVMI), LV wall
   thickness, ejection fraction (EF), and left atrial volume index.
3. The brain model SHALL include at minimum: hippocampal volume, cortical
   thickness, and lateral ventricular volume.
4. WHEN any computed parameter value falls outside its bounds THEN the engine
   SHALL clamp it to the nearest bound AND record a warning.
5. Every parameter SHALL declare a `direction` (whether higher is better,
   worse, or neutral) for downstream display, without affecting math.

### Requirement 2 — Intervention catalog

**User story:** As a clinician-facing tool author, I want a registry of
interventions with metadata, so I can present only valid, well-described
options and respect contraindications and duplicate-class rules.

#### Acceptance Criteria
1. The catalog SHALL store, per intervention: id, human label, kind
   (`drug` | `lifestyle`), target organ(s), therapeutic class (for
   mutual-exclusion), contraindications, evidence grade, and the population the
   effect was measured in.
2. WHEN two interventions share the same `exclusiveClass` (e.g. two
   renin-angiotensin inhibitors) THEN the engine SHALL treat them as mutually
   exclusive and emit a warning rather than stacking their effects.
3. The catalog SHALL be queryable by organ.
4. v0.1 SHALL include the heart and brain interventions named in the design.

### Requirement 3 — Cited effects, no invented numbers

**User story:** As a reviewer, I want every numeric effect to carry a citation
and evidence grade, so that no value in the library is fabricated.

#### Acceptance Criteria
1. Each effect SHALL be a distribution: mean and 95% confidence interval
   `[low, high]`, on a named organ parameter, in that parameter's unit (or an
   explicit relative/percent form).
2. Each effect SHALL carry a citation: author(s), year, journal, and DOI or
   trial name.
3. IF an effect cannot be sourced from a published trial or meta-analysis THEN
   it SHALL be marked `verified: false` with a `TODO` note AND SHALL NOT
   contribute a fabricated mean; unverified effects SHALL be excluded from the
   default computation and surfaced as warnings.
4. The engine SHALL NOT invent or interpolate numbers that are not derived from
   a cited source.
5. Any effect that is illustrative rather than directly measured SHALL be
   labeled `illustrative: true`.

### Requirement 4 — Combination logic (not additive)

**User story:** As a modeler, I want combined effects to use diminishing
returns and cited interaction terms, so the result does not naively sum
overlapping mechanisms.

#### Acceptance Criteria
1. WHEN multiple effects act on the same parameter THEN the engine SHALL
   combine them multiplicatively in relative-change space (diminishing
   returns), NOT by simple addition.
2. The combination SHALL be **order-independent**: toggling the same set of
   interventions in any order SHALL yield the same central estimate (within
   floating-point tolerance) and the same Monte Carlo result for a fixed seed.
3. WHEN a cited pairwise interaction term exists for two interventions THEN the
   engine SHALL apply it; absent a cited interaction, no interaction term SHALL
   be invented.
4. The engine SHALL NOT double-count: applying the same intervention twice SHALL
   be equivalent to applying it once, with a warning.
5. The engine SHALL cap total relative change per parameter to a configured
   physiological limit and record a warning when the cap binds.

### Requirement 5 — Uncertainty propagation (seeded Monte Carlo)

**User story:** As an analyst, I want a likely/best/worst range, so output
reflects the uncertainty in the underlying trial estimates.

#### Acceptance Criteria
1. The engine SHALL propagate each effect's 95% CI via Monte Carlo sampling.
2. The Monte Carlo SHALL be deterministic given a seed: the same inputs and
   seed SHALL produce identical outputs across runs and machines.
3. The engine SHALL report, per parameter, a central ("likely") value and a
   low/high range (default 2.5th / 97.5th percentiles → "best"/"worst"
   depending on parameter direction).
4. The number of iterations SHALL be configurable with a documented default.

### Requirement 6 — Versioned JSON contract

**User story:** As the COR Studio app, I want a stable, validated JSON schema,
so I can render results without guessing the shape.

#### Acceptance Criteria
1. The contract SHALL be defined with zod and SHALL carry a `schemaVersion`.
2. The contract SHALL contain: organ, parameters (id, baseline, value, low,
   high, unit), appliedInterventions, warnings, and provenance (citations +
   engine version + seed + iterations).
3. Every emitted contract SHALL validate against the schema.
4. The contract SHALL embed the cohort-level, not-a-prediction notice.

### Requirement 7 — CLI

**User story:** As a developer, I want a CLI to run a simulation from a
baseline JSON file, so I can test the engine without writing code.

#### Acceptance Criteria
1. The CLI SHALL support:
   `cor-outlook simulate --organ heart --baseline patient.json --on ace_inhibitor,exercise_150min`.
2. The CLI SHALL accept `--seed` and `--iterations` options.
3. The CLI SHALL print the validated JSON contract to stdout and warnings to
   stderr.
4. The CLI SHALL exit non-zero on invalid organ, unknown intervention, or
   invalid baseline.

### Requirement 8 — Safety, privacy, quality gates

**User story:** As a maintainer, I want strict hygiene, so the repo stays
accurate, private-data-free, and releasable.

#### Acceptance Criteria
1. The repo SHALL contain no secrets and no patient data; baselines in-repo are
   synthetic examples labeled as such.
2. TypeScript SHALL be in strict mode; ESLint SHALL pass; `npm test` SHALL pass
   before every commit.
3. `docs/evidence.md` SHALL list every effect with its source and evidence
   grade, and SHALL enumerate interventions that could not be sourced.
4. Output SHALL always state it is cohort-level decision support, not an
   individual prediction.
