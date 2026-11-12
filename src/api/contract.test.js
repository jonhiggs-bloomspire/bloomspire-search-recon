import {
  normalizeFilters,
  normalizePage,
  normalizeRecordTypes,
  normalizeTolerance,
  ReconApiError,
} from "./contract";

test("normalizes record types into canonical order", () => {
  expect(normalizeRecordTypes(["Opportunity", "Individual", "Individual"])).toEqual([
    "Individual",
    "Opportunity",
  ]);
  expect(() => normalizeRecordTypes([])).toThrow(ReconApiError);
  expect(() => normalizeRecordTypes(["Account"])).toThrow(/Unknown record type/);
});

test("normalizes tolerance, filters, and pages", () => {
  expect(normalizeTolerance()).toBe(0);
  expect(normalizeTolerance({ toleranceSeconds: 60 })).toBe(60);
  expect(() => normalizeTolerance({ toleranceSeconds: 1.5 })).toThrow(/Tolerance/);
  expect(normalizeFilters({ recordType: "Entity", check: "stale", id: " ab " })).toEqual({
    recordType: "Entity",
    check: "stale",
    id: "ab",
  });
  expect(() => normalizeFilters({ check: "other" })).toThrow(/Unknown check/);
  expect(normalizePage(2)).toEqual({ page: 2, pageSize: 10 });
  expect(normalizePage({ page: "3", pageSize: "5" })).toEqual({ page: 3, pageSize: 5 });
  expect(() => normalizePage({ page: 0 })).toThrow(/Page/);
});
