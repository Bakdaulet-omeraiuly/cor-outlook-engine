# Proposal: guideline management options (PR #3, not merged)

Snapshot of branch `engine/management-options` in
[cor-heart-studio PR #3](https://github.com/Bakdaulet-omeraiuly/cor-heart-studio/pull/3), waiting for @kerimku1's
agreement on the `types.ts` change. Paths mirror `cor-heart-studio`. These files **replace** the matching files in the
main mirror (`../../`) once the PR is merged. Until then the main mirror is the source of truth.

Only one option is live (ARNi in HFrEF with NYHA II–III, COR 1 / LOE A). The other catalogue entries stay
`verified: false` until their LOE is confirmed against the guideline table. Details: `docs/research/diagnosis-engine.md` §9.
