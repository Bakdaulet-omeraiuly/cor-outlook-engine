# Design — cor-outlook-engine

## Overview

A pure, deterministic TypeScript library. No network, no DOM, no simulation
dependency. One runtime dependency: `zod` (contract validation). The public
API takes an organ id, a baseline parameter map, and a set of intervention
ids, and returns a validated JSON contract with central + uncertainty ranges.

```
baseline + interventions ──► resolve catalog ──► collect effects
      ──► combine (relative space, diminishing returns, interactions)
      ──► Monte Carlo over CIs (seeded) ──► clamp to bounds ──► contract
```

## Module layout

```
src/
  organ/        Parameter definitions, organ models, bounds, clamping.
  catalog/      Intervention registry + queries + mutual-exclusion classes.
  effects/      One file per intervention. Cited effect distributions.
    heart/      ace_inhibitor_arb, beta_blocker, statin, sglt2_inhibitor,
                aerobic_exercise, sodium_reduction, weight_loss, smoking_cessation
    brain/      aerobic_exercise, bp_control, mediterranean_diet, sleep,
                smoking_cessation
  combine/      Combination math + seeded Monte Carlo + interaction terms.
  contract/     zod schema (versioned) + builder.
  cli/          Argument parsing + simulate command.
  util/         Seeded RNG, normal sampling, numeric helpers.
  index.ts      Public API: simulate(), listInterventions(), getOrganModel().
```

## Core data model

### Organ parameter
```ts
type Direction = "higher-better" | "higher-worse" | "neutral";

interface OrganParameter {
  id: string;            // e.g. "lvmi"
  label: string;         // "LV mass index"
  unit: string;          // "g/m^2"
  bounds: [number, number];
  direction: Direction;
}
```
Organ model = `{ id: "heart" | "brain"; parameters: OrganParameter[] }`.

### Effect

Effects are expressed as **relative multiplicative change** on a parameter,
because trial results for structural regression are reported as percent / mean
change and compose better multiplicatively (diminishing returns).

```ts
interface EffectDistribution {
  // relative change: value_new = value_old * (1 + delta)
  // delta is a fraction; -0.11 = 11% reduction.
  deltaMean: number;
  delta95: [number, number];   // CI on delta, same units
}

interface Citation {
  authors: string;
  year: number;
  journal: string;
  doi?: string;
  trial?: string;
}

interface ParameterEffect {
  parameterId: string;
  dist: EffectDistribution;
  citation: Citation;
  evidenceGrade: "A" | "B" | "C";
  population: string;
  verified: boolean;       // false => excluded from default compute + warned
  illustrative?: boolean;  // true => not a directly measured value
  note?: string;           // TODO / caveat
}

interface InterventionEffects {
  interventionId: string;
  effects: ParameterEffect[];
}
```

### Intervention (catalog entry)
```ts
interface Intervention {
  id: string;
  label: string;
  kind: "drug" | "lifestyle";
  organs: OrganId[];
  exclusiveClass?: string;   // interventions sharing this are mutually exclusive
  contraindications: string[];
  evidenceGrade: "A" | "B" | "C";
  population: string;
}
```

## Combination algorithm

Let a parameter have baseline `b`. For each applied, verified intervention `i`
with a cited effect on that parameter, sample a relative delta `d_i`. The
combined multiplier is:

```
M = Π (1 + d_i)          // multiplicative => diminishing returns
value = b * M
```

Multiplicative composition in `(1 + d)` space is the key to all three required
behaviors:

- **Diminishing returns / no naive addition.** Two 10% reductions give
  `0.9 * 0.9 = 0.81` (19% total), not 20%.
- **Order independence.** Multiplication is commutative, so toggling order does
  not change the product. Verified by test.
- **No double counting.** The applied set is de-duplicated by intervention id
  before combination, and by `exclusiveClass` (only the first of a class is
  kept; others produce a mutual-exclusion warning).

### Interaction terms

If a cited pairwise interaction exists for an unordered pair `{i, j}` both
present, an extra multiplier `(1 + d_ij)` is applied once. Interaction terms
live in `combine/interactions.ts`, each with its own citation, and are applied
only when a cited source exists. v0.1 ships **no** invented interaction terms;
the table is empty-by-default and documented as such. Absence of an interaction
term = assume independence (the honest default).

