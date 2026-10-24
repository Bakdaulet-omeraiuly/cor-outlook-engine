"use client";

export function AorticStenosisCard() {
  return (
    <div className="as-card" role="region" aria-label="Aortic stenosis information">
      <h2>Aortic stenosis</h2>
      <p>
        <strong>No proven medication slows aortic stenosis progression.</strong>{" "}
        Treatment is valve replacement — surgical (AVR) or transcatheter (TAVI) —
        when criteria are met.
      </p>
      <p className="cite">
        ACC/AHA 2020 Guideline for the Management of Patients With Valvular Heart
        Disease. Otto CM, Nishimura RA, Bonow RO, et al. <em>Circulation.</em>{" "}
        2021;143:e72–e227. DOI: 10.1161/CIR.0000000000000923.
      </p>
      <p className="note">
        No intervention toggles are shown for aortic stenosis because no
        drug/lifestyle effect on valve progression is supported by evidence.
      </p>
    </div>
  );
}
