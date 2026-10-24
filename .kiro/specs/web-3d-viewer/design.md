# Design — web-3d-viewer

## Overview

Client-side React (Next.js App Router, static export) + react-three-fiber. The
page computes two engine trajectories (untreated, treated) with a fixed seed,
renders the selected year's state in 3D, and shows a parameter table. No server
routes, env vars, or network calls. The engine is imported from source via the
existing `@engine` alias.

```
catalog -> toggle buttons (Drugs|Lifestyle)
baseline + selected ids -> trajectory() x1  (treated series carries untreated too)
year slider (0..5) -> pick TrajectoryPoint[year]
   -> 3D deformation (heart wall / brain regions)   -> side-by-side | ghost
   -> parameter table (baseline -> y5, best/worst, contributors, warnings)
```

## Dependencies

Add to `web/package.json`: `three`, `@react-three/fiber`, `@react-three/drei`.
These bundle into the static export (client components). Pinned versions.
`three` is also added to the engine-source webpack resolution (already prefers
`web/node_modules`).

## Data flow / wiring (`web/app/lib/`)

- `wiring.ts` (existing) keeps `SYNTHETIC_BASELINES`, `buildButtons`,
  `buttonsByKind`, `parameterLabels`, `ORGANS`, `DEMO_SEED`, `DEMO_ITERATIONS`.
- `trajectoryView.ts` (new): `computeTrajectory(organ, selectedIds, seed)` wraps
  the engine `trajectory()`; helpers to pick a year's point per parameter and to
  derive per-parameter relative change vs baseline (for 3D scaling).
- Heart deformation inputs: `lv_wall_thickness` (primary) and `lvmi` ratios at
  the chosen year; brain: `hippocampal_volume`, `ventricular_volume`,
  `cortical_thickness` ratios.

## 3D components (`web/app/scene/`)

- `Viewer3D.tsx` — client component. Detects WebGL; if absent renders
  `<Fallback/>` (message + keeps table working). Hosts the r3f `<Canvas>`.
- `useWebGL.ts` — returns whether a WebGL context can be created.
- `HeartMesh.tsx` / `BrainMesh.tsx` — load the glb via drei `useGLTF`
  (`/models/heart.glb`, `/models/brain.glb`), clone geometry, and apply a
  deterministic deformation for a given scenario+year:
  - **Heart**: displace `heart_tissue` vertices along their normals by a factor
    proportional to the LV-wall-thickness ratio (treated vs untreated). Honest:
    the displacement is a uniform wall-normal offset scaled by the engine ratio,
    labelled illustrative. Coronary/vein nodes are left unscaled.
  - **Brain**: three region scalings about the mesh centroid — a radial scale
    for cortical thickness (thin inward), a hippocampal region scale, and a
    ventricular expansion — each driven by its engine ratio. Region selection
    is by vertex position heuristics (central vs peripheral) since the demo glb
    is a single surface; this is labelled illustrative in the UI.
- `SceneLayout.tsx` — renders either two canvases (side-by-side: untreated
  left, treated right) or one canvas with both meshes (ghost overlay: treated
  opaque, untreated translucent `transparent opacity≈0.25`).

Deformation is pure and deterministic given (organ, ratios, year). Geometry is
cloned per render-scenario so the two scenarios never share mutated buffers.

## View state

Local React state in `page.tsx` (no store needed):
`organ`, `selectedByOrgan: Record<OrganId,string[]>`, `year (0..5)`,
`viewMode: "side-by-side" | "ghost"`, plus `suggestedInterventionIds` read from
the `?suggest=a,b` URL param (and overridable by prop).

## Parameter table (`web/app/components/`)

`ParameterTable.tsx`: one row per parameter — baseline, untreated y(sel),
treated y(sel), each with best/worst (low–high) from the trajectory point;
contributors (verified interventions); a "modelled time course" chip when the
treated series is ramped; direction-aware good/bad colouring. Engine warnings
list below. All numeric, tabular, AA contrast.

## AS card (`web/app/components/AorticStenosisCard.tsx`)

Static info card shown via an "Aortic stenosis" selector (not an organ toggle);
no intervention buttons; cites ACC/AHA 2020 (Otto CM et al., Circulation 2021;
143:e72–e227, DOI 10.1161/CIR.0000000000000923).

## Assistant hook

`suggestedInterventionIds` (string[]). Buttons whose id is in the set get a
highlighted outline and `aria-describedby` note "suggested". Parsed from
`?suggest=` CSV. No chat UI.

## Accessibility & fallback

- Dark theme mirrors the existing palette; every text token ≥ 4.5:1.
- All controls are real `<button>`/`<input type=range>` with labels; toggles
  expose `aria-pressed`; popovers use `aria-expanded`/`role=region`.
- No-WebGL: `useWebGL` false → fallback card; table and toggles remain usable.

## Static export integrity

`output: "export"` stays. `useGLTF` fetches `/models/*.glb` at runtime
(client), which works for static hosting. A `useGLTF.preload` is called. No SSR
of the canvas (`dynamic(() => ..., { ssr: false })` or a mounted guard).

## Testing

- Engine: `tests/trajectory.test.ts` (done).
- UI wiring: `web/app/lib/trajectoryView.test.ts` — year selection, treated vs
  untreated direction, order independence at the UI layer, ratios for 3D.
- E2E: `web/tests/e2e/viewer.spec.ts` (Playwright) — load, toggle an
  intervention, switch Heart/Brain, switch side-by-side/ghost, assert canvases;
  a WebGL-disabled context asserts the fallback message.
