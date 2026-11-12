export const ES_ALIAS = "bloomspire";

export const RECORD_TYPES = [
  { value: "Individual", label: "Individual" },
  { value: "Entity", label: "Entity" },
  { value: "Opportunity", label: "Lead" },
];

export const CHECKS = [
  { value: "siebel_only", label: "Siebel only" },
  { value: "es_only", label: "ES only" },
  { value: "stale", label: "Stale" },
];

export const RUN_STATUSES = ["running", "paused", "done", "error"];

export const DEFAULT_PAGE_SIZE = 10;

export function labelForRecordType(value) {
  const found = RECORD_TYPES.find((type) => type.value === value);
  return found ? found.label : value;
}

export function labelForCheck(value) {
  const found = CHECKS.find((check) => check.value === value);
  return found ? found.label : value;
}

export function labelForStatus(value) {
  if (!value) {
    return "";
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function isKnownRecordType(value) {
  return RECORD_TYPES.some((type) => type.value === value);
}

export function readConfig(overrides = {}) {
  // Direct process.env.X reads so webpack DefinePlugin can inline build values.
  return {
    api: process.env.BSPRE_RECON_API || "mock",
    siebelBaseUrl: process.env.BSPRE_SIEBEL_BASE_URL || "/siebel/v1.0",
    siebelAppBase: process.env.BSPRE_SIEBEL_APP_BASE || "",
    siebelUsername: process.env.BSPRE_SIEBEL_USERNAME || "",
    siebelPassword: process.env.BSPRE_SIEBEL_PASSWORD || "",
    pageSize: DEFAULT_PAGE_SIZE,
    ...overrides,
  };
}
