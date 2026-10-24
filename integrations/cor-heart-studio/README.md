# Diagnosis engine (from COR Heart Studio)

Owner: @HyorinmaruK. This folder holds the **guideline-based diagnosis engine**, its tests and its case set, as built
and deployed in [Bakdaulet-omeraiuly/cor-heart-studio](https://github.com/Bakdaulet-omeraiuly/cor-heart-studio). It
sits next to `cor-outlook-engine` because the two are complementary:

| | `cor-outlook-engine` (this repo, `src/`) | diagnosis engine (this folder) |
|---|---|---|
| Question it answers | "What happens to the organ under these interventions?" (cohort-level outlook) | "What does this record show today, by guideline?" (grades, differential, missing data, red flags) |
| Input | baseline parameters + interventions | a COR Heart Studio patient record |
| Output | versioned outlook contract | `Assessment` with evidence (record field, value, rule id, guideline DOI) |

**Boundary:** clinician decision support on synthetic and open data. It is not a medical device and gives no
diagnosis. Code computes every number; the LLM chat only explains.

## Layout

Paths mirror `cor-heart-studio`, so the folder can be dropped back into that repo unchanged:

| Path | Contents |
|---|---|
| `src/domain/diagnosis/` | `assess(record) → Assessment`: valves, LV, chambers, coronaries (CAD-RADS 2.0), ECG/QTc, brain, differential |
| `tests/unit/diagnosis/` | boundary unit tests, contract and injection tests, 13 property-based tests, case runner |
| `tests/assistant/cases/` | 94 JSON cases (format in its `README.md`) |
| `docs/research/diagnosis-engine.md` | criteria with DOIs, conflict handling, differential logic, verification pass |
| `.kiro/` | steering and hooks used while building it in COR Heart Studio |
| `KIRO.md` | how Kiro was used (hackathon write-up) |

The Kiro spec is at the repository root in [`/.kiro/specs/diagnosis-engine/`](../../.kiro/specs/diagnosis-engine/).
Its file paths are relative to this folder.

## Running it

The engine imports COR Heart Studio's domain modules: the record schema and normalization (Zod 4), `coronary.ts`,
`ecg.ts` and `outlook/`. Run and test it inside `cor-heart-studio`, where it is wired into the assistant and deployed:

```bash
git clone https://github.com/Bakdaulet-omeraiuly/cor-heart-studio.git && cd cor-heart-studio
npm ci && npm test        # includes tests/unit/diagnosis (unit + property + 94 cases)
```

This folder is excluded from this library's build, lint and tests (`tsconfig.json` covers `src/` only; `vitest` covers
`tests/`; `eslint.config.js` ignores `integrations/**`). It does not change the `cor-outlook-engine` package.
