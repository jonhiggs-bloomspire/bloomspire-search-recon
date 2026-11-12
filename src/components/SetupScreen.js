import { useState } from "react";
import { RECORD_TYPES } from "../config";
import { navigate } from "../router";
import { ErrorNote } from "./notices";

const TIME_ZONE_NOTE =
  "A record is stale when Siebel's last updated time is newer than the search index last_updated by more than this many seconds. Siebel and Elasticsearch timestamps are compared as clock times, so the time zones must match.";

export function SetupScreen({ api }) {
  const [selected, setSelected] = useState(RECORD_TYPES.map((type) => type.value));
  const [tolerance, setTolerance] = useState("0");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function toggle(value) {
    setSelected((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  }

  async function onSubmit(event) {
    event.preventDefault();
    setError("");
    if (selected.length === 0) {
      setError("Choose at least one record type.");
      return;
    }
    if (!/^\d+$/.test(tolerance)) {
      setError("Enter a whole number of seconds, zero or more.");
      return;
    }
    setBusy(true);
    try {
      const run = await api.startRun({
        recordTypes: selected,
        options: { toleranceSeconds: Number(tolerance) },
      });
      navigate(`#/runs/${encodeURIComponent(run.id)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section data-screen="setup">
      <h2>Setup</h2>
      <p>Choose the record types to reconcile against the bloomspire search alias, then start a run.</p>
      <form onSubmit={onSubmit} noValidate>
        <fieldset className="bspre-checks">
          <legend>Record types</legend>
          {RECORD_TYPES.map((type) => (
            <span key={type.value} className="bspre-check">
              <input
                id={`record-type-${type.value}`}
                type="checkbox"
                name="recordType"
                value={type.value}
                checked={selected.includes(type.value)}
                onChange={() => toggle(type.value)}
              />
              <label htmlFor={`record-type-${type.value}`}>{type.label}</label>
            </span>
          ))}
        </fieldset>
        {selected.length === 0 ? <ErrorNote>Choose at least one record type.</ErrorNote> : null}
        <label htmlFor="tolerance">
          Stale tolerance in seconds
          <input
            id="tolerance"
            name="tolerance"
            type="number"
            min="0"
            step="1"
            value={tolerance}
            onChange={(event) => setTolerance(event.target.value)}
          />
        </label>
        <p className="bspre-note">{TIME_ZONE_NOTE}</p>
        <ErrorNote>{error}</ErrorNote>
        <div className="bspre-actions">
          <button type="submit" disabled={busy || selected.length === 0}>
            {busy ? "Starting…" : "Start run"}
          </button>
        </div>
      </form>
    </section>
  );
}
