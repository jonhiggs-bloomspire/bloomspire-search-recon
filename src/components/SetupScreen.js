import { useEffect, useState } from "react";
import {
  normalizeSetups,
  normalizeStartOverrides,
  normalizeTolerance,
  ReconApiError,
} from "../api/contract";
import { navigate } from "../router";
import { draftFromSetup, emptySetupDraft, searchSpecText } from "../setupRows";
import { ErrorNote, LoadingNote } from "./notices";

const TIME_ZONE_NOTE =
  "A record is stale when Siebel's last updated time is newer than the search index last updated time by more than this many seconds. Siebel and Elasticsearch timestamps are compared as clock times, so the time zones must match.";

const SEED_NOTE = "These are built-in defaults that have not been saved yet.";

function field(id, label, value, onChange, extra) {
  return (
    <label htmlFor={id}>
      {label}
      <input id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)} {...extra} />
    </label>
  );
}

export function SetupScreen({ api }) {
  const [setups, setSetups] = useState([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [startError, setStartError] = useState("");
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState(null);
  const [mode, setMode] = useState("");
  const [editingBusComp, setEditingBusComp] = useState("");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState([]);
  const [tolerance, setTolerance] = useState("0");
  const [overrides, setOverrides] = useState({});
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    api
      .getSetup()
      .then((result) => {
        if (cancelled) {
          return;
        }
        const rows = result.setups || [];
        setSetups(rows);
        setSource(result.source || "table");
        setSelected(rows.filter((row) => row.active).map((row) => row.busComp));
      })
      .catch((err) => {
        if (!cancelled) {
          setLoadError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  function applyResult(result) {
    const rows = result.setups || [];
    setSetups(rows);
    setSource(result.source || "table");
    setSelected(rows.filter((row) => row.active).map((row) => row.busComp));
    setDraft(null);
    setMode("");
    setEditingBusComp("");
    setFormError("");
  }

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError("");
  }

  function openAdd() {
    setMode("add");
    setEditingBusComp("");
    setDraft(emptySetupDraft());
    setFormError("");
  }

  function openEdit(row) {
    setMode("edit");
    setEditingBusComp(row.busComp);
    setDraft(draftFromSetup(row));
    setFormError("");
  }

  function rowsToSave() {
    if (source === "seed") {
      const others = setups
        .filter((row) => row.busComp !== draft.busComp.trim())
        .map((row) => draftFromSetup(row));
      return [...others, draft];
    }
    return [draft];
  }

  async function onSave(event) {
    event.preventDefault();
    setFormError("");
    const busComp = draft.busComp.trim();
    if (mode === "add" && setups.some((row) => row.busComp === busComp)) {
      setFormError(`Setups has a duplicate busComp: ${busComp}.`);
      return;
    }
    const existing = source === "table" ? setups.map((row) => row.busComp) : [];
    let payload;
    try {
      payload = normalizeSetups(rowsToSave(), existing);
    } catch (err) {
      setFormError(err instanceof ReconApiError ? err.message : err.message);
      return;
    }
    setSaving(true);
    try {
      const result = await api.saveSetup(payload, { existingBusComps: existing });
      applyResult(result);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function toggle(busComp) {
    setSelected((current) =>
      current.includes(busComp) ? current.filter((item) => item !== busComp) : [...current, busComp]
    );
  }

  function updateOverride(busComp, key, value) {
    setOverrides((current) => ({
      ...current,
      [busComp]: { searchSpec: "", chunkSize: "", pitKeepAlive: "", ...(current[busComp] || {}), [key]: value },
    }));
  }

  async function onStart(event) {
    event.preventDefault();
    setStartError("");
    const active = setups.filter((row) => row.active);
    const chosen = active.filter((row) => selected.includes(row.busComp));
    if (active.length > 0 && chosen.length === 0) {
      setStartError("Choose at least one record type.");
      return;
    }
    if (!/^\d+$/.test(tolerance)) {
      setStartError("Enter a whole number of seconds, zero or more.");
      return;
    }
    const recordTypes = active.length > 0 && chosen.length === active.length ? [] : chosen.map((row) => row.busComp);
    const setup = [];
    chosen.forEach((row) => {
      const values = overrides[row.busComp] || {};
      const entry = { busComp: row.busComp };
      if (String(values.searchSpec || "").trim()) {
        entry.searchSpec = values.searchSpec;
      }
      if (String(values.chunkSize || "").trim()) {
        entry.chunkSize = values.chunkSize;
      }
      if (String(values.pitKeepAlive || "").trim()) {
        entry.pitKeepAlive = values.pitKeepAlive;
      }
      if (entry.searchSpec || entry.chunkSize || entry.pitKeepAlive) {
        setup.push(entry);
      }
    });
    try {
      normalizeTolerance({ toleranceSeconds: Number(tolerance) });
      normalizeStartOverrides(setup);
    } catch (err) {
      setStartError(err.message);
      return;
    }
    setStarting(true);
    try {
      const run = await api.startRun({
        recordTypes,
        options: { toleranceSeconds: Number(tolerance) },
        setup,
      });
      navigate(`#/runs/${encodeURIComponent(run.id)}`);
    } catch (err) {
      setStartError(err.message);
    } finally {
      setStarting(false);
    }
  }

  const active = setups.filter((row) => row.active);
  const chosen = active.filter((row) => selected.includes(row.busComp));
  const noneChosen = active.length > 0 && chosen.length === 0;

  return (
    <section data-screen="setup">
      <h2>Setup</h2>
      <p>
        Each business component has one setup row. A new run copies the active rows. Clear Active to leave a
        component out of new runs.
      </p>
      {source === "seed" ? (
        <p className="bspre-note" role="status">
          {SEED_NOTE} Saving writes every row shown here.
        </p>
      ) : null}
      <ErrorNote>{loadError}</ErrorNote>
      {loading ? <LoadingNote>Loading setup…</LoadingNote> : null}
      {!loading && !loadError ? (
        <table>
          <caption>Business component setup</caption>
          <thead>
            <tr>
              <th scope="col">Record type</th>
              <th scope="col">Business component</th>
              <th scope="col">Business object</th>
              <th scope="col">Integration object</th>
              <th scope="col">Type order</th>
              <th scope="col">Search spec</th>
              <th scope="col">Chunk size</th>
              <th scope="col">PIT keep alive</th>
              <th scope="col">Active</th>
              <th scope="col">
                <span className="bspre-sr">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {setups.length === 0 ? (
              <tr>
                <td colSpan={10}>No setup rows yet.</td>
              </tr>
            ) : (
              setups.map((row) => (
                <tr key={row.busComp}>
                  <th scope="row">{row.recordType}</th>
                  <td>{row.busComp}</td>
                  <td>{row.busObj}</td>
                  <td>{row.intObj}</td>
                  <td className="bspre-num">{row.typeSeq}</td>
                  <td>{searchSpecText(row.searchSpec)}</td>
                  <td className="bspre-num">{row.chunkSize}</td>
                  <td>{row.pitKeepAlive}</td>
                  <td>{row.active ? "Yes" : "No"}</td>
                  <td>
                    <button type="button" className="bspre-button-secondary" onClick={() => openEdit(row)}>
                      Edit <span className="bspre-sr">{row.busComp}</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      ) : null}
      {!loading && !loadError ? (
        <div className="bspre-actions">
          <button type="button" onClick={openAdd}>
            Add business component
          </button>
        </div>
      ) : null}
      {draft ? (
        <form onSubmit={onSave} noValidate>
          <h3>{mode === "add" ? "Add a business component" : `Edit ${editingBusComp}`}</h3>
          <ErrorNote>{formError}</ErrorNote>
          <div className="bspre-fields">
            {field("setup-bus-comp", "Business component", draft.busComp, (value) => updateDraft("busComp", value), {
              readOnly: mode === "edit",
              required: true,
            })}
            {field("setup-bus-obj", "Business object", draft.busObj, (value) => updateDraft("busObj", value), {
              required: true,
            })}
            {field("setup-int-obj", "Integration object", draft.intObj, (value) => updateDraft("intObj", value), {
              required: true,
            })}
            {field("setup-record-type", "Record type", draft.recordType, (value) => updateDraft("recordType", value), {
              required: true,
            })}
            {field("setup-type-seq", "Type order", draft.typeSeq, (value) => updateDraft("typeSeq", value), {
              inputMode: "numeric",
            })}
            <div className="bspre-wide">
              <label htmlFor="setup-search-spec">
                Search spec
                <input
                  id="setup-search-spec"
                  name="setup-search-spec"
                  aria-describedby="setup-search-spec-hint"
                  value={draft.searchSpec}
                  onChange={(event) => updateDraft("searchSpec", event.target.value)}
                />
              </label>
              <p id="setup-search-spec-hint" className="bspre-hint">
                Blank means every record of this business component.
              </p>
            </div>
            <div>
              <label htmlFor="setup-chunk-size">
                Chunk size
                <input
                  id="setup-chunk-size"
                  name="setup-chunk-size"
                  inputMode="numeric"
                  aria-describedby="setup-chunk-size-hint"
                  aria-invalid={formError && formError.includes("Chunk Size") ? "true" : undefined}
                  value={draft.chunkSize}
                  onChange={(event) => updateDraft("chunkSize", event.target.value)}
                />
              </label>
              <p id="setup-chunk-size-hint" className="bspre-hint">
                Whole number from 1 to 5000. Blank saves as 500.
              </p>
            </div>
            <div>
              <label htmlFor="setup-pit">
                PIT keep alive
                <input
                  id="setup-pit"
                  name="setup-pit"
                  aria-describedby="setup-pit-hint"
                  aria-invalid={formError && formError.includes("PIT Keep Alive") ? "true" : undefined}
                  value={draft.pitKeepAlive}
                  onChange={(event) => updateDraft("pitKeepAlive", event.target.value)}
                />
              </label>
              <p id="setup-pit-hint" className="bspre-hint">
                A number plus s, m, h, or d, such as 30s, 10m, 1h, or 2d. Blank saves as 10m.
              </p>
            </div>
            {field("setup-es-type-path", "ES type path", draft.esTypePath, (value) => updateDraft("esTypePath", value), {
              required: true,
            })}
            {field("setup-es-type-value", "ES type value", draft.esTypeValue, (value) => updateDraft("esTypeValue", value), {
              required: true,
            })}
            {field("setup-es-id-path", "ES id path", draft.esIdPath, (value) => updateDraft("esIdPath", value))}
            {field(
              "setup-es-updated-path",
              "ES updated path",
              draft.esUpdatedPath,
              (value) => updateDraft("esUpdatedPath", value),
              { required: true }
            )}
            {field(
              "setup-siebel-names",
              "Siebel name fields",
              draft.siebelNameFields,
              (value) => updateDraft("siebelNameFields", value)
            )}
            {field("setup-es-names", "ES name paths", draft.esNamePaths, (value) => updateDraft("esNamePaths", value))}
            <label className="bspre-check" htmlFor="setup-active">
              <input
                id="setup-active"
                name="setup-active"
                type="checkbox"
                checked={draft.active}
                onChange={(event) => updateDraft("active", event.target.checked)}
              />
              Active
            </label>
          </div>
          <div className="bspre-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save setup"}
            </button>
            <button
              type="button"
              className="bspre-button-secondary"
              onClick={() => {
                setDraft(null);
                setFormError("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {!loadError ? (
        <>
      <h3>Start a run</h3>
      <p>The run uses the current active setup. Filled override fields apply to this run only.</p>
      <form onSubmit={onStart} noValidate>
        {active.length === 0 && !loading ? (
          <p className="bspre-note">No active setup rows. A new run uses the built-in defaults.</p>
        ) : null}
        {active.length > 0 ? (
          <fieldset className="bspre-checks">
            <legend>Record types</legend>
            {active.map((row) => (
              <span key={row.busComp} className="bspre-check">
                <input
                  id={`run-type-${row.busComp}`}
                  type="checkbox"
                  name="recordType"
                  value={row.recordType}
                  checked={selected.includes(row.busComp)}
                  onChange={() => toggle(row.busComp)}
                />
                <label htmlFor={`run-type-${row.busComp}`}>
                  {row.recordType} ({row.busComp})
                </label>
              </span>
            ))}
          </fieldset>
        ) : null}
        {noneChosen ? <ErrorNote>Choose at least one record type.</ErrorNote> : null}
        <ErrorNote>{startError}</ErrorNote>
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
        {chosen.length > 0 ? (
          <details>
            <summary>Override search spec, chunk size, or PIT keep-alive for this run</summary>
            <div className="bspre-fields">
              {chosen.map((row) => {
                const values = overrides[row.busComp] || {};
                return (
                  <div key={row.busComp} className="bspre-wide">
                    <p>
                      {row.recordType} ({row.busComp})
                    </p>
                    <div className="bspre-fields">
                      <label htmlFor={`override-search-${row.busComp}`}>
                        Search spec for {row.busComp}
                        <input
                          id={`override-search-${row.busComp}`}
                          value={values.searchSpec || ""}
                          onChange={(event) => updateOverride(row.busComp, "searchSpec", event.target.value)}
                        />
                      </label>
                      <label htmlFor={`override-chunk-${row.busComp}`}>
                        Chunk size for {row.busComp}
                        <input
                          id={`override-chunk-${row.busComp}`}
                          inputMode="numeric"
                          value={values.chunkSize || ""}
                          onChange={(event) => updateOverride(row.busComp, "chunkSize", event.target.value)}
                        />
                      </label>
                      <label htmlFor={`override-pit-${row.busComp}`}>
                        PIT keep alive for {row.busComp}
                        <input
                          id={`override-pit-${row.busComp}`}
                          value={values.pitKeepAlive || ""}
                          onChange={(event) => updateOverride(row.busComp, "pitKeepAlive", event.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>
        ) : null}
        <div className="bspre-actions">
          <button type="submit" disabled={starting || loading || noneChosen}>
            {starting ? "Starting…" : "Start run"}
          </button>
        </div>
      </form>
        </>
      ) : null}
    </section>
  );
}
