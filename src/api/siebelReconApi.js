import { presentSetups } from "../setupRows";
import {
  normalizeFilters,
  normalizePage,
  normalizeRecordTypes,
  normalizeSetups,
  normalizeStartOverrides,
  normalizeTolerance,
  ReconApiError,
} from "./contract";

export const SIEBEL_SERVICE_NAME = "BSPRE Elasticsearch Recon";

export function siebelServiceUrl(baseUrl, method) {
  const root = String(baseUrl || "/siebel/v1.0").replace(/\/$/, "");
  return `${root}/service/${encodeURIComponent(SIEBEL_SERVICE_NAME)}/${encodeURIComponent(method)}`;
}

function unwrap(payload) {
  if (payload && payload.body && typeof payload.body === "object" && !Array.isArray(payload.body)) {
    return payload.body;
  }
  return payload || {};
}

function readJson(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }
  if (typeof value === "string") {
    return JSON.parse(value);
  }
  return value;
}

function asNumber(value, fallback) {
  if (value == null || value === "") {
    return fallback;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanRun(run) {
  if (!run || typeof run !== "object") {
    throw new ReconApiError("Siebel returned an unreadable run.");
  }
  const runConfig = readJson(run.runConfig, []);
  return {
    ...run,
    errorMessage: run.errorMessage || null,
    endedAt: run.endedAt || null,
    runConfig: Array.isArray(runConfig) ? presentSetups(runConfig) : [],
  };
}

export function createSiebelReconApi(config = {}, deps = {}) {
  const fetchImpl = deps.fetchImpl || globalThis.fetch;
  const baseUrl = config.siebelBaseUrl || "/siebel/v1.0";
  const username = config.siebelUsername || "";
  const password = config.siebelPassword || "";

  async function call(method, props) {
    if (typeof fetchImpl !== "function") {
      throw new ReconApiError("Siebel REST is unavailable in this browser.");
    }
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };
    if (username) {
      headers.Authorization = `Basic ${btoa(`${username}:${password}`)}`;
    }
    let response;
    try {
      response = await fetchImpl(siebelServiceUrl(baseUrl, method), {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({ body: props }),
      });
    } catch (error) {
      throw new ReconApiError(`Siebel ${method} could not be reached.`);
    }
    if (!response.ok) {
      throw new ReconApiError(`Siebel ${method} failed (${response.status}).`);
    }
    const payload = unwrap(await response.json());
    if (payload.ERROR || payload.Error) {
      throw new ReconApiError(String(payload.ERROR || payload.Error));
    }
    return payload;
  }

  async function listRuns() {
    const payload = await call("ListRuns", {});
    const runs = readJson(payload.Runs, []);
    return runs.map(cleanRun);
  }

  async function getRun(runId) {
    const payload = await call("GetRun", { RunId: runId });
    return cleanRun(readJson(payload.Run, null));
  }

  async function getSetup() {
    const payload = await call("GetSetup", {});
    const setups = readJson(payload.Setups, []);
    if (!Array.isArray(setups)) {
      throw new ReconApiError("Siebel returned an unreadable setup list.");
    }
    return {
      setups: presentSetups(setups),
      source: payload.Source === "seed" ? "seed" : "table",
    };
  }

  async function saveSetup(setups, options = {}) {
    const rows = normalizeSetups(setups, options.existingBusComps || []);
    const payload = await call("SaveSetup", { Setups: JSON.stringify(rows) });
    const saved = readJson(payload.Setups, []);
    if (!Array.isArray(saved)) {
      throw new ReconApiError("Siebel returned an unreadable setup list.");
    }
    return {
      setups: presentSetups(saved),
      source: payload.Source === "seed" ? "seed" : "table",
    };
  }

  async function startRun({ recordTypes, options, setup } = {}) {
    const types = normalizeRecordTypes(recordTypes);
    const toleranceSeconds = normalizeTolerance(options);
    const overrides = normalizeStartOverrides(setup);
    const props = { ToleranceSeconds: String(toleranceSeconds) };
    if (types.length) {
      props.RecordTypes = types.join(",");
    }
    if (overrides.length) {
      props.Setup = JSON.stringify(overrides);
    }
    const payload = await call("StartRun", props);
    return cleanRun(readJson(payload.Run, null));
  }

  async function pauseRun(runId) {
    const payload = await call("PauseRun", { RunId: runId });
    return cleanRun(readJson(payload.Run, null));
  }

  async function resumeRun(runId) {
    const payload = await call("ResumeRun", { RunId: runId });
    return cleanRun(readJson(payload.Run, null));
  }

  async function getFindings(runId, query = {}) {
    const filters = normalizeFilters(query.filters);
    const page = normalizePage(query.page);
    const payload = await call("GetFindings", {
      RunId: runId,
      RecordType: filters.recordType,
      Check: filters.check,
      IdQuery: filters.id,
      Page: String(page.page),
      PageSize: String(page.pageSize),
    });
    return {
      findings: readJson(payload.Findings, []),
      total: asNumber(payload.Total, 0),
      page: asNumber(payload.Page, page.page),
      pageSize: asNumber(payload.PageSize, page.pageSize),
    };
  }

  async function compareRuns(baselineId, currentId) {
    const payload = await call("CompareRuns", {
      BaselineId: baselineId,
      CurrentId: currentId,
    });
    const compare = readJson(payload.Compare, {});
    return {
      baselineId,
      currentId,
      newFindings: compare.newFindings || compare.new || [],
      resolved: compare.resolved || [],
      stillOpen: compare.stillOpen || [],
    };
  }

  async function exportCsv(runId, query = {}) {
    const filters = normalizeFilters(query.filters);
    const payload = await call("ExportCsv", {
      RunId: runId,
      RecordType: filters.recordType,
      Check: filters.check,
      IdQuery: filters.id,
    });
    return {
      filename: payload.Filename || `recon-${runId}.csv`,
      csv: payload.Csv || "",
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
