"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { COHORT_NOTICE, ENGINE_VERSION, type OrganId } from "@engine";
import {
  ORGANS,
  buttonsByKind,
  type ButtonView,
} from "./lib/wiring";
import {
  computeTrajectory,
  parseSuggested,
  HORIZON_YEARS,
} from "./lib/trajectoryView";
import { ParameterTable } from "./components/ParameterTable";
import { AorticStenosisCard } from "./components/AorticStenosisCard";
import type { ViewMode } from "./scene/Viewer3D";

// The 3D canvas is client-only; never server-render it (static export safe).
const Viewer3D = dynamic(() => import("./scene/Viewer3D").then((m) => m.Viewer3D), {
  ssr: false,
  loading: () => <div className="viewer-loading" aria-hidden="true" />,
});

type Selection = OrganId | "aortic_stenosis";

export default function Page() {
  const [selection, setSelection] = useState<Selection>("heart");
  const [selectedByOrgan, setSelectedByOrgan] = useState<Record<OrganId, string[]>>({
    heart: [],
    brain: [],
  });
  const [year, setYear] = useState(HORIZON_YEARS);
  const [viewMode, setViewMode] = useState<ViewMode>("side-by-side");
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [showAttrib, setShowAttrib] = useState(false);

  useEffect(() => {
    setSuggested(parseSuggested(window.location.search));
  }, []);

  const isOrgan = selection === "heart" || selection === "brain";
  const organ = (isOrgan ? selection : "heart") as OrganId;
  const activeIds = selectedByOrgan[organ];
  const groups = useMemo(() => (isOrgan ? buttonsByKind(organ) : null), [isOrgan, organ]);
  const res = useMemo(
    () => (isOrgan ? computeTrajectory(organ, activeIds) : null),
    [isOrgan, organ, activeIds],
  );
  const contributorLabels = useMemo(() => {
    const m: Record<string, string> = {};
    if (res) for (const a of res.appliedInterventions) m[a.id] = a.label;
    return m;
  }, [res]);

  function toggle(id: string, disabled: boolean) {
    if (disabled) return;
    setSelectedByOrgan((prev) => {
      const cur = prev[organ];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return { ...prev, [organ]: next };
    });
  }

  return (
    <div className="wrap">
      <header className="app">
        <div>
          <h1>COR Outlook — 3D treatment scenarios</h1>
          <div className="sub">
            Toggle interventions and see the organ in {HORIZON_YEARS} years, with
            vs without treatment. Engine v{ENGINE_VERSION}. Cohort-level.
          </div>
        </div>
        <nav className="organ-switch" role="group" aria-label="Select view">
          {ORGANS.map((o) => (
            <button key={o.id} aria-pressed={selection === o.id} onClick={() => setSelection(o.id)}>
              {o.label}
            </button>
          ))}
          <button
            aria-pressed={selection === "aortic_stenosis"}
            onClick={() => setSelection("aortic_stenosis")}
          >
            Aortic stenosis
          </button>
        </nav>
      </header>

      <div className="notice" role="note">
        <strong>Important</strong>
        <span>
          Cohort-level estimate — not a prediction for an individual patient, not
          a medical device, clinician decision support only.
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

      {selection === "aortic_stenosis" ? (
        <div className="layout-as">
          <AorticStenosisCard />
        </div>
      ) : (
        <div className="layout">
          {/* LEFT: interventions + controls */}
          <section className="panel" aria-label="Interventions and controls">
            <h2>Interventions</h2>
            <p className="hint">
              Cumulative and order-independent. Items with no sourced effect for
              the {organ} are disabled. Highlighted = suggested.
            </p>

            {groups && (
              <>
                <ToggleGroup
                  title="Drugs"
                  buttons={groups.drugs}
                  activeIds={activeIds}
                  suggested={suggested}
                  openInfo={openInfo}
                  onToggle={toggle}
                  onInfo={(id) => setOpenInfo((c) => (c === id ? null : id))}
                />
                <ToggleGroup
                  title="Lifestyle"
                  buttons={groups.lifestyle}
                  activeIds={activeIds}
                  suggested={suggested}
                  openInfo={openInfo}
                  onToggle={toggle}
                  onInfo={(id) => setOpenInfo((c) => (c === id ? null : id))}
                />
              </>
            )}

            <div className="controls">
              <label className="control">
                <span>Year: {year}</span>
                <input
                  type="range"
                  min={0}
                  max={HORIZON_YEARS}
                  step={1}
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  aria-label={`Outlook year, 0 to ${HORIZON_YEARS}`}
                />
              </label>
              <div className="view-switch" role="group" aria-label="3D view mode">
                <button
                  aria-pressed={viewMode === "side-by-side"}
                  onClick={() => setViewMode("side-by-side")}
                >
                  Side by side
                </button>
                <button aria-pressed={viewMode === "ghost"} onClick={() => setViewMode("ghost")}>
                  Ghost overlay
                </button>
              </div>
            </div>

            <p className="synthetic">
              Baseline is a <strong>SYNTHETIC example</strong> ({organ}), not a
              real patient.
            </p>
            <button className="link-btn" aria-expanded={showAttrib} onClick={() => setShowAttrib((v) => !v)}>
              Attributions
            </button>
            {showAttrib && <Attributions />}
          </section>

          {/* MIDDLE: 3D */}
          <section className="panel viewer-panel" aria-label="3D viewer">
            {res && <Viewer3D organ={organ} res={res} year={year} viewMode={viewMode} />}
            <p className="illustrative-note">
              3D deformation is an <strong>illustrative</strong> rendering of the
              cohort-level ratios, not a biomechanical or per-structure model.
            </p>
          </section>

          {/* RIGHT: table */}
          <section className="panel" aria-label="Parameter table" aria-live="polite">
            <h2>Projected parameters</h2>
            <p className="hint">
              Baseline → year {year}, untreated vs treated, with best–worst Monte
              Carlo range (seed {res?.seed}).
            </p>
            {res && <ParameterTable res={res} year={year} contributorLabels={contributorLabels} />}
          </section>
        </div>
      )}

      <footer className="app">
        Engine v{ENGINE_VERSION} · Monte Carlo runs in your browser · meshes:
        heart (procedural, MIT) · brain (Mindboggle-101, CC BY 4.0). No data
        leaves this page.
      </footer>
    </div>
  );
}

