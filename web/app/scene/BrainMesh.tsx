"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

useGLTF.preload("/models/brain.glb");

/**
 * Brain mesh deformed to illustrate three cohort-level ratios from the engine:
 * cortical thickness, hippocampal volume, ventricular volume.
 *
 * HONEST / ILLUSTRATIVE: the demo glb is a single cortical surface, so region
 * effects are approximated by vertex-position heuristics about the centroid:
 *  - cortex: radial scale of the whole surface toward the centroid for a
 *    thickness ratio < 1 (atrophy pulls the surface inward).
 *  - hippocampus: medial-inferior central vertices nudged inward for volume
 *    loss (ratio < 1).
 *  - ventricles: deep central vertices pushed outward for enlargement
 *    (ratio > 1), widening the central space.
 * This is explicitly labelled illustrative in the UI; it is NOT a per-structure
 * segmentation deformation. Geometry is cloned per scenario.
 */
export function BrainMesh({
  cortexRatio,
  hippocampusRatio,
  ventriclesRatio,
  color,
  opacity = 1,
}: {
  cortexRatio: number;
  hippocampusRatio: number;
  ventriclesRatio: number;
  color: string;
  opacity?: number;
}) {
  const { nodes } = useGLTF("/models/brain.glb") as unknown as {
    nodes: Record<string, THREE.Mesh>;
  };

  const geometry = useMemo(() => {
    const src = Object.values(nodes).find((n) => (n as THREE.Mesh)?.geometry) as
      | THREE.Mesh
      | undefined;
    if (!src?.geometry) return null;
    const geo = src.geometry.clone();
    geo.computeBoundingSphere();
    const c = geo.boundingSphere?.center ?? new THREE.Vector3();
    const R = geo.boundingSphere?.radius ?? 7;
    const pos = geo.attributes.position as THREE.BufferAttribute;

    const cortexScale = THREE.MathUtils.clamp(cortexRatio, 0.8, 1.2);
    const hippoInward = THREE.MathUtils.clamp(1 - hippocampusRatio, -0.2, 0.2);
    const ventOutward = THREE.MathUtils.clamp(ventriclesRatio - 1, -0.3, 0.6);

    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
      const rel = v.clone().sub(c);
      const dist = rel.length() || 1e-6;
      const dir = rel.clone().multiplyScalar(1 / dist);

      // Cortex: global radial scale about centroid.
      rel.multiplyScalar(cortexScale);

      // Deep-central vertices: ventricular expansion pushes them outward a bit.
      const central = 1 - THREE.MathUtils.clamp(dist / R, 0, 1); // 1 at centre
      rel.add(dir.clone().multiplyScalar(ventOutward * R * 0.15 * central));

      // Medial-inferior region: hippocampal loss nudges inward.
      const inferior = v.y < c.y ? 1 : 0;
      const medial = 1 - THREE.MathUtils.clamp(Math.abs(v.x - c.x) / (R * 0.5), 0, 1);
      rel.sub(dir.clone().multiplyScalar(hippoInward * R * 0.1 * inferior * medial));

      v.copy(c).add(rel);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [nodes, cortexRatio, hippocampusRatio, ventriclesRatio]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        roughness={0.7}
        metalness={0.0}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity >= 1}
        flatShading={false}
      />
    </mesh>
  );
}