### Caps and clamping

After computing `value`, clamp to the parameter's physiological bounds. Also
cap the aggregate relative change `|M - 1|` to a configured maximum
(default 0.6) so a long stack cannot drive a parameter to an implausible
multiple; a bound/cap hit records a warning.

## Uncertainty propagation (seeded Monte Carlo)

Each effect's `delta95` is treated as a 95% CI of a normal distribution on the
delta: `sd = (high - low) / (2 * 1.959964)`, `mean = deltaMean`. For each of N
iterations (default 2000):

1. Sample `d_i ~ Normal(mean_i, sd_i)` for every applied effect, using a
   seeded RNG (Box–Muller on a Mulberry32/ splitmix32 uniform stream).
2. Apply interaction samples likewise.
3. Compute the clamped parameter value.

Report per parameter:
- `value` = central estimate computed from the **means** (deterministic, not a
  sample) so the "likely" number is stable and reproducible.
- `low` / `high` = 2.5th / 97.5th percentile of the N samples.

Determinism: the RNG is seeded from the CLI/API `seed` (default `1`). The
sampling order is fixed (sorted by intervention id then parameter id) so the
stream assignment is independent of input order — preserving order independence
even in the stochastic path.

### Seeded RNG

`util/rng.ts` implements `splitmix32(seed)` → uniform `[0,1)`, and
`normal(rng, mean, sd)` via Box–Muller. Pure, no global state; each simulate()
call constructs its own RNG instance.

## JSON contract (zod, versioned)

```ts
const SCHEMA_VERSION = "0.1.0";

ContractSchema = {
  schemaVersion: string,
  engineVersion: string,
  organ: "heart" | "brain",
  notice: string,              // cohort-level, not-a-prediction
  parameters: Array<{
    id, label, unit,
    baseline: number,
    value: number,             // central (from means)
    low: number, high: number, // MC percentiles
    direction: Direction,
    clamped: boolean
  }>,
  appliedInterventions: Array<{ id, label, kind, evidenceGrade }>,
  warnings: string[],
  provenance: {
    seed: number,
    iterations: number,
    citations: Array<Citation & { interventionId, parameterId, evidenceGrade, verified }>,
    excludedUnverified: string[]
  }
}
```

The builder validates with zod before returning; a validation failure is a bug
and throws.

## Public API

```ts
simulate(input: {
  organ: OrganId;
  baseline: Record<string, number>;   // parameterId -> value
  interventions: string[];
  seed?: number;        // default 1
  iterations?: number;  // default 2000
}): Contract

listInterventions(organ?: OrganId): Intervention[]
getOrganModel(organ: OrganId): OrganModel
```

## CLI

`cor-outlook simulate --organ heart --baseline patient.json --on a,b,c
[--seed N] [--iterations N]`. Reads baseline JSON `{ "lvmi": 120, ... }`,
prints contract JSON to stdout, warnings to stderr, exits non-zero on bad
input. Implemented with Node's built-in `util.parseArgs` (no dependency).

## Error handling

- Unknown organ / intervention → thrown `Error` (CLI exit 1).
- Baseline parameter not in organ model → warning, ignored.
- Missing baseline parameter that an effect targets → warning, that effect
  skipped for that parameter.
- Unverified effects → excluded, listed in `provenance.excludedUnverified` and
  in `warnings`.

## Testing strategy

Vitest. Covered: single-effect correctness vs. hand math; order-independence
(permute toggle order → identical output); no double-counting (dup id and dup
exclusiveClass); bounds clamping + cap; deterministic seed (two runs identical,
different seeds differ); schema validation (every produced contract parses, and
a corrupted contract fails). Pure functions → no mocks/network.

## Scientific-accuracy guardrails

- No number without a citation in `effects/`.
- Unsourced → `verified: false` + TODO, excluded from math.
- Illustrative values flagged `illustrative: true`.
- `docs/evidence.md` mirrors the effect table and lists unsourced items.
- All composition assumes independence unless a **cited** interaction says
  otherwise.
