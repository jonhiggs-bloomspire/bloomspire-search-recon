import { sortFindings, compareFindings } from "../compareFindings";
import { findingsToCsv } from "../csv";
import { formatSiebelDateTime } from "../dates";
import { parseSiebelDateTime } from "../dates";
import { createSeedState } from "./fixtures";
import {
  normalizeFilters,
  normalizePage,
  normalizeRecordTypes,
  normalizeTolerance,
  ReconApiError,
} from "./contract";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function matches(finding, filters) {
  if (filters.recordType && finding.recordType !== filters.recordType) {
    return false;
  }
  if (filters.check && finding.check !== filters.check) {
    return false;
  }
  if (filters.id && !String(finding.id).toLowerCase().includes(filters.id.toLowerCase())) {
    return false;
  }
  return true;
}

function assertComparable(run, otherId) {
  if (!run) {
    throw new ReconApiError("Run not found.");
  }
  if (run.partial || run.status !== "done") {
    throw new ReconApiError("Partial runs cannot be compared.");
  }
  if (otherId && run.id === otherId) {
    throw new ReconApiError("Choose two different completed runs.");
  }
}

export function createMockReconApi() {
  const state = createSeedState();

  function requireRun(runId) {
    const run = state.runs.find((item) => item.id === runId);
    if (!run) {
      throw new ReconApiError("Run not found.");
    }
    return run;
  }

  async function listRuns() {
    const runs = [...state.runs].sort((a, b) => {
      const aTime = parseSiebelDateTime(a.startedAt);
      const bTime = parseSiebelDateTime(b.startedAt);
      const delta = (bTime ? bTime.getTime() : 0) - (aTime ? aTime.getTime() : 0);
      if (delta !== 0) {
        return delta;
      }
      return String(b.id).localeCompare(String(a.id));
    });
    return clone(runs);
  }

  async function getRun(runId) {
    return clone(requireRun(runId));
  }

  async function startRun({ recordTypes, options } = {}) {
    const types = normalizeRecordTypes(recordTypes);
    const toleranceSeconds = normalizeTolerance(options);
    const numbers = state.runs.map((run) => Number(String(run.id).replace("RUN-", "")));
    const next = Math.max(...numbers, 1000) + 1;
    const id = `RUN-${next}`;
    const run = {
      id,
      status: "running",
      partial: true,
      startedAt: formatSiebelDateTime(new Date()),
      endedAt: null,
      startedBy: "A. Okonkwo",
      recordTypes: types,
      toleranceSeconds,
      chunksDone: 0,
      chunksTotal: types.length * 8,
      lastCheckpoint: "",
      errorMessage: null,
      counts: {},
    };
    types.forEach((type) => {
      run.counts[type] = {
        siebel: 0,
        es: 0,
        matched: 0,
        siebelOnly: 0,
        esOnly: 0,
        stale: 0,
      };
    });
    state.runs.push(run);
    state.findings[id] = [];
    return clone(run);
  }

  async function pauseRun(runId) {
    const run = requireRun(runId);
    if (run.status !== "running") {
      throw new ReconApiError("Only a running run can be paused.");
    }
    run.status = "paused";
    run.partial = true;
    return clone(run);
  }

  async function resumeRun(runId) {
    const run = requireRun(runId);
    if (run.status !== "paused") {
      throw new ReconApiError("Only a paused run can be resumed.");
    }
    run.status = "running";
    run.partial = true;
    return clone(run);
  }

  function findingsFor(runId, filters) {
    requireRun(runId);
    const rows = state.findings[runId] || [];
    return sortFindings(rows.filter((finding) => matches(finding, filters)));
  }

  async function getFindings(runId, query = {}) {
    const filters = normalizeFilters(query.filters);
    const page = normalizePage(query.page);
    const filtered = findingsFor(runId, filters);
    const start = (page.page - 1) * page.pageSize;
    return {
      findings: clone(filtered.slice(start, start + page.pageSize)),
      total: filtered.length,
      page: page.page,
      pageSize: page.pageSize,
    };
  }

  async function compareRuns(baselineId, currentId) {
    if (baselineId === currentId) {
      throw new ReconApiError("Choose two different completed runs.");
    }
    const baseline = requireRun(baselineId);
    const current = requireRun(currentId);
    assertComparable(baseline);
    assertComparable(current);
    const result = compareFindings(state.findings[baselineId] || [], state.findings[currentId] || []);
    return {
      baselineId,
      currentId,
      newFindings: clone(result.newFindings),
      resolved: clone(result.resolved),
      stillOpen: clone(result.stillOpen),
    };
  }

  async function exportCsv(runId, query = {}) {
    const filters = normalizeFilters(query.filters);
    const rows = findingsFor(runId, filters);
    return {
      filename: `recon-${runId}.csv`,
      csv: findingsToCsv(rows),
    };
  }

  return {
    listRuns,
    getRun,
    startRun,
    pauseRun,
    resumeRun,
    getFindings,
    compareRuns,
    exportCsv,
  };
}
