export class ReconApiError extends Error {
  constructor(message) {
    super(message);
    this.name = "ReconApiError";
  }
}

export const CHUNK_SIZE_ERROR = "Chunk Size must be a whole number from 1 to 5000.";
export const PIT_KEEP_ALIVE_ERROR =
  "PIT Keep Alive must be a whole number plus s, m, h, or d, for example 10m or 1h.";
export const SETUP_REQUIRED_ERROR =
  "A setup row needs recordType, busComp, busObj, intObj, esTypePath, esTypeValue, and esUpdatedPath.";
export const BUSCOMP_REQUIRED_ERROR = "Each setup row needs a busComp.";
export const SETUPS_ARRAY_ERROR = "Setups must be a JSON array of setup rows.";
export const TYPE_ORDER_ERROR = "Type order must be a whole number, zero or more.";

const PIT_PATTERN = /^\d+[smhd]$/;
const REQUIRED_ON_INSERT = ["recordType", "busObj", "intObj", "esTypePath", "esTypeValue", "esUpdatedPath"];

function blank(value) {
  return value == null || String(value).trim() === "";
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

export function normalizeRecordTypes(recordTypes) {
  if (recordTypes == null || recordTypes === "") {
    return [];
  }
  const list = Array.isArray(recordTypes) ? recordTypes : String(recordTypes).split(",");
  const selected = [];
  list.forEach((type) => {
    const value = text(type);
    if (!value || selected.includes(value)) {
      return;
    }
    selected.push(value);
  });
  return selected;
}

export function normalizeTolerance(options) {
  const raw = options && options.toleranceSeconds != null ? options.toleranceSeconds : 0;
  const tolerance = Number(raw);
  if (!Number.isInteger(tolerance) || tolerance < 0) {
    throw new ReconApiError("Tolerance must be a whole number of seconds, zero or more.");
  }
  return tolerance;
}

export function normalizeFilters(filters) {
  const source = filters || {};
  const recordType = text(source.recordType);
  const check = source.check || "";
  if (check && !["siebel_only", "es_only", "stale"].includes(check)) {
    throw new ReconApiError(`Unknown check: ${check}`);
  }
  return {
    recordType,
    check,
    id: source.id == null ? "" : String(source.id).trim(),
  };
}

export function normalizePage(page) {
  const source = typeof page === "number" ? { page } : page || {};
  const pageNumber = source.page == null || source.page === "" ? 1 : Number(source.page);
  const pageSize = source.pageSize == null || source.pageSize === "" ? 10 : Number(source.pageSize);
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new ReconApiError("Page must be a whole number starting at 1.");
  }
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new ReconApiError("Page size must be a whole number of at least 1.");
  }
  return { page: pageNumber, pageSize };
}

export function normalizeChunkSize(value) {
  if (blank(value)) {
    return 500;
  }
  const raw = text(value);
  if (!/^\d+$/.test(raw)) {
    throw new ReconApiError(CHUNK_SIZE_ERROR);
  }
  const number = Number(raw);
  if (number < 1 || number > 5000) {
    throw new ReconApiError(CHUNK_SIZE_ERROR);
  }
  return number;
}

export function normalizePitKeepAlive(value) {
  if (blank(value)) {
    return "10m";
  }
  const raw = text(value);
  if (raw.length > 10 || !PIT_PATTERN.test(raw)) {
    throw new ReconApiError(PIT_KEEP_ALIVE_ERROR);
  }
  return raw;
}

export function normalizeTypeSeq(value) {
  if (blank(value)) {
    return 0;
  }
  const raw = text(value);
  if (!/^\d+$/.test(raw)) {
    throw new ReconApiError(TYPE_ORDER_ERROR);
  }
  return Number(raw);
}

export function normalizeSearchSpec(value) {
  if (blank(value)) {
    return null;
  }
  return text(value);
}

function copyPresent(source, key, insert) {
  return insert || Object.prototype.hasOwnProperty.call(source, key);
}

