# Implementation Plan — cor-outlook-engine

- [ ] 1. Utilities: seeded RNG + numeric helpers
  - `util/rng.ts`: splitmix32 uniform stream, Box–Muller normal, percentile.
  - Pure, no global state.
  - _Requirements: 5.2_

- [ ] 2. Organ state model
  - `organ/types.ts`, `organ/heart.ts`, `organ/brain.ts`, `organ/index.ts`.
  - Parameters with id/label/unit/bounds/direction; clamp helper + warning.
  - _Requirements: 1.1–1.5, 4.5_

- [ ] 3. Intervention catalog
  - `catalog/types.ts`, `catalog/index.ts`. Registry, query-by-organ,
    exclusiveClass for mutual exclusion.
  - _Requirements: 2.1–2.4_

- [ ] 4. Effects (one file per intervention), cited
  - Heart: ace_inhibitor_arb, beta_blocker, statin, sglt2_inhibitor,
    aerobic_exercise, sodium_reduction, weight_loss, smoking_cessation.
  - Brain: aerobic_exercise, bp_control, mediterranean_diet, sleep,
    smoking_cessation.
  - Every number cited; unsourced → verified:false + TODO.
  - _Requirements: 3.1–3.5_

- [ ] 5. Combination + interactions + Monte Carlo
  - `combine/interactions.ts` (cited-only, empty default),
    `combine/combine.ts` (dedupe, mutual exclusion, multiplicative compose,
    cap, clamp, seeded MC).
  - _Requirements: 4.1–4.5, 5.1–5.4_

- [ ] 6. Versioned zod contract + builder
  - `contract/schema.ts`, `contract/build.ts`. Validate before return.
  - _Requirements: 6.1–6.4_

- [ ] 7. Public API
  - `index.ts`: simulate(), listInterventions(), getOrganModel().
  - _Requirements: 1–6_

- [ ] 8. CLI
  - `cli/index.ts` with util.parseArgs; simulate subcommand; exit codes.
  - _Requirements: 7.1–7.4_

- [ ] 9. Tests (vitest)
  - single effect, order-independence, no double-count, bounds/cap,
    deterministic seed, schema validation.
  - _Requirements: all, esp. 4.2, 4.4, 5.2, 6.3_

- [ ] 10. Docs
  - `docs/evidence.md` (effect table + unsourced list), README with notice.
  - _Requirements: 8.3, 8.4_

- [ ] 11. Quality gates
  - `npm run build`, `npm run lint`, `npm test` all green.
  - _Requirements: 8.2_

- [ ] 12. Repo
  - git init, commit under user identity (no Co-Authored-By),
    `gh repo create --private --source=. --push`.
  - _Requirements: 8.1_
