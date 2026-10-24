"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment, Html } from "@react-three/drei";
import type { OrganId, TrajectoryResult } from "@engine";
import { useWebGL } from "./useWebGL";
import { HeartMesh } from "./HeartMesh";
import { BrainMesh } from "./BrainMesh";
import { heartRatios, brainRatios, type Scenario } from "../lib/trajectoryView";

export type ViewMode = "side-by-side" | "ghost";

const TREATED_COLOR = "#7ee2b8";
const UNTREATED_COLOR = "#e8836b";

function OrganContent({
  organ,
  res,
  scenario,
  opacity,
  year,
}: {
  organ: OrganId;
  res: TrajectoryResult;
  scenario: Scenario;
  opacity: number;
  year: number;
}) {
  const color = scenario === "treated" ? TREATED_COLOR : UNTREATED_COLOR;
  if (organ === "heart") {
    const r = heartRatios(res, scenario, year);
    return <HeartMesh wallRatio={r.wallThickness} color={color} opacity={opacity} />;
  }
  const r = brainRatios(res, scenario, year);
  return (
    <BrainMesh
      cortexRatio={r.cortex}
      hippocampusRatio={r.hippocampus}
      ventriclesRatio={r.ventricles}
      color={color}
      opacity={opacity}
    />
  );
}

function Rig({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <Canvas
      camera={{ position: [0, 6, 26], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ background: "#050608", borderRadius: 8 }}
      aria-label={label}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 12, 10]} intensity={1.1} />
      <directionalLight position={[-8, -4, -6]} intensity={0.35} />
      <Suspense
        fallback={
          <Html center style={{ color: "#a2aab5", font: "12px sans-serif" }}>
            Loading mesh…
          </Html>
        }
      >
        {children}
        <Environment preset="city" />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={14} maxDistance={48} />
    </Canvas>
  );
}

export function Fallback({ reason }: { reason: string }) {
  return (
    <div className="webgl-fallback" role="status" data-testid="webgl-fallback">
      <strong>3D view unavailable</strong>
      <p>{reason}</p>
      <p>The parameter table on the right still shows the full outlook.</p>
    </div>
  );
}

export function Viewer3D({
  organ,
  res,
  year,
  viewMode,
}: {
  organ: OrganId;
  res: TrajectoryResult;
  year: number;
  viewMode: ViewMode;
}) {
  const webgl = useWebGL();

  if (webgl === false) {
    return <Fallback reason="Your browser or device does not have WebGL enabled." />;
  }
  if (webgl === null) {
    return <div className="viewer-loading" aria-hidden="true" />;
  }

  if (viewMode === "side-by-side") {
    return (
      <div className="viewer-split" data-testid="viewer-side-by-side">
        <figure>
          <figcaption>Untreated (natural course)</figcaption>
          <Rig label={`${organ} untreated at year ${year}`}>
            <OrganContent organ={organ} res={res} scenario="untreated" opacity={1} year={year} />
          </Rig>
        </figure>
        <figure>
          <figcaption>With selected interventions</figcaption>
          <Rig label={`${organ} treated at year ${year}`}>
            <OrganContent organ={organ} res={res} scenario="treated" opacity={1} year={year} />
          </Rig>
        </figure>
      </div>
    );
  }

  // ghost overlay: treated solid, untreated translucent, in one scene.
  return (
    <div className="viewer-single" data-testid="viewer-ghost">
      <figure>
        <figcaption>Ghost overlay — treated solid, untreated translucent</figcaption>
        <Rig label={`${organ} ghost overlay at year ${year}`}>
          <OrganContent organ={organ} res={res} scenario="untreated" opacity={0.25} year={year} />
          <OrganContent organ={organ} res={res} scenario="treated" opacity={1} year={year} />
        </Rig>
      </figure>
    </div>
  );
}
