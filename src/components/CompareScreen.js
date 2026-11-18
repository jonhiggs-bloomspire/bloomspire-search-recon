import { useEffect, useState } from "react";
import { navigate } from "../router";
import { siebelDetailUrl } from "../siebelDetailUrl";
import { CheckLabel, RecordTypeBadge } from "./badges";
import { ErrorNote, LoadingNote } from "./notices";

function FindingTable({ caption, findings, appBase }) {
  return (
    <table>
      <caption>
        {caption} ({findings.length})
      </caption>
      <thead>
        <tr>
          <th scope="col">Type</th>
          <th scope="col">Id</th>
          <th scope="col">Check</th>
          <th scope="col">Name</th>
        </tr>
      </thead>
      <tbody>
        {findings.length === 0 ? (
          <tr>
            <td colSpan={4}>None</td>
          </tr>
        ) : (
          findings.map((finding) => {
            const url = siebelDetailUrl(finding.recordType, finding.id, appBase);
            return (
              <tr key={`${finding.recordType}-${finding.id}-${finding.check}`}>
                <td>
                  <RecordTypeBadge recordType={finding.recordType} />
                </td>
                <td>
                  {url ? (
                    <a className="bspre-idlink" href={url}>
                      <span className="bspre-rowid">{finding.id}</span>
                      <span className="bspre-view-detail">View detail</span>
                    </a>
                  ) : (
                    finding.id
                  )}
                </td>
                <td>
                  <CheckLabel check={finding.check} />
                </td>
                <td>{finding.name || "—"}</td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

export function CompareScreen({ api, initialBaseline = "", initialCurrent = "", appBase = "" }) {
  const [runs, setRuns] = useState(null);
  const [baselineId, setBaselineId] = useState(initialBaseline);
  const [currentId, setCurrentId] = useState(initialCurrent);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    setBaselineId(initialBaseline);
    setCurrentId(initialCurrent);
  }, [initialBaseline, initialCurrent]);

  useEffect(() => {
    let cancelled = false;
    api
      .listRuns()
      .then((next) => {
        if (!cancelled) {
          setRuns(next);
          setLoadingRuns(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoadingRuns(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    if (!initialBaseline || !initialCurrent) {
      setResult(null);
      return undefined;
    }
    let cancelled = false;
    setComparing(true);
    setError("");
    api
      .compareRuns(initialBaseline, initialCurrent)
      .then((next) => {
        if (!cancelled) {
          setResult(next);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setResult(null);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setComparing(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, initialBaseline, initialCurrent]);

  const completed = (runs || []).filter((run) => run.status === "done" && !run.partial);

  function onSubmit(event) {
    event.preventDefault();
    navigate(`#/compare?baseline=${encodeURIComponent(baselineId)}&current=${encodeURIComponent(currentId)}`);
  }

  return (
    <section data-screen="compare">
      <h2>Compare runs</h2>
      <p>
        New, resolved, and still-open findings are keyed by record type, id, and check. Partial runs are
        hidden because they cannot be compared.
      </p>
      {loadingRuns ? <LoadingNote>Loading runs…</LoadingNote> : null}
      <form className="bspre-toolbar" onSubmit={onSubmit}>
        <label htmlFor="baseline-run">
          Baseline run
          <select
            id="baseline-run"
            value={baselineId}
            onChange={(event) => setBaselineId(event.target.value)}
          >
            <option value="">Select a run</option>
            {completed.map((run) => (
              <option key={run.id} value={run.id}>
                {run.id} ({run.startedAt})
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="current-run">
          Current run
          <select id="current-run" value={currentId} onChange={(event) => setCurrentId(event.target.value)}>
            <option value="">Select a run</option>
            {completed.map((run) => (
              <option key={run.id} value={run.id}>
                {run.id} ({run.startedAt})
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={!baselineId || !currentId || baselineId === currentId || comparing}>
          Compare
        </button>
      </form>
      <ErrorNote>{error}</ErrorNote>
      {comparing ? <LoadingNote>Comparing runs…</LoadingNote> : null}
      {result ? (
        <div className="bspre-compare">
          <FindingTable caption="New" findings={result.newFindings} appBase={appBase} />
          <FindingTable caption="Resolved" findings={result.resolved} appBase={appBase} />
          <FindingTable caption="Still open" findings={result.stillOpen} appBase={appBase} />
        </div>
      ) : null}
    </section>
  );
}