export function normalizeSetupRow(row, options = {}) {
  const source = row || {};
  const insert = Boolean(options.insert);
  const busComp = text(source.busComp);
  if (!busComp) {
    throw new ReconApiError(BUSCOMP_REQUIRED_ERROR);
  }
  const next = { busComp };
  REQUIRED_ON_INSERT.forEach((key) => {
    if (!copyPresent(source, key, insert)) {
      return;
    }
    next[key] = text(source[key]);
  });
  const missing = REQUIRED_ON_INSERT.some((key) => Object.prototype.hasOwnProperty.call(next, key) && !next[key]);
  if (missing) {
    throw new ReconApiError(SETUP_REQUIRED_ERROR);
  }
  if (copyPresent(source, "active", insert)) {
    next.active = !(source.active === false || source.active === "false" || source.active === "N");
  } else if (insert) {
    next.active = true;
  }
  if (copyPresent(source, "searchSpec", insert)) {
    next.searchSpec = normalizeSearchSpec(source.searchSpec);
  } else if (insert) {
    next.searchSpec = null;
  }
  if (copyPresent(source, "chunkSize", insert)) {
    next.chunkSize = normalizeChunkSize(source.chunkSize);
  } else if (insert) {
    next.chunkSize = 500;
  }
  if (copyPresent(source, "pitKeepAlive", insert)) {
    next.pitKeepAlive = normalizePitKeepAlive(source.pitKeepAlive);
  } else if (insert) {
    next.pitKeepAlive = "10m";
  }
  if (copyPresent(source, "esIdPath", insert)) {
    next.esIdPath = text(source.esIdPath) || "_id";
  } else if (insert) {
    next.esIdPath = "_id";
  }
  if (copyPresent(source, "siebelNameFields", insert)) {
    next.siebelNameFields = text(source.siebelNameFields);
  }
  if (copyPresent(source, "esNamePaths", insert)) {
    next.esNamePaths = text(source.esNamePaths);
  }
  if (copyPresent(source, "typeSeq", insert)) {
    next.typeSeq = normalizeTypeSeq(source.typeSeq);
  } else if (insert) {
    next.typeSeq = 0;
  }
  return next;
}

export function normalizeSetups(setups, existingBusComps = []) {
  if (!Array.isArray(setups) || setups.length === 0) {
    throw new ReconApiError(SETUPS_ARRAY_ERROR);
  }
  const existing = new Set(existingBusComps || []);
  const seen = new Set();
  return setups.map((row) => {
    const busComp = text(row && row.busComp);
    if (!busComp) {
      throw new ReconApiError(BUSCOMP_REQUIRED_ERROR);
    }
    if (seen.has(busComp)) {
      throw new ReconApiError(`Setups has a duplicate busComp: ${busComp}.`);
    }
    seen.add(busComp);
    return normalizeSetupRow(row, { insert: !existing.has(busComp) });
  });
}

export function normalizeStartOverrides(setup) {
  if (setup == null || setup === "") {
    return [];
  }
  if (!Array.isArray(setup)) {
    throw new ReconApiError(SETUPS_ARRAY_ERROR);
  }
  const overrides = [];
  setup.forEach((row) => {
    const source = row || {};
    const recordType = text(source.recordType);
    const busComp = text(source.busComp);
    if (!recordType && !busComp) {
      throw new ReconApiError("Each setup override needs a recordType or busComp.");
    }
    const next = {};
    if (recordType) {
      next.recordType = recordType;
    }
    if (busComp) {
      next.busComp = busComp;
    }
    if (Object.prototype.hasOwnProperty.call(source, "searchSpec") && !blank(source.searchSpec)) {
      next.searchSpec = normalizeSearchSpec(source.searchSpec);
    }
    if (Object.prototype.hasOwnProperty.call(source, "chunkSize") && !blank(source.chunkSize)) {
      next.chunkSize = normalizeChunkSize(source.chunkSize);
    }
    if (Object.prototype.hasOwnProperty.call(source, "pitKeepAlive") && !blank(source.pitKeepAlive)) {
      next.pitKeepAlive = normalizePitKeepAlive(source.pitKeepAlive);
    }
    if ("searchSpec" in next || "chunkSize" in next || "pitKeepAlive" in next) {
      overrides.push(next);
    }
  });
  return overrides;
}
