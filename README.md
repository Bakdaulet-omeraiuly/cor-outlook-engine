# cor-outlook-engine

Pure-TypeScript, **cohort-level** organ-outlook simulation library. It computes
how an organ's modeled parameters change when a clinician toggles a set of
interventions (drug classes + lifestyle changes), one after another, and emits
a versioned JSON contract for a separate 3D viewer (COR Studio).

No UI. No network. No third-party simulation framework. One runtime dependency
(`zod`, for contract validation).

> ⚠️ **Cohort-level decision support, not an individual prediction.**
> Every output is derived from published trial/meta-analysis data at the cohort
> level and carries a notice to that effect. It is **not** a forecast for any
> specific patient and must not be used as one.

## Status and provenance

- **v0.1 research prototype.** Effect sizes come from the published sources
  cited in [`docs/evidence.md`](docs/evidence.md), but have **not** been
  independently verified against the original papers.
- Cohort-level estimates only; not a prediction for an individual patient; not
  a medical device; for clinician decision support only.
- Code was generated with Kiro (Specs under `.kiro/specs`); design and evidence
  review by the author.

## What it does

- Models two organs in v0.1: **heart** (LV mass index, LV wall thickness,
  ejection fraction, LA volume index) and **brain** (hippocampal volume,
  cortical thickness, lateral ventricular volume), each parameter with units
  and physiological bounds.
- Holds an **intervention catalog** with kind, target organ(s), evidence grade,
  measured population, contraindications, and mutual-exclusion classes.
- Stores **cited effect distributions** (mean + 95% CI) — one file per
  intervention. **No number without a citation.** Unsourced effects are marked
  `verified: false` and excluded from computation (never invented).
- **Combines** effects multiplicatively (diminishing returns), order-independent,
  with no double-counting and mutual-exclusion handling, plus cited-only
  pairwise interaction terms.
- **Propagates uncertainty** with a seeded Monte Carlo over each effect's 95%
  CI, reporting a central ("likely") value and a low/high range.
- Emits a **versioned, zod-validated JSON contract**.

## Install / build

```bash
npm install
npm run build      # compile to dist/
npm test           # vitest
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Library usage

```ts
import { simulate } from "cor-outlook-engine";

const contract = simulate({
  organ: "heart",
  baseline: { lvmi: 135, ef: 38 },         // parameterId -> value (units per model)
  interventions: ["ace_inhibitor_arb", "sglt2_inhibitor"],
  seed: 1,          // optional, default 1  (deterministic Monte Carlo)
  iterations: 2000, // optional, default 2000
});

console.log(contract.parameters);   // [{ id, baseline, value, low, high, unit, ... }]
console.log(contract.warnings);     // excluded unverified effects, caps, clamps
console.log(contract.notice);       // cohort-level, not-a-prediction notice
```

## CLI

```bash
# list interventions
node dist/cli/index.js list --organ heart

# simulate (baseline is a JSON object of parameterId -> number)
node dist/cli/index.js simulate \
  --organ heart \
  --baseline examples/heart.synthetic.json \
  --on ace_inhibitor_arb,sglt2_inhibitor,beta_blocker \
  --seed 1 --iterations 2000
```

The contract prints to **stdout**; warnings print to **stderr**; invalid input
exits non-zero. `examples/heart.synthetic.json` is **synthetic** sample data,
not a real patient.

## Combination model (why not additive)

Effects compose as `value = baseline * Π (1 + delta_i)` in relative-change
space. This gives:

- **Diminishing returns** — two −10% effects give −19% (`0.9 × 0.9`), not −20%.
- **Order independence** — multiplication is commutative; the Monte Carlo
  stream is assigned in a fixed id-sorted order, so toggle order never changes
  the result (verified by tests).
- **No double-counting** — duplicate ids and same mutual-exclusion class are
  collapsed with a warning.

The aggregate relative change per parameter is capped (default ±60%) and every
value is clamped to physiological bounds, with warnings when either binds.

## Evidence & provenance

See [`docs/evidence.md`](docs/evidence.md) for the full effect table with
sources and evidence grades, and the list of effects that could **not** be
sourced (and are therefore excluded from computation). Every contract also
embeds its own `provenance` (citations, seed, iterations, excluded-unverified
list).

### Interventions in v0.1

- **Heart:** ACE inhibitor/ARB, beta-blocker, statin, SGLT2 inhibitor, aerobic
  exercise, sodium reduction, weight loss, smoking cessation.
- **Brain:** aerobic exercise, intensive blood-pressure control,
  Mediterranean-type diet, sleep optimization, smoking cessation.

Not every (intervention × parameter) pair has a usable published effect size;
those pairs are excluded and listed in `docs/evidence.md`.

## Scope and limitations

- Cohort-level only; several effects are population-specific (e.g. HFrEF EF
  gains) and applying them outside that population is an extrapolation the
  engine does not police.
- The multiplicative combination is a structured aggregation choice, not a
  trial-measured combined-therapy effect.
- This is decision-support tooling and research scaffolding, **not** a medical
  device and **not** medical advice.

## License

MIT — see [LICENSE](LICENSE).
