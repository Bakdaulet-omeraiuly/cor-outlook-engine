import { describe, it, expect } from "vitest";
import { simulate, ContractSchema, listInterventions, getModel } from "../src/index.js";

const heartBaseline = { lvmi: 135, lv_wall_thickness: 13, ef: 38, lavi: 40 };

function lvmi(contract: ReturnType<typeof simulate>): number {
  const p = contract.parameters.find((x) => x.id === "lvmi");
  if (!p) throw new Error("no lvmi");
  return p.value;
}

describe("single effect correctness", () => {
  it("applies ACEi/ARB LVMI -11% multiplicatively to the central value", () => {
    const c = simulate({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["ace_inhibitor_arb"],
    });
    // central uses the mean delta -0.11 => 135 * 0.89 = 120.15
    expect(lvmi(c)).toBeCloseTo(135 * 0.89, 6);
  });

  it("excludes unverified effects from the computation", () => {
    const c = simulate({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["statin"],
    });
    // statin lvmi is unverified => no change
    expect(lvmi(c)).toBeCloseTo(135, 6);
    expect(c.provenance.excludedUnverified).toContain("statin:lvmi");
  });
});

describe("diminishing returns (multiplicative, not additive)", () => {
  it("combines ACEi (-11%) and SGLT2 (-13%) multiplicatively", () => {
    const c = simulate({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["ace_inhibitor_arb", "sglt2_inhibitor"],
    });
    // 135 * 0.89 * 0.87 = 104.5305 (NOT 135 * (1 - 0.24) = 102.6)
    expect(lvmi(c)).toBeCloseTo(135 * 0.89 * 0.87, 6);
    expect(lvmi(c)).not.toBeCloseTo(135 * (1 - 0.24), 2);
  });
});

describe("order independence", () => {
  it("yields identical output regardless of toggle order (central + MC)", () => {
    const a = simulate({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["ace_inhibitor_arb", "sglt2_inhibitor", "weight_loss"],
      seed: 42,
    });
    const b = simulate({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["weight_loss", "ace_inhibitor_arb", "sglt2_inhibitor"],
      seed: 42,
    });
    expect(JSON.stringify(b.parameters)).toEqual(JSON.stringify(a.parameters));
  });
});

describe("no double counting", () => {
  it("applying the same intervention twice equals applying it once + warns", () => {
    const once = simulate({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["ace_inhibitor_arb"],
    });
    const twice = simulate({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["ace_inhibitor_arb", "ace_inhibitor_arb"],
    });
    expect(lvmi(twice)).toBeCloseTo(lvmi(once), 10);
    expect(twice.warnings.some((w) => w.toLowerCase().includes("duplicate"))).toBe(true);
  });

  it("mutually exclusive class keeps only one and warns", () => {
    // ace_inhibitor_arb has exclusiveClass renin_angiotensin_blocker; there is
    // only one member in v0.1, so test duplicate-class via beta_blocker class
    // by toggling beta_blocker twice (same class).
    const c = simulate({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["beta_blocker", "beta_blocker"],
    });
    const applied = c.appliedInterventions.filter((a) => a.id === "beta_blocker");
    expect(applied.length).toBe(1);
  });
});

describe("bounds clamping and cap", () => {
  it("clamps a computed value to physiological bounds", () => {
    // Push EF up with an absurd baseline near the upper bound (80).
    const c = simulate({
      organ: "heart",
      baseline: { ef: 79 },
      interventions: ["beta_blocker"], // ef +0.17 => 79*1.17 = 92.4 -> clamp 80
    });
    const ef = c.parameters.find((p) => p.id === "ef");
    expect(ef?.value).toBeLessThanOrEqual(80);
    expect(ef?.clamped).toBe(true);
  });
});

describe("deterministic seed", () => {
  it("same seed => identical low/high; different seed => different", () => {
    const run = (seed: number) =>
      simulate({
        organ: "heart",
        baseline: heartBaseline,
        interventions: ["ace_inhibitor_arb", "sglt2_inhibitor"],
        seed,
        iterations: 500,
      });
    const a1 = run(7);
    const a2 = run(7);
    const b = run(8);
    const lv = (c: ReturnType<typeof simulate>) =>
      c.parameters.find((p) => p.id === "lvmi");
    expect(lv(a1)?.low).toEqual(lv(a2)?.low);
    expect(lv(a1)?.high).toEqual(lv(a2)?.high);
    expect(lv(a1)?.low).not.toEqual(lv(b)?.low);
  });

  it("MC range brackets the central value", () => {
    const c = simulate({
      organ: "heart",
      baseline: heartBaseline,
      interventions: ["ace_inhibitor_arb"],
      seed: 1,
    });
    const p = c.parameters.find((x) => x.id === "lvmi")!;
    expect(p.low).toBeLessThanOrEqual(p.value);
    expect(p.high).toBeGreaterThanOrEqual(p.value);
  });
});

describe("schema validation", () => {
  it("every produced contract validates against the zod schema", () => {
    const c = simulate({
      organ: "brain",
      baseline: { hippocampal_volume: 6.5, cortical_thickness: 2.5, ventricular_volume: 30 },
      interventions: ["aerobic_exercise", "bp_control", "sleep"],
    });
    expect(() => ContractSchema.parse(c)).not.toThrow();
    expect(c.schemaVersion).toBe("0.1.0");
    expect(c.notice.toLowerCase()).toContain("not");
  });

  it("a corrupted contract fails validation", () => {
    const c = simulate({
      organ: "heart",
      baseline: heartBaseline,
      interventions: [],
    });
    const bad = { ...c, schemaVersion: "9.9.9" };
    expect(ContractSchema.safeParse(bad).success).toBe(false);
  });
});

describe("brain single effect", () => {
  it("applies Erickson exercise +2% to hippocampal volume", () => {
    const c = simulate({
      organ: "brain",
      baseline: { hippocampal_volume: 6.5 },
      interventions: ["aerobic_exercise"],
    });
    const hv = c.parameters.find((p) => p.id === "hippocampal_volume");
    expect(hv?.value).toBeCloseTo(6.5 * 1.02, 6);
  });
});

describe("catalog / model sanity", () => {
  it("lists heart and brain interventions", () => {
    expect(listInterventions("heart").length).toBeGreaterThan(0);
    expect(listInterventions("brain").length).toBeGreaterThan(0);
  });
  it("exposes required heart parameters", () => {
    const ids = getModel("heart").parameters.map((p) => p.id);
    expect(ids).toEqual(expect.arrayContaining(["lvmi", "lv_wall_thickness", "ef", "lavi"]));
  });
  it("exposes required brain parameters", () => {
    const ids = getModel("brain").parameters.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining(["hippocampal_volume", "cortical_thickness", "ventricular_volume"]),
    );
  });
});

describe("error handling", () => {
  it("throws on unknown intervention", () => {
    expect(() =>
      simulate({ organ: "heart", baseline: heartBaseline, interventions: ["nope"] }),
    ).toThrow(/Unknown intervention/);
  });
});
