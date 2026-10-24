import { describe, it, expect } from "vitest";
import {
  trajectory,
  rampFraction,
  EFFECT_RAMP_FOLLOWUP_YEARS,
  DEFAULT_HORIZON_YEARS,
} from "../src/index.js";

const heartBaseline = { lvmi: 135, lv_wall_thickness: 13, ef: 38, lavi: 40 };
const brainBaseline = {
  hippocampal_volume: 6.5,
  cortical_thickness: 2.45,
  ventricular_volume: 34,
};

function paramOf(res: ReturnType<typeof trajectory>, id: string) {
  const p = res.parameters.find((x) => x.id === id);
  if (!p) throw new Error(`no parameter ${id}`);
  return p;
}

describe("trajectory shape and horizon", () => {
  it("returns years 0..horizon (default 5) with a point per year per scenario", () => {
    const res = trajectory({ organ: "heart", baseline: heartBaseline, interventions: [] });
    expect(res.horizonYears).toBe(DEFAULT_HORIZON_YEARS);
    expect(res.years).toEqual([0, 1, 2, 3, 4, 5]);
    for (const p of res.parameters) {
      expect(p.untreated).toHaveLength(6);
      expect(p.treated).toHaveLength(6);
      expect(p.untreated.map((x) => x.year)).toEqual([0, 1, 2, 3, 4, 5]);
    }
  });

  it("honours a custom horizon", () => {
    const res = trajectory({ organ: "brain", baseline: brainBaseline, interventions: [], horizonYears: 3 });
    expect(res.years).toEqual([0, 1, 2, 3]);
    expect(paramOf(res, "hippocampal_volume").untreated).toHaveLength(4);
  });

  it("year 0 equals baseline for both scenarios", () => {
    const res = trajectory({
      organ: "brain",
      baseline: brainBaseline,
      interventions: ["aerobic_exercise"],
    });
    const hv = paramOf(res, "hippocampal_volume");
    expect(hv.untreated[0]!.value).toBeCloseTo(6.5, 6);
    expect(hv.treated[0]!.value).toBeCloseTo(6.5, 6);
  });
});

describe("natural course (untreated) is cited and directional", () => {
  it("brain hippocampus declines under typical ageing (Barnes 2009)", () => {
    const res = trajectory({ organ: "brain", baseline: brainBaseline, interventions: [] });
    const hv = paramOf(res, "hippocampal_volume");
    // -1.41%/year compounded over 5 y
    expect(hv.untreated[5]!.value).toBeCloseTo(6.5 * Math.pow(1 - 0.0141, 5), 5);
    expect(hv.untreated[5]!.value).toBeLessThan(6.5);
    expect(hv.naturalCourseModel).toBe("cited-rate");
  });

  it("brain ventricles enlarge under ageing (de Leon 1989)", () => {
    const res = trajectory({ organ: "brain", baseline: brainBaseline, interventions: [] });
    const vv = paramOf(res, "ventricular_volume");
    expect(vv.untreated[5]!.value).toBeCloseTo(34 * Math.pow(1 + 0.02, 5), 5);
  });

  it("heart untreated is held flat (no progression modelled, not invented)", () => {
    const res = trajectory({ organ: "heart", baseline: heartBaseline, interventions: [] });
    const lvmi = paramOf(res, "lvmi");
    expect(lvmi.naturalCourseModel).toBe("no-progression");
    for (const pt of lvmi.untreated) expect(pt.value).toBeCloseTo(135, 6);
  });
});

describe("ramp assumption and modelled-time-course flag", () => {
  it("rampFraction is 0 at year 0, full at follow-up, linear between", () => {
    expect(rampFraction(0)).toBe(0);
    expect(rampFraction(EFFECT_RAMP_FOLLOWUP_YEARS)).toBe(1);
    expect(rampFraction(EFFECT_RAMP_FOLLOWUP_YEARS / 2)).toBeCloseTo(0.5, 6);
    expect(rampFraction(EFFECT_RAMP_FOLLOWUP_YEARS + 3)).toBe(1); // held after follow-up
  });

  it("treated trajectory is flagged modelledTimeCourse when an effect applies", () => {
    const res = trajectory({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["ace_inhibitor_arb"],
    });
    const lvmi = paramOf(res, "lvmi");
    expect(lvmi.modelledTimeCourse).toBe(true);
    expect(lvmi.contributors).toContain("ace_inhibitor_arb");
  });

  it("treated LVMI at year 5 reflects the full ramped ACEi effect (-11%)", () => {
    const res = trajectory({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["ace_inhibitor_arb"],
    });
    const lvmi = paramOf(res, "lvmi");
    // heart untreated flat => treated y5 = 135 * (1 + (-0.11)*1) = 120.15
    expect(lvmi.treated[5]!.value).toBeCloseTo(135 * 0.89, 4);
    // midpoint year (2.5) isn't sampled; year 2 uses frac 2/5 = 0.4
    expect(lvmi.treated[2]!.value).toBeCloseTo(135 * (1 - 0.11 * 0.4), 4);
  });
});

