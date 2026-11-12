import { useEffect, useState } from "react";
import { CHECKS, RECORD_TYPES } from "../config";
import { downloadTextFile } from "../download";
import { siebelDetailUrl } from "../siebelDetailUrl";
import { CheckLabel, RecordTypeBadge } from "./badges";
import { ErrorNote, LoadingNote } from "./notices";

function display(value) {
  return value ? value : "—";
}

export function FindingsDetail({ api, runId, pageSize = 10, appBase = "" }) {
  const [recordType, setRecordType] = useState("");
  const [check, setCheck] = useState("");
  const [idQuery, setIdQuery] = useState("");
  const [appliedId, setAppliedId] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);

  const filters = { recordType, check, id: appliedId };

  useEffect(() => {
    let cancelled = false;
    setResult(null);
    setError("");
    api
      .getFindings(runId, { filters, page: { page, pageSize } })
      .then((next) => {
        if (!cancelled) {
          setResult(next);
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
  }, [api, runId, recordType, check, appliedId, page, pageSize]);

  function applyId(event) {
    event.preventDefault();
    setPage(1);
    setAppliedId(idQuery.trim());
  }

  async function onExport() {
    setExporting(true);
    setError("");
    try {
      const file = await api.exportCsv(runId, { filters });
      downloadTextFile(file.filename, file.csv);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  const total = result ? result.total : 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <section data-screen="findings">
      <h2>Findings</h2>
      <p>
        Run {runId}. Each id opens the Siebel record. The stored record type for a lead stays Opportunity.
      </p>
      <form className="bspre-toolbar" onSubmit={applyId}>
        <label htmlFor="finding-type">
          Record type
          <select
            id="finding-type"
            value={recordType}
            onChange={(event) => {
              setPage(1);
              setRecordType(event.target.value);
            }}
          >
            <option value="">All types</option>
            {RECORD_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="finding-check">
          Check
          <select
            id="finding-check"
            value={check}
            onChange={(event) => {
              setPage(1);
              setCheck(event.target.value);
            }}
          >
            <option value="">All checks</option>
            {CHECKS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="finding-id">
          Id
          <input
            id="finding-id"
            value={idQuery}
            onChange={(event) => setIdQuery(event.target.value)}
            autoComplete="off"
          />
        </label>
        <button type="submit">Apply</button>
        <button type="button" onClick={onExport} disabled={exporting}>
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </form>
      <ErrorNote>{error}</ErrorNote>
      {result == null && !error ? <LoadingNote>Loading findings…</LoadingNote> : null}
      {result ? (
        <>
          <p role="status">
            Showing {from}–{to} of {total}
          </p>
          <table>
            <caption>Findings for {runId}</caption>
            <thead>
              <tr>
                <th scope="col">Id</th>
                <th scope="col">Type</th>
                <th scope="col">Check</th>
                <th scope="col">Siebel last updated</th>
                <th scope="col">ES last updated</th>
                <th scope="col">Name</th>
              </tr>
            </thead>
            <tbody>
              {result.findings.length === 0 ? (
                <tr>
                  <td colSpan={6}>No findings match this filter.</td>
                </tr>
              ) : (
                result.findings.map((finding) => {
                  const url = siebelDetailUrl(finding.recordType, finding.id, appBase);
                  return (
                    <tr key={`${finding.recordType}-${finding.id}-${finding.check}`}>
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
                        <RecordTypeBadge recordType={finding.recordType} />
                      </td>
                      <td>
                        <CheckLabel check={finding.check} />
                      </td>
                      <td>{display(finding.siebelLastUpdated)}</td>
                      <td>{display(finding.esLastUpdated)}</td>
                      <td>{display(finding.name)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          <div className="bspre-pager">
            <button
              type="button"
              className="bspre-button-secondary"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
            >
              Previous
            </button>
            <span>
              Page {page} of {pageCount}
            </span>
            <button
              type="button"
              className="bspre-button-secondary"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= pageCount}
            >
              Next
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
