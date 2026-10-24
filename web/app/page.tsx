"use client";

import { useMemo, useState } from "react";
import { simulate, COHORT_NOTICE, ENGINE_VERSION, type OrganId, type Contract } from "@engine";
import {
  ORGANS,
  buttonsByKind,
  parameterLabels,
  SYNTHETIC_BASELINES,
  DEMO_SEED,
  DEMO_ITERATIONS,
  type ButtonView,
} from "./lib/wiring";

export default function Page() {
  const [organ, setOrgan] = useState<OrganId>("heart");
  // Selected intervention ids per organ, so switching organs keeps each set.
  const [selected, setSelected] = useState<Record<OrganId, string[]>>({
    heart: [],
    brain: [],
  });
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);

  const groups = useMemo(() => buttonsByKind(organ), [organ]);
  const labels = useMemo(() => parameterLabels(organ), [organ]);
  const baseline = SYNTHETIC_BASELINES[organ];
  const activeIds = selected[organ];

  // Cumulative, order-independent: simulate() de-dupes and sorts internally.
  const contract: Contract = useMemo(
    () =>
      simulate({
        organ,
        baseline,
        interventions: activeIds,
        seed: DEMO_SEED,
        iterations: DEMO_ITERATIONS,
      }),
    [organ, baseline, activeIds],
  );

  function toggle(id: string, disabled: boolean) {
    if (disabled) return;
    setSelected((prev) => {
      const cur = prev[organ];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...prev, [organ]: next };
    });
  }

  return (
    <div className="wrap">
      <header className="app">
        <div>
          <h1>COR Outlook — cohort-level organ outlook</h1>
          <div className="sub">
            Demo of <code>cor-outlook-engine</code> v{ENGINE_VERSION}. Toggle
            interventions to see modeled cohort-level parameter changes.
          </div>
        </div>
        <OrganSwitch organ={organ} onChange={setOrgan} />
      </header>

      <div className="notice" role="note">
        <strong>Important</strong>
        <span>
          Cohort-level estimate — not a prediction for an individual patient,
          not a medical device, clinician decision support only.
        </span>
        <button
          className="info-btn"
          aria-expanded={noticeOpen}
          aria-label="Full disclaimer details"
          onClick={() => setNoticeOpen((v) => !v)}
        >
          ⓘ
        </button>
      </div>
      {noticeOpen && (
        <div className="popover" role="region" aria-label="Full disclaimer">
          {COHORT_NOTICE}
        </div>
      )}

      <div className="layout">
        {/* LEFT: interventions */}
        <section className="panel" aria-label="Interventions">
          <h2>Interventions</h2>
          <p className="hint">
            Click to toggle. Results update cumulatively and are
            order-independent. Items with no sourced effect for the selected
            organ are disabled.
          </p>

          <ToggleGroup
            title="Drugs"
            buttons={groups.drugs}
            activeIds={activeIds}
            openInfo={openInfo}
            onToggle={toggle}
            onInfo={(id) => setOpenInfo((cur) => (cur === id ? null : id))}
          />
          <ToggleGroup
            title="Lifestyle"
            buttons={groups.lifestyle}
            activeIds={activeIds}
            openInfo={openInfo}
            onToggle={toggle}
            onInfo={(id) => setOpenInfo((cur) => (cur === id ? null : id))}
          />

          <p className="synthetic">
            Baseline is a <strong>SYNTHETIC example</strong> ({organ}), not a
            real patient.
          </p>
        </section>

        {/* RIGHT: results */}
        <section className="panel" aria-label="Results" aria-live="polite">
          <h2>Projected parameters</h2>
          <p className="hint">
            Baseline → likely value, with the best/worst (2.5–97.5th percentile)
            Monte Carlo range. Seed {DEMO_SEED}, {DEMO_ITERATIONS} iterations.
          </p>
          <div className="legend" aria-hidden="true">
            <span>
              <span className="sw" style={{ background: "#9fb0c0" }} /> baseline
            </span>
            <span>
              <span className="sw" style={{ background: "#7ee2b8" }} /> likely
            </span>
            <span>
              <span className="sw" style={{ background: "#24405c" }} /> range
            </span>
          </div>

          {contract.parameters.map((p) => (
            <ParameterRow
              key={p.id}
              p={p}
              label={labels[p.id]?.label ?? p.id}
              contributors={contributorsFor(contract, p.id)}
            />
          ))}

          <Warnings contract={contract} />
        </section>
      </div>

      <footer className="app">
        Engine v{ENGINE_VERSION} · schema v{contract.schemaVersion} · Monte
        Carlo runs entirely in your browser · no data leaves this page.
      </footer>
    </div>
  );
}

