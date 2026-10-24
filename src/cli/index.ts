#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { simulate, listInterventions, isOrganId, type OrganId } from "../index.js";

const USAGE = `cor-outlook — cohort-level organ-outlook simulation (decision support only)

Usage:
  cor-outlook simulate --organ <heart|brain> --baseline <file.json> --on <id,id,...> [options]
  cor-outlook list [--organ <heart|brain>]

Options:
  --organ <id>         Target organ: heart or brain
  --baseline <file>    JSON file: { "parameterId": value, ... }
  --on <ids>           Comma-separated intervention ids to toggle on
  --seed <n>           Monte Carlo seed (default 1)
  --iterations <n>     Monte Carlo iterations (default 2000)
  -h, --help           Show this help

The output is cohort-level decision support, NOT an individual prediction.
`;

function fail(msg: string): never {
  process.stderr.write(`error: ${msg}\n`);
  process.exit(1);
}

function cmdList(organArg: string | undefined): void {
  let organ: OrganId | undefined;
  if (organArg !== undefined) {
    if (!isOrganId(organArg)) fail(`unknown organ "${organArg}" (expected heart or brain)`);
    organ = organArg;
  }
  const items = listInterventions(organ);
  for (const iv of items) {
    process.stdout.write(
      `${iv.id}\t${iv.kind}\t[${iv.organs.join(",")}]\tgrade ${iv.evidenceGrade}\t${iv.label}\n`,
    );
  }
}

function cmdSimulate(values: Record<string, string | boolean | undefined>): void {
  const organArg = values.organ;
  const baselinePath = values.baseline;
  const on = values.on;

  if (typeof organArg !== "string" || !isOrganId(organArg)) {
    fail(`--organ must be heart or brain`);
  }
  if (typeof baselinePath !== "string") fail(`--baseline <file.json> is required`);
  if (typeof on !== "string") fail(`--on <id,id,...> is required`);

  let baseline: Record<string, number>;
  try {
    const raw = readFileSync(baselinePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      fail(`baseline must be a JSON object of parameterId -> number`);
    }
    baseline = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (k.startsWith("_")) continue; // underscore-prefixed keys are metadata/comments
      if (typeof v !== "number" || !Number.isFinite(v)) {
        fail(`baseline value for "${k}" must be a finite number`);
      }
      baseline[k] = v;
    }
  } catch (e) {
    fail(`could not read/parse baseline: ${(e as Error).message}`);
  }

  const interventions = on
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const seed = values.seed !== undefined ? Number(values.seed) : undefined;
  const iterations = values.iterations !== undefined ? Number(values.iterations) : undefined;
  if (seed !== undefined && !Number.isFinite(seed)) fail(`--seed must be a number`);
  if (iterations !== undefined && (!Number.isInteger(iterations) || iterations <= 0)) {
    fail(`--iterations must be a positive integer`);
  }

  try {
    const contract = simulate({
      organ: organArg,
      baseline,
      interventions,
      ...(seed !== undefined ? { seed } : {}),
      ...(iterations !== undefined ? { iterations } : {}),
    });
    for (const w of contract.warnings) process.stderr.write(`warning: ${w}\n`);
    process.stdout.write(JSON.stringify(contract, null, 2) + "\n");
  } catch (e) {
    fail((e as Error).message);
  }
}

function main(): void {
  const argv = process.argv.slice(2);
  const sub = argv[0];

  if (sub === undefined || sub === "-h" || sub === "--help" || sub === "help") {
    process.stdout.write(USAGE);
    process.exit(sub === undefined ? 1 : 0);
  }

  const { values } = parseArgs({
    args: argv.slice(1),
    options: {
      organ: { type: "string" },
      baseline: { type: "string" },
      on: { type: "string" },
      seed: { type: "string" },
      iterations: { type: "string" },
      help: { type: "boolean", short: "h" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  switch (sub) {
    case "simulate":
      cmdSimulate(values);
      break;
    case "list":
      cmdList(typeof values.organ === "string" ? values.organ : undefined);
      break;
    default:
      fail(`unknown command "${sub}" (expected: simulate, list)`);
  }
}

main();
