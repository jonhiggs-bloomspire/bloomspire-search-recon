import { useEffect, useState } from "react";
import { findingCount } from "../counts";
import { labelForRecordType } from "../config";
import { StatusBadge } from "./badges";
import { ErrorNote, LoadingNote } from "./notices";

function displayTime(value) {
  return value || "—";
}

export function RunHistory({ api }) {
  const [runs, setRuns] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setRuns(null);
    setError("");
    api
      .listRuns()
      .then((next) => {
        if (!cancelled) {
          setRuns(next);
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
  }, [api]);

  return (
    <section data-screen="history">
      <h2>Run history</h2>
      <p>Counts are findings for that record type. Partial runs cannot be compared.</p>
      <ErrorNote>{error}</ErrorNote>
      {runs == null && !error ? <LoadingNote>Loading runs…</LoadingNote> : null}
      {runs ? (
        <table>
          <caption>Recon runs</caption>
          <thead>
            <tr>
              <th scope="col">Run</th>
              <th scope="col">Status</th>
              <th scope="col">Started</th>
              <th scope="col">Ended</th>
              <th scope="col">Run by</th>
              <th scope="col">Individual</th>
              <th scope="col">Entity</th>
              <th scope="col">Lead</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={8}>No runs yet.</td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id}>
                  <td>
                    <a href={`#/runs/${encodeURIComponent(run.id)}`}>{run.id}</a>
                  </td>
                  <td>
                    <StatusBadge status={run.status} partial={run.partial} />
                  </td>
                  <td>{displayTime(run.startedAt)}</td>
                  <td>{displayTime(run.endedAt)}</td>
                  <td>{run.startedBy}</td>
                  {["Individual", "Entity", "Opportunity"].map((type) => (
                    <td key={type} className="bspre-num">
                      <span className="bspre-sr">{labelForRecordType(type)} findings </span>
                      {findingCount(run.counts && run.counts[type])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
