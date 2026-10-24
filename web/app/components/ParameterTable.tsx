"use client";

import type { TrajectoryResult } from "@engine";
import { pointAt } from "../lib/trajectoryView";

function fmt(n: number): string {
  if (Math.abs(n) >= 100) return n.toFixed(0);
  if (Math.abs(n) >= 10) return n.toFixed(1);
  return n.toFixed(2);
}

export function ParameterTable({
  res,
  year,
  contributorLabels,
}: {
  res: TrajectoryResult;
  year: number;
  contributorLabels: Record<string, string>;
}) {
  return (
    <div>
      <table className="param-table">
        <caption className="visually-hidden">
          Projected organ parameters at year {year}: untreated vs treated, with best–worst range.
        </caption>
        <thead>
          <tr>
            <th scope="col">Parameter</th>
            <th scope="col">Baseline</th>
            <th scope="col">
              Untreated<span className="col-sub">y{year} (best–worst)</span>
            </th>
            <th scope="col">
              Treated<span className="col-sub">y{year} (best–worst)</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {res.parameters.map((p) => {
            const u = pointAt(p, "untreated", year);
            const t = pointAt(p, "treated", year);
            const changed = Math.abs(t.value - u.value) > 1e-6;
            const better =
              (p.direction === "higher-better" && t.value > u.value) ||
              (p.direction === "higher-worse" && t.value < u.value);
            const deltaClass = !changed ? "none" : better ? "good" : "bad";
            const contribs = p.contributors
              .map((id) => contributorLabels[id] ?? id)
              .join(", ");
            return (
              <tr key={p.id}>
                <th scope="row">
                  <span className="pname">{p.label}</span>{" "}
                  <span className="unit">{p.unit}</span>
                  {p.modelledTimeCourse && (
                    <span className="chip" title="Time course shaped by a documented linear-ramp assumption">
                      modelled time course
                    </span>
                  )}
                  {p.naturalCourseModel === "no-progression" && (
                    <span className="chip muted" title="No defensible cohort rate; untreated held flat">
                      no progression modelled
                    </span>
                  )}
                </th>
                <td className="num">{fmt(p.baseline)}</td>
                <td className="num">
                  {fmt(u.value)}
                  <span className="range">
                    {fmt(u.low)}–{fmt(u.high)}
                  </span>
                </td>
                <td className={`num delta ${deltaClass}`}>
                  {fmt(t.value)}
                  <span className="range">
                    {fmt(t.low)}–{fmt(t.high)}
                  </span>
                  {contribs && <span className="contrib">← {contribs}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {res.warnings.length > 0 && (
        <div className="warnings" role="status">
          <h3>Engine warnings ({res.warnings.length})</h3>
          <ul>
            {res.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