function OrganSwitch({
  organ,
  onChange,
}: {
  organ: OrganId;
  onChange: (o: OrganId) => void;
}) {
  return (
    <div className="organ-switch" role="group" aria-label="Select organ">
      {ORGANS.map((o) => (
        <button
          key={o.id}
          aria-pressed={organ === o.id}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ToggleGroup({
  title,
  buttons,
  activeIds,
  openInfo,
  onToggle,
  onInfo,
}: {
  title: string;
  buttons: ButtonView[];
  activeIds: string[];
  openInfo: string | null;
  onToggle: (id: string, disabled: boolean) => void;
  onInfo: (id: string) => void;
}) {
  return (
    <>
      <div className="group-label">{title}</div>
      {buttons.map((b) => {
        const disabled = !b.sourced;
        const on = activeIds.includes(b.id);
        return (
          <div key={b.id}>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <button
                className="toggle"
                aria-pressed={on}
                disabled={disabled}
                title={b.disabledReason ?? ""}
                onClick={() => onToggle(b.id, disabled)}
              >
                <span className="left">
                  <span className="name">{b.label}</span>
                  <span className="meta">
                    {on ? "on" : disabled ? b.disabledReason : "off"}
                  </span>
                </span>
                <span className={`badge ${b.evidenceGrade}`}>
                  grade {b.evidenceGrade}
                </span>
              </button>
              <button
                className="info-btn"
                aria-expanded={openInfo === b.id}
                aria-label={`Evidence for ${b.label}`}
                onClick={() => onInfo(b.id)}
              >
                ⓘ
              </button>
            </div>
            {openInfo === b.id && (
              <div className="popover" role="region" aria-label={`Evidence for ${b.label}`}>
                {b.citations.length === 0 && <div>No modeled effect for this organ.</div>}
                <ul>
                  {b.citations.map((c, i) => (
                    <li key={i}>
                      <span className="cite">{c.parameterId}</span> —{" "}
                      {c.verified ? (
                        <>
                          grade {c.evidenceGrade}. {c.text}{" "}
                          <em>Population: {c.population}.</em>
                        </>
                      ) : (
                        <span className="unverified">
                          unverified / excluded: {c.note ?? "not independently sourced"}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function contributorsFor(contract: Contract, parameterId: string): string[] {
  // An intervention contributed to a parameter if it has a VERIFIED citation
  // for that parameter in provenance.
  const ids = contract.provenance.citations
    .filter((c) => c.parameterId === parameterId && c.verified)
    .map((c) => c.interventionId);
  const applied = new Set(contract.appliedInterventions.map((a) => a.id));
  const labelOf = new Map(contract.appliedInterventions.map((a) => [a.id, a.label]));
  return [...new Set(ids)].filter((id) => applied.has(id)).map((id) => labelOf.get(id) ?? id);
}

function ParameterRow({
  p,
  label,
  contributors,
}: {
  p: Contract["parameters"][number];
  label: string;
  contributors: string[];
}) {
  const changed = Math.abs(p.value - p.baseline) > 1e-9;
  const dirBetter =
    (p.direction === "higher-better" && p.value > p.baseline) ||
    (p.direction === "higher-worse" && p.value < p.baseline);
  const deltaClass = !changed ? "none" : dirBetter ? "good" : "bad";
  const deltaPct = p.baseline !== 0 ? ((p.value - p.baseline) / p.baseline) * 100 : 0;

  // Bar scale spans the union of baseline and MC range with small padding.
  const lo = Math.min(p.baseline, p.low, p.value);
  const hi = Math.max(p.baseline, p.high, p.value);
  const pad = (hi - lo) * 0.08 || Math.max(Math.abs(hi) * 0.05, 1);
  const min = lo - pad;
  const max = hi + pad;
  const span = max - min || 1;
  const pos = (v: number) => `${((v - min) / span) * 100}%`;
  const width = `${((p.high - p.low) / span) * 100}%`;

  return (
    <div className="param">
      <div className="top">
        <span className="pname">{label}</span>
        <span className="pval">
          {fmt(p.baseline)} → <strong>{fmt(p.value)}</strong> {p.unit}{" "}
          <span className={`delta ${deltaClass}`}>
            ({changed ? `${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%` : "no change"})
          </span>
        </span>
      </div>
      <div
        className="bar"
        role="img"
        aria-label={`${label}: baseline ${fmt(p.baseline)} ${p.unit}, likely ${fmt(
          p.value,
        )} ${p.unit}, range ${fmt(p.low)} to ${fmt(p.high)} ${p.unit}`}
      >
        <span className="range" style={{ left: pos(p.low), width }} />
        <span className="baseline" style={{ left: pos(p.baseline) }} />
        <span className="likely" style={{ left: pos(p.value) }} />
      </div>
      <div className="scale">
        <span>{fmt(p.low)}</span>
        <span>{fmt(p.high)}</span>
      </div>
      <div className="contrib">
        {p.clamped && <span style={{ color: "var(--warn)" }}>clamped to bounds · </span>}
        {contributors.length > 0
          ? `Contributors: ${contributors.join(", ")}`
          : "No sourced contributors for this parameter."}
      </div>
    </div>
  );
}

function Warnings({ contract }: { contract: Contract }) {
  if (contract.warnings.length === 0) return null;
  return (
    <div className="warnings" role="status">
      <h3>Engine warnings ({contract.warnings.length})</h3>
      <ul>
        {contract.warnings.map((w, i) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}

function fmt(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
}
