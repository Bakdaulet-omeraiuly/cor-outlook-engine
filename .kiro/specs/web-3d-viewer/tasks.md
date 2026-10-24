# Implementation Plan — web-3d-viewer

- [x] 1. Extend engine with cited time-trajectory API + tests _(Req 3)_
- [x] 2. Licence-check + copy open meshes; attributions doc _(Req 4.6)_
- [ ] 3. Add three / @react-three/fiber / @react-three/drei to web deps _(Req 4)_
- [ ] 4. `lib/trajectoryView.ts` wrapping engine trajectory() + year/ratio
      helpers; unit tests _(Req 1, 3, 8)_
- [ ] 5. `scene/useWebGL.ts` + `scene/Viewer3D.tsx` with fallback _(Req 4.5)_
- [ ] 6. `scene/HeartMesh.tsx` + `scene/BrainMesh.tsx` honest deformation _(Req 4.3, 4.4)_
- [ ] 7. `scene/SceneLayout.tsx` side-by-side + ghost overlay _(Req 4.2)_
- [ ] 8. `components/ParameterTable.tsx` baseline→y5 both scenarios + warnings _(Req 5)_
- [ ] 9. `components/AorticStenosisCard.tsx` _(Req 6)_
- [ ] 10. Rebuild `page.tsx`: organ switch, toggles, year slider, view switch,
      suggestedInterventionIds from ?suggest=, persistent notice, attributions _(Req 1,2,5,7)_
- [ ] 11. Playwright e2e: toggle + both views + fallback _(Req 8.1)_
- [ ] 12. README + docs/evidence.md updates _(Req 8.4)_
- [ ] 13. Gates: typecheck, lint, test, next build _(Req 8.2)_
- [ ] 14. Merge to main, push; vercel deploy --prod (cor-outlook-web); curl 200 _(deploy)_
