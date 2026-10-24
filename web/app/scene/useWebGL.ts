"use client";

import { useEffect, useState } from "react";

/**
 * Detect whether a WebGL context can be created. Returns null while unknown
 * (first client render), then true/false. Used to show a graceful fallback
 * instead of crashing the 3D canvas.
 */
export function useWebGL(): boolean | null {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      setOk(Boolean(gl));
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}
