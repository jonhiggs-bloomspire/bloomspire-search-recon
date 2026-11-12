import { useEffect, useState } from "react";
import { overallCounts } from "../counts";
import { labelForRecordType } from "../config";
import { RecordTypeBadge, StatusBadge } from "./badges";
import { ErrorNote, LoadingNote } from "./notices";

const COLUMNS = [
  ["siebel", "Siebel count"],
  ["es", "ES count"],
  ["matched", "Matched"],
  ["siebelOnly", "Siebel only"],
  ["esOnly", "ES only"],
  ["stale", "Stale"],
];

function progressText(run) {
  const checkpoint = run.lastCheckpoint ? ` Last checkpoint ${run.lastCheckpoint}.` : "";
  return `Chunks ${run.chunksDone} of ${run.chunksTotal}.${checkpoint}`;
}

export function RunSummary({ api, runId }) {
  const [run, setRun] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setRun(null);
    setError("");
    api
      .getRun(runId)
      .then((next) => {
        if (!cancelled) {
          setRun(next);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, runId]);

  async function changeStatus(action) {
    setBusy(true);
    setError("");
    try {
      const next = await api[action](runId);
      setRun(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const showProgress = run && (run.status === "running" || run.status === "paused");
  const percent = run && run.chunksTotal ? Math.round((run.chunksDone / run.chunksTotal) * 100) : 0;

  return (
    <section data-screen="summary">
      <h2>Run summary</h2>
      <ErrorNote>{error}</ErrorNote>
      {run == null && !error ? <LoadingNote>Loading run…</LoadingNote> : null}
      {run ? (
        <>
          <div className="bspre-card">
            <div className="bspre-summary-head">
              <div>
                <p className="bspre-run-id">{run.id}</p>
                <StatusBadge status={run.status} partial={run.partial} />
              </div>
              <div className="bspre-actions">
                {run.status === "running" ? (
                  <button type="button" onClick={() => changeStatus("pauseRun")} disabled={busy}>
                    Pause
                  </button>
                ) : null}
                {run.status === "paused" ? (
                  <button type="button" onClick={() => changeStatus("resumeRun")} disabled={busy}>
                    Resume
                  </button>
                ) : null}
                <a className="bspre-button-link" href={`#/runs/${encodeURIComponent(run.id)}/findings`}>
                  View findings
                </a>
                {!run.partial && run.status === "done" ? (
                  <a className="bspre-button-link" href={`#/compare?current=${encodeURIComponent(run.id)}`}>
                    Compare this run
                  </a>
                ) : null}
              </div>
            </div>
            {run.partial ? (
              <p className="bspre-partial" role="status">
                Partial run. This run stopped before every chunk finished, so it cannot be compared.
              </p>
            ) : null}
            {run.errorMessage ? <ErrorNote>{run.errorMessage}</ErrorNote> : null}
            {showProgress ? (
              <div className="bspre-progress-block" aria-live="polite">
                <div
                  className="bspre-progress"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={run.chunksTotal}
                  aria-valuenow={run.chunksDone}
                  aria-valuetext={progressText(run)}
                >
                  <span style={{ width: `${percent}%` }} />
                </div>
                <p>{progressText(run)}</p>
              </div>
            ) : null}
            <dl className="bspre-meta">
              <div>
                <dt>Started</dt>
                <dd>{run.startedAt || "—"}</dd>
              </div>
              <div>
                <dt>Ended</dt>
                <dd>{run.endedAt || "—"}</dd>
              </div>
              <div>
                <dt>Run by</dt>
                <dd>{run.startedBy}</dd>
              </div>
              <div>
                <dt>Stale tolerance</dt>
                <dd>{run.toleranceSeconds} seconds</dd>
              </div>
              <div>
                <dt>Chunks</dt>
                <dd>
                  {run.chunksDone} of {run.chunksTotal}
                </dd>
              </div>
              <div>
                <dt>Record types</dt>
                <dd className="bspre-badge-row">
                  {run.recordTypes.map((type) => (
                    <RecordTypeBadge key={type} recordType={type} />
                  ))}
                </dd>
              </div>
            </dl>
            <p className="bspre-note">
              Siebel and Elasticsearch timestamps are compared as clock times. The time zones must match.
            </p>
          </div>
          <table>
            <caption>Counts by record type</caption>
            <thead>
              <tr>
                <th scope="col">Record type</th>
                {COLUMNS.map(([key, label]) => (
                  <th key={key} scope="col" className="bspre-num">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {run.recordTypes.map((type) => {
                const counts = (run.counts && run.counts[type]) || {};
                return (
                  <tr key={type}>
                    <th scope="row">{labelForRecordType(type)}</th>
                    {COLUMNS.map(([key]) => (
                      <td key={key} className="bspre-num">
                        {counts[key] || 0}
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr>
                <th scope="row">Overall</th>
                {COLUMNS.map(([key]) => (
                  <td key={key} className="bspre-num">
                    {overallCounts(run)[key]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
