"use client";

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

useGLTF.preload("/models/heart.glb");

/**
 * Heart tissue mesh, deformed to illustrate an LV wall-thickness change.
 *
 * HONEST DEFORMATION: we displace the `heart_tissue` surface vertices along
 * their own normals by a uniform offset proportional to (wallRatio - 1),
 * scaled by the mesh's radius. This is an ILLUSTRATIVE representation of the
 * engine's cohort-level LV-wall-thickness ratio, not a biomechanical model.
 * Coronary/vein nodes are not scaled. Geometry is cloned so scenarios never
 * share mutated buffers.
 */
export function HeartMesh({
  wallRatio,
  color,
  opacity = 1,
}: {
  wallRatio: number;
  color: string;
  opacity?: number;
}) {
  const { nodes } = useGLTF("/models/heart.glb") as unknown as {
    nodes: Record<string, THREE.Mesh>;
  };

  const geometry = useMemo(() => {
    const src = nodes["heart_tissue"];
    if (!src?.geometry) return null;
    const geo = src.geometry.clone();
    geo.computeVertexNormals();
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const nor = geo.attributes.normal as THREE.BufferAttribute;

    // Mesh radius for scaling the offset into mesh units.
    geo.computeBoundingSphere();
    const radius = geo.boundingSphere?.radius ?? 6;
    // Wall thickening of +X% maps to an outward normal offset; cap for sanity.
    const offset = THREE.MathUtils.clamp((wallRatio - 1) * radius * 0.5, -radius * 0.3, radius * 0.3);

    for (let i = 0; i < pos.count; i++) {
      const nx = nor.getX(i);
      const ny = nor.getY(i);
      const nz = nor.getZ(i);
      pos.setXYZ(
        i,
        pos.getX(i) + nx * offset,
        pos.getY(i) + ny * offset,
        pos.getZ(i) + nz * offset,
      );
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [nodes, wallRatio]);

  if (!geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        metalness={0.05}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity >= 1}
      />
    </mesh>
  );
}
