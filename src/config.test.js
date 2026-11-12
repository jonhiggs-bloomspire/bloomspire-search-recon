import {
  CHECKS,
  DEFAULT_PAGE_SIZE,
  ES_ALIAS,
  RECORD_TYPES,
  isKnownRecordType,
  labelForCheck,
  labelForRecordType,
  labelForStatus,
  readConfig,
} from "./config";

test("record types stay Individual, Entity, and Opportunity, labeled Lead", () => {
  expect(RECORD_TYPES.map((type) => type.value)).toEqual(["Individual", "Entity", "Opportunity"]);
  expect(labelForRecordType("Opportunity")).toBe("Lead");
  expect(labelForRecordType("Individual")).toBe("Individual");
  expect(isKnownRecordType("Opportunity")).toBe(true);
  expect(isKnownRecordType("Account")).toBe(false);
  expect(ES_ALIAS).toBe("bloomspire");
  expect(CHECKS.map((check) => check.value)).toEqual(["siebel_only", "es_only", "stale"]);
  expect(labelForCheck("siebel_only")).toBe("Siebel only");
  expect(labelForStatus("paused")).toBe("Paused");
});

test("readConfig defaults to the mock client and relative Siebel paths", () => {
  const previous = {
    api: process.env.BSPRE_RECON_API,
    base: process.env.BSPRE_SIEBEL_BASE_URL,
    app: process.env.BSPRE_SIEBEL_APP_BASE,
    user: process.env.BSPRE_SIEBEL_USERNAME,
  };
  delete process.env.BSPRE_RECON_API;
  delete process.env.BSPRE_SIEBEL_BASE_URL;
  delete process.env.BSPRE_SIEBEL_APP_BASE;
  delete process.env.BSPRE_SIEBEL_USERNAME;
  delete process.env.BSPRE_SIEBEL_PASSWORD;
  const config = readConfig();
  expect(config.api).toBe("mock");
  expect(config.siebelBaseUrl).toBe("/siebel/v1.0");
  expect(config.siebelAppBase).toBe("");
  expect(config.siebelUsername).toBe("");
  expect(config.siebelPassword).toBe("");
  expect(config.pageSize).toBe(DEFAULT_PAGE_SIZE);

  process.env.BSPRE_RECON_API = "siebel";
  process.env.BSPRE_SIEBEL_BASE_URL = "/siebel/v1.0";
  process.env.BSPRE_SIEBEL_USERNAME = "SADMIN";
  expect(readConfig().api).toBe("siebel");
  expect(readConfig({ pageSize: 5 }).pageSize).toBe(5);

  process.env.BSPRE_RECON_API = previous.api;
  process.env.BSPRE_SIEBEL_BASE_URL = previous.base;
  process.env.BSPRE_SIEBEL_APP_BASE = previous.app;
  process.env.BSPRE_SIEBEL_USERNAME = previous.user;
});
