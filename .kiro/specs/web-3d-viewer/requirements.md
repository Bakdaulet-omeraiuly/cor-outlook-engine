# Requirements — web-3d-viewer

## Introduction

Upgrade the `/web` demo of `cor-outlook-engine` from a numbers-only page into a
3D treatment-scenario viewer. A clinician toggles drug/lifestyle interventions
and sees, in 3D, how an organ (Heart or Brain) looks in 5 years **with** vs
**without** the selected interventions. Everything is cohort-level, evidence
-based, and client-side. The app remains a static export deployable on Vercel.

> All outputs are cohort-level decision support, NOT a prediction for an
> individual patient, and NOT a medical device.

## Requirements

### Requirement 1 — Horizon and two scenarios
**User story:** As a clinician, I want a 5-year outlook with and without
treatment so I can compare trajectories.
#### Acceptance Criteria
1. The horizon SHALL be 5 years with a year slider 0–5, default 5.
2. The app SHALL always compute two scenarios: "untreated" (natural course) and
   "with selected interventions", from the engine `trajectory()` API.
3. Changing the year SHALL update both the 3D view and the parameter table.

### Requirement 2 — Intervention toggles from the catalog
**User story:** As a clinician, I want evidence-graded buttons grouped by kind.
#### Acceptance Criteria
1. Buttons SHALL be built from the engine catalog, grouped Drugs | Lifestyle.
2. Toggling SHALL be cumulative and order-independent (the engine guarantees
   this); combination logic stays in the engine.
3. An intervention with no verified effect for the selected organ SHALL be
   disabled with a visible reason.
4. Each button SHALL show its evidence grade and a ⓘ with citation + population.

### Requirement 3 — Cited time dimension
**User story:** As a reviewer, I want the time course to be honest.
#### Acceptance Criteria
1. Natural-course rates SHALL come from cited sources (brain: Barnes 2009,
   de Leon 1989, Fjell 2009; heart untreated: "no progression modelled").
2. Where only a total follow-up effect exists, it SHALL be applied with a
   documented linear ramp and labelled "modelled time course" in the UI.
3. No number without a citation; unverified effects stay excluded.

### Requirement 4 — 3D views
**User story:** As a clinician, I want to see the organ change in 3D.
#### Acceptance Criteria
1. The viewer SHALL support organ Heart | Brain.
2. Two views via a switch, both always available:
   (a) side-by-side — untreated left, treated right;
   (b) ghost overlay — treated solid, untreated translucent.
3. Heart SHALL drive LV wall thickness / LV mass from engine output, deforming
   the wall along surface normals with honest per-region scaling.
4. Brain SHALL scale hippocampus / ventricles / cortical thickness from engine
   output (scale about centroid / move along normals).
5. The 3D SHALL NOT crash when WebGL is unavailable; it SHALL show a fallback
   message and the parameter table SHALL still work.
6. Meshes SHALL be open, licence-cleared assets (CC BY 4.0 / MIT); a visible
   Attributions section SHALL credit them. No real patient DICOM.

### Requirement 5 — Parameter table and provenance
#### Acceptance Criteria
1. Beside the 3D, a table SHALL show baseline → year-5 value for BOTH scenarios
   with the best/worst range, contributing interventions, and engine warnings
   (excluded/unverified, mutual exclusion).
2. A synthetic-patient label SHALL remain visible.
3. One line on screen, details behind ⓘ (per the existing design language).
4. A persistent notice SHALL state cohort-level / not-an-individual-prediction /
   not-a-medical-device.

### Requirement 6 — Aortic stenosis card
#### Acceptance Criteria
1. AS SHALL NOT have intervention buttons.
2. An info card SHALL state: "No proven medication slows aortic stenosis
   progression; treatment is AVR/TAVI (ACC/AHA 2020)" with the citation.

### Requirement 7 — Assistant hook
#### Acceptance Criteria
1. The app SHALL accept `suggestedInterventionIds` (URL param and/or prop) that
   visually highlights the matching buttons.
2. The chat assistant itself SHALL NOT be built here.

### Requirement 8 — Quality
#### Acceptance Criteria
1. Engine unit tests (time dimension, order independence, ranges, determinism)
   and UI data-wiring tests SHALL pass; a Playwright smoke test SHALL cover
   toggling + both 3D views + the WebGL fallback.
2. `typecheck`, `lint`, unit tests, and `next build` SHALL pass.
3. The UI SHALL meet WCAG AA contrast and be keyboard accessible; it SHALL work
   on a laptop screen.
4. README and docs/evidence.md SHALL list every new number + citation and the
   effects excluded as unverified.
