import { describe, it, expect } from "vitest";
import {
  computeTrajectory,
  pointAt,
  ratioAt,
  paramById,
  heartRatios,
  brainRatios,
  parseSuggested,
  HORIZON_YEARS,
} from "./trajectoryView";

describe("computeTrajectory wiring", () => {
  it("returns a 0..5 horizon for heart", () => {
    const res = computeTrajectory("heart", []);
    expect(res.horizonYears).toBe(HORIZON_YEARS);
    expect(res.years).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("year 0 equals baseline in both scenarios", () => {
    const res = computeTrajectory("brain", ["aerobic_exercise"]);
    const hip = paramById(res, "hippocampal_volume")!;
    expect(pointAt(hip, "untreated", 0).value).toBeCloseTo(hip.baseline, 6);
    expect(pointAt(hip, "treated", 0).value).toBeCloseTo(hip.baseline, 6);
  });

  it("brain untreated hippocampus shrinks by year 5 (ageing), treated shrinks less with exercise", () => {
    const res = computeTrajectory("brain", ["aerobic_exercise"]);
    const hip = paramById(res, "hippocampal_volume")!;
    const u5 = pointAt(hip, "untreated", 5).value;
    const t5 = pointAt(hip, "treated", 5).value;
    expect(u5).toBeLessThan(hip.baseline);
    expect(t5).toBeGreaterThan(u5); // exercise offsets some ageing loss
  });

  it("heart untreated is flat; treated LVMI falls with ACEi at year 5", () => {
    const res = computeTrajectory("heart", ["ace_inhibitor_arb"]);
    const lvmi = paramById(res, "lvmi")!;
    expect(pointAt(lvmi, "untreated", 5).value).toBeCloseTo(lvmi.baseline, 6);
    expect(pointAt(lvmi, "treated", 5).value).toBeLessThan(lvmi.baseline);
  });
});

describe("ratios for 3D scaling", () => {
  it("heartRatios reflect wall/mass change (<=1 treated for LVH regression)", () => {
    const res = computeTrajectory("heart", ["ace_inhibitor_arb", "sglt2_inhibitor"]);
    const r = heartRatios(res, "treated", 5);
    expect(r.mass).toBeLessThan(1);
    const u = heartRatios(res, "untreated", 5);
    expect(u.mass).toBeCloseTo(1, 6); // flat untreated
  });

  it("brainRatios: ventricles grow (>1), hippocampus/cortex shrink (<1) untreated", () => {
    const res = computeTrajectory("brain", []);
    const u = brainRatios(res, "untreated", 5);
    expect(u.ventricles).toBeGreaterThan(1);
    expect(u.hippocampus).toBeLessThan(1);
    expect(u.cortex).toBeLessThan(1);
  });

  it("ratioAt is 1 at year 0", () => {
    const res = computeTrajectory("brain", []);
    const hip = paramById(res, "hippocampal_volume")!;
    expect(ratioAt(hip, "untreated", 0)).toBeCloseTo(1, 6);
  });
});

describe("order independence at the UI layer", () => {
  it("same selection in different order yields identical parameters", () => {
    const a = computeTrajectory("heart", ["ace_inhibitor_arb", "weight_loss"]);
    const b = computeTrajectory("heart", ["weight_loss", "ace_inhibitor_arb"]);
    expect(JSON.stringify(b.parameters)).toEqual(JSON.stringify(a.parameters));
  });
});

describe("parseSuggested", () => {
  it("parses ?suggest= CSV", () => {
    expect(parseSuggested("?suggest=ace_inhibitor_arb,weight_loss")).toEqual([
      "ace_inhibitor_arb",
      "weight_loss",
    ]);
  });
  it("returns [] when absent", () => {
    expect(parseSuggested("")).toEqual([]);
    expect(parseSuggested("?foo=1")).toEqual([]);
  });
});
