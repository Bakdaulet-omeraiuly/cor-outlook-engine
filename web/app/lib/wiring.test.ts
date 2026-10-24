import { describe, it, expect } from "vitest";
import { simulate } from "@engine";
import {
  buildButtons,
  buttonsByKind,
  SYNTHETIC_BASELINES,
  DEMO_SEED,
  DEMO_ITERATIONS,
  ORGANS,
} from "./wiring";

describe("catalog -> buttons wiring", () => {
  it("builds a button for every heart intervention", () => {
    const btns = buildButtons("heart");
    const ids = btns.map((b) => b.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "ace_inhibitor_arb",
        "beta_blocker",
        "statin",
        "sglt2_inhibitor",
        "aerobic_exercise",
        "sodium_reduction",
        "weight_loss",
        "smoking_cessation",
      ]),
    );
  });

  it("builds a button for every brain intervention", () => {
    const ids = buildButtons("brain").map((b) => b.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "aerobic_exercise",
        "bp_control",
        "mediterranean_diet",
        "sleep",
        "smoking_cessation",
      ]),
    );
  });

  it("splits buttons into drug and lifestyle groups", () => {
    const { drugs, lifestyle } = buttonsByKind("heart");
    expect(drugs.every((b) => b.kind === "drug")).toBe(true);
    expect(lifestyle.every((b) => b.kind === "lifestyle")).toBe(true);
    expect(drugs.length + lifestyle.length).toBe(buildButtons("heart").length);
  });

  it("flags sourced vs unsourced interventions for the organ", () => {
    const heart = buildButtons("heart");
    const ace = heart.find((b) => b.id === "ace_inhibitor_arb")!;
    const statin = heart.find((b) => b.id === "statin")!;
    // ACEi has a verified LVMI effect; statin has only an unverified one.
    expect(ace.sourced).toBe(true);
    expect(ace.disabledReason).toBeUndefined();
    expect(statin.sourced).toBe(false);
    expect(statin.disabledReason).toMatch(/sourced|verified|effect/i);
  });

  it("exposes citations with population for verified effects", () => {
    const ace = buildButtons("heart").find((b) => b.id === "ace_inhibitor_arb")!;
    const verified = ace.citations.filter((c) => c.verified);
    expect(verified.length).toBeGreaterThan(0);
    expect(verified[0]!.population.length).toBeGreaterThan(0);
    expect(verified[0]!.text).toMatch(/\(\d{4}\)/);
  });

  it("covers both organs", () => {
    expect(ORGANS.map((o) => o.id).sort()).toEqual(["brain", "heart"]);
  });
});

describe("toggle order independence (demo seed)", () => {
  function run(order: string[]) {
    return simulate({
      organ: "heart",
      baseline: SYNTHETIC_BASELINES.heart,
      interventions: order,
      seed: DEMO_SEED,
      iterations: DEMO_ITERATIONS,
    });
  }

  it("same selection in different toggle orders yields identical parameters", () => {
    const a = run(["ace_inhibitor_arb", "sglt2_inhibitor", "weight_loss"]);
    const b = run(["weight_loss", "ace_inhibitor_arb", "sglt2_inhibitor"]);
    const c = run(["sglt2_inhibitor", "weight_loss", "ace_inhibitor_arb"]);
    expect(JSON.stringify(b.parameters)).toEqual(JSON.stringify(a.parameters));
    expect(JSON.stringify(c.parameters)).toEqual(JSON.stringify(a.parameters));
  });

  it("toggling an unsourced intervention does not change results", () => {
    const without = run(["ace_inhibitor_arb"]);
    const withStatin = run(["ace_inhibitor_arb", "statin"]);
    const lvmiA = without.parameters.find((p) => p.id === "lvmi")!.value;
    const lvmiB = withStatin.parameters.find((p) => p.id === "lvmi")!.value;
    expect(lvmiB).toBeCloseTo(lvmiA, 10);
    expect(withStatin.provenance.excludedUnverified).toContain("statin:lvmi");
  });
});

describe("synthetic baselines", () => {
  it("provides baselines for every organ parameter", () => {
    for (const { id } of ORGANS) {
      const baseline = SYNTHETIC_BASELINES[id];
      expect(Object.keys(baseline).length).toBeGreaterThan(0);
    }
  });
});
