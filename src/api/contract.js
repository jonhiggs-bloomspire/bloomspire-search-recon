import { isKnownRecordType, RECORD_TYPES } from "../config";

export class ReconApiError extends Error {
  constructor(message) {
    super(message);
    this.name = "ReconApiError";
  }
}

export function normalizeRecordTypes(recordTypes) {
  if (!Array.isArray(recordTypes) || recordTypes.length === 0) {
    throw new ReconApiError("Choose at least one record type.");
  }
  const selected = [];
  recordTypes.forEach((type) => {
    if (!isKnownRecordType(type)) {
      throw new ReconApiError(`Unknown record type: ${type}`);
    }
    if (!selected.includes(type)) {
      selected.push(type);
    }
  });
  return RECORD_TYPES.map((type) => type.value).filter((value) => selected.includes(value));
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
  const recordType = source.recordType || "";
  const check = source.check || "";
  if (recordType && !isKnownRecordType(recordType)) {
    throw new ReconApiError(`Unknown record type: ${recordType}`);
  }
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