describe("order independence and determinism", () => {
  it("toggle order does not change the trajectory (central + MC)", () => {
    const a = trajectory({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["ace_inhibitor_arb", "sglt2_inhibitor", "weight_loss"],
      seed: 7,
    });
    const b = trajectory({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["weight_loss", "sglt2_inhibitor", "ace_inhibitor_arb"],
      seed: 7,
    });
    expect(JSON.stringify(b.parameters)).toEqual(JSON.stringify(a.parameters));
  });

  it("same seed reproduces identical bands; different seed differs", () => {
    const run = (seed: number) =>
      trajectory({ organ: "brain", baseline: brainBaseline, interventions: ["aerobic_exercise"], seed, iterations: 400 });
    const a1 = run(3);
    const a2 = run(3);
    const b = run(4);
    const hv = (r: ReturnType<typeof trajectory>) => paramOf(r, "hippocampal_volume").treated[5]!;
    expect(hv(a1).low).toEqual(hv(a2).low);
    expect(hv(a1).high).toEqual(hv(a2).high);
    expect(hv(a1).low).not.toEqual(hv(b).low);
  });
});

describe("ranges and combination semantics", () => {
  it("MC band brackets the central value at every year", () => {
    const res = trajectory({
      organ: "brain",
      baseline: brainBaseline,
      interventions: ["aerobic_exercise"],
      seed: 1,
    });
    for (const p of res.parameters) {
      for (const pt of [...p.untreated, ...p.treated]) {
        expect(pt.low).toBeLessThanOrEqual(pt.value + 1e-6);
        expect(pt.high).toBeGreaterThanOrEqual(pt.value - 1e-6);
      }
    }
  });

  it("combines multiple effects multiplicatively (diminishing returns) at year 5", () => {
    const res = trajectory({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["ace_inhibitor_arb", "sglt2_inhibitor"],
    });
    const lvmi = paramOf(res, "lvmi");
    // full ramp at y5: 135 * 0.89 * 0.87 (NOT 135*(1-0.24))
    expect(lvmi.treated[5]!.value).toBeCloseTo(135 * 0.89 * 0.87, 3);
  });

  it("excludes unverified effects and reports them", () => {
    const res = trajectory({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["statin"],
    });
    const lvmi = paramOf(res, "lvmi");
    // statin lvmi unverified => treated stays at flat untreated baseline
    expect(lvmi.treated[5]!.value).toBeCloseTo(135, 6);
    expect(res.excludedUnverified).toContain("statin:lvmi");
    expect(lvmi.modelledTimeCourse).toBe(false);
  });

  it("no double counting: duplicate id applied once", () => {
    const once = trajectory({ organ: "heart", baseline: heartBaseline, interventions: ["ace_inhibitor_arb"] });
    const twice = trajectory({ organ: "heart", baseline: heartBaseline, interventions: ["ace_inhibitor_arb", "ace_inhibitor_arb"] });
    expect(paramOf(twice, "lvmi").treated[5]!.value).toBeCloseTo(paramOf(once, "lvmi").treated[5]!.value, 10);
    expect(twice.warnings.some((w) => w.toLowerCase().includes("duplicate"))).toBe(true);
  });

  it("mutual exclusion keeps one of a shared class", () => {
    const res = trajectory({ organ: "heart", baseline: heartBaseline, interventions: ["beta_blocker", "beta_blocker"] });
    expect(res.appliedInterventions.filter((a) => a.id === "beta_blocker")).toHaveLength(1);
  });

  it("throws on unknown intervention", () => {
    expect(() => trajectory({ organ: "heart", baseline: heartBaseline, interventions: ["nope"] })).toThrow(/Unknown intervention/);
  });
});
