import { sortFindings, compareFindings } from "../compareFindings";
import { findingsToCsv } from "../csv";
import { formatSiebelDateTime } from "../dates";
import { parseSiebelDateTime } from "../dates";
import { presentSetups, sortSetups } from "../setupRows";
import { builtinSetups, createSeedState, fillBuiltinSetup } from "./fixtures";
import {
  normalizeFilters,
  normalizePage,
  normalizeRecordTypes,
  normalizeSetups,
  normalizeStartOverrides,
  normalizeTolerance,
  ReconApiError,
  SETUPS_ARRAY_ERROR,
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

function byTypeSeq(a, b) {
  const seq = (Number(a.typeSeq) || 0) - (Number(b.typeSeq) || 0);
  if (seq !== 0) {
    return seq;
  }
  return String(a.recordType || "").localeCompare(String(b.recordType || ""));
}

function presentRun(run) {
  const copy = clone(run);
  copy.runConfig = presentSetups(copy.runConfig || []);
  return copy;
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

export function createMockReconApi(initialState) {
  const state = clone(initialState || createSeedState());
  if (!Array.isArray(state.setups)) {
    state.setups = builtinSetups();
    state.setupSource = state.setupSource || "seed";
  }
  if (!state.setupSource) {
    state.setupSource = "table";
  }

  function requireRun(runId) {
    const run = state.runs.find((item) => item.id === runId);
    if (!run) {
      throw new ReconApiError("Run not found.");
    }
    return run;
  }

  function typeOrderFor(run) {
    const configs = run && Array.isArray(run.runConfig) && run.runConfig.length ? run.runConfig : state.setups;
    return [...configs].sort(byTypeSeq).map((row) => row.recordType);
  }

  function activeCatalog() {
    const active = state.setups.filter((row) => row.active !== false);
    if (active.length) {
      return active;
    }
    return builtinSetups();
  }

  function selectRows(tokens) {
    const catalog = activeCatalog();
    if (!tokens.length) {
      return [...catalog].sort(byTypeSeq);
    }
    const selected = [];
    tokens.forEach((token) => {
      const matches = catalog.filter((row) => row.busComp === token || row.recordType === token);
      if (!matches.length) {
        throw new ReconApiError(`Unknown record type: ${token}`);
      }
      matches.forEach((row) => {
        if (!selected.some((item) => item.busComp === row.busComp)) {
          selected.push(row);
        }
      });
    });
    return selected.sort(byTypeSeq);
  }

  function applyOverrides(rows, overrides) {
    return rows.map((row) => {
      const override = overrides.find(
        (item) =>
          (item.busComp && item.busComp === row.busComp) || (item.recordType && item.recordType === row.recordType)
      );
      if (!override) {
        return clone(row);
      }
      const next = clone(row);
      if (Object.prototype.hasOwnProperty.call(override, "searchSpec")) {
        next.searchSpec = override.searchSpec;
      }
      if (Object.prototype.hasOwnProperty.call(override, "chunkSize")) {
        next.chunkSize = override.chunkSize;
      }
      if (Object.prototype.hasOwnProperty.call(override, "pitKeepAlive")) {
        next.pitKeepAlive = override.pitKeepAlive;
      }
      return next;
    });
  }

  async function listRuns() {
    const runs = state.runs.map(presentRun).sort((a, b) => {
      const aTime = parseSiebelDateTime(a.startedAt);
      const bTime = parseSiebelDateTime(b.startedAt);
      const delta = (bTime ? bTime.getTime() : 0) - (aTime ? aTime.getTime() : 0);
      if (delta !== 0) {
        return delta;
      }
      return String(b.id).localeCompare(String(a.id));
    });
    return runs;
  }

  async function getRun(runId) {
    return presentRun(requireRun(runId));
  }

  async function getSetup() {
    return {
      setups: presentSetups(state.setups),
      source: state.setupSource,
    };
  }

  async function saveSetup(setups) {
    if (!Array.isArray(setups) || setups.length === 0) {
      throw new ReconApiError(SETUPS_ARRAY_ERROR);
    }
    const existing =
      state.setupSource === "seed" ? [] : state.setups.map((row) => row.busComp);
    const filled = setups.map((row) => {
      const busComp = row && row.busComp != null ? String(row.busComp).trim() : "";
      if (busComp && !existing.includes(busComp)) {
        return fillBuiltinSetup(row);
      }
      return row;
    });
    const rows = normalizeSetups(filled, existing);
    if (state.setupSource === "seed") {
      state.setups = [];
    }
    rows.forEach((row) => {
      const index = state.setups.findIndex((item) => item.busComp === row.busComp);
      if (index >= 0) {
        state.setups[index] = { ...state.setups[index], ...row };
      } else {
        state.setups.push(row);
      }
    });
    state.setupSource = "table";
    state.setups = sortSetups(state.setups);
    return getSetup();
  }

  async function startRun({ recordTypes, options, setup } = {}) {
    const toleranceSeconds = normalizeTolerance(options);
    const tokens = normalizeRecordTypes(recordTypes);
    const overrides = normalizeStartOverrides(setup);
    if (state.runs.some((run) => run.status === "running" || run.status === "paused")) {
      throw new ReconApiError("A run is already running or paused.");
    }
    const selected = applyOverrides(selectRows(tokens), overrides);
    const types = selected.map((row) => row.recordType);
    const numbers = state.runs.map((run) => Number(String(run.id).replace(/\D/g, "")) || 0);
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
      runConfig: selected,
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
    return presentRun(run);
  }

  async function pauseRun(runId) {
    const run = requireRun(runId);
    if (run.status !== "running") {
      throw new ReconApiError("Only a running run can be paused.");
    }
    run.status = "paused";
    run.partial = true;
    return presentRun(run);
  }

  async function resumeRun(runId) {
    const run = requireRun(runId);
    if (run.status !== "paused") {
      throw new ReconApiError("Only a paused run can be resumed.");
    }
    run.status = "running";
    run.partial = true;
    return presentRun(run);
  }

  function findingsFor(runId, filters) {
    const run = requireRun(runId);
    const rows = state.findings[runId] || [];
    return sortFindings(
      rows.filter((finding) => matches(finding, filters)),
      typeOrderFor(run)
    );
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
    const result = compareFindings(
      state.findings[baselineId] || [],
      state.findings[currentId] || [],
      typeOrderFor(current)
    );
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
    getSetup,
    saveSetup,
    startRun,
    pauseRun,
    resumeRun,
    getFindings,
    compareRuns,
    exportCsv,
  };
}