function Attributions() {
  return (
    <div className="popover" role="region" aria-label="Asset attributions">
      <ul>
        <li>
          <strong>Heart mesh:</strong> procedural (MIT), from cor-heart-studio.
          No third-party anatomical data.
        </li>
        <li>
          <strong>Brain mesh:</strong> Mindboggle-101 (MMRR-21-5),{" "}
          <strong>CC BY 4.0</strong>. Klein &amp; Tourville 2012,
          DOI 10.3389/fnins.2012.00171.
        </li>
        <li>No real patient DICOM is shipped. See docs/attributions.md.</li>
      </ul>
    </div>
  );
}

function ToggleGroup({
  title,
  buttons,
  activeIds,
  suggested,
  openInfo,
  onToggle,
  onInfo,
}: {
  title: string;
  buttons: ButtonView[];
  activeIds: string[];
  suggested: string[];
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
        const isSuggested = suggested.includes(b.id);
        return (
          <div key={b.id}>
            <div className="toggle-row">
              <button
                className={`toggle${isSuggested ? " suggested" : ""}`}
                aria-pressed={on}
                aria-describedby={isSuggested ? `sug-${b.id}` : undefined}
                disabled={disabled}
                title={b.disabledReason ?? ""}
                onClick={() => onToggle(b.id, disabled)}
              >
                <span className="left">
                  <span className="name">{b.label}</span>
                  <span className="meta">{on ? "on" : disabled ? b.disabledReason : "off"}</span>
                </span>
                <span className={`badge ${b.evidenceGrade}`}>grade {b.evidenceGrade}</span>
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
            {isSuggested && (
              <span id={`sug-${b.id}`} className="visually-hidden">
                suggested intervention
              </span>
            )}
            {openInfo === b.id && (
              <div className="popover" role="region" aria-label={`Evidence for ${b.label}`}>
                {b.citations.length === 0 && <div>No modeled effect for this organ.</div>}
                <ul>
                  {b.citations.map((c, i) => (
                    <li key={i}>
                      <span className="cite">{c.parameterId}</span> —{" "}
                      {c.verified ? (
                        <>
                          grade {c.evidenceGrade}. {c.text} <em>Population: {c.population}.</em>
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
